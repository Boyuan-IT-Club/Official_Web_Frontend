/**
 * SSE fetch 客户端(契约 #90):POST + ReadableStream 手动解析 SSE 帧。
 *
 * EventSource 只支持 GET,而契约是 POST /api/agent/chat → 用 fetch 流式读。
 * 按 SSE 协议按 \n\n 切帧,取 data: 行的 JSON,回调给 onEvent。
 * AbortController 支持取消(停止生成/关闭抽屉)。
 */

export type AgentEvent =
  | { type: "session"; session_id: string; created: boolean }
  | { type: "delta"; role: string; content: string }
  | { type: "tool"; role: string; name: string }
  | { type: "done"; session_id: string }
  | { type: "error"; code: string; message: string };

interface SseFetchOptions {
  url: string;
  body: unknown;
  token: string;
  signal?: AbortSignal;
}

/** 解析单个 SSE data 行成事件;格式非法/未知 type 返回 null(前端忽略)。 */
export function parseSseData(line: string): AgentEvent | null {
  try {
    const parsed = JSON.parse(line);
    if (!parsed || typeof parsed.type !== "string") return null;
    return parsed as AgentEvent;
  } catch {
    return null; // 心跳/非 JSON data 帧忽略
  }
}

/**
 * 发起 POST + SSE 流,逐事件调用 onEvent。返回直到流结束的 Promise。
 * 连接期 401(登录态失效)抛专用错误,由调用方跳登录。
 */
export async function sseFetch(
  { url, body, token, signal }: SseFetchOptions,
  onEvent: (evt: AgentEvent) => void,
): Promise<void> {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (resp.status === 401) {
    throw Object.assign(new Error("登录已过期"), { code: "http_401" });
  }
  if (!resp.ok || !resp.body) {
    throw new Error(`请求失败(HTTP ${resp.status})`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  // 增量解析:累积 buffer 直到遇到 \n\n,取完整帧处理
  const flushFrames = (buf: string, emit: (evt: AgentEvent) => void): string => {
    let rest = buf;
    let idx: number;
    while ((idx = rest.indexOf("\n\n")) !== -1) {
      const frame = rest.slice(0, idx);
      rest = rest.slice(idx + 2);
      // 帧内取 data: 行(可多行/带注释)
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const evt = parseSseData(line.slice(5).trim());
        if (evt) emit(evt);
      }
    }
    return rest;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = flushFrames(buffer, onEvent);
  }
  // 尾部残余帧
  if (buffer.trim()) flushFrames(buffer, onEvent);
}