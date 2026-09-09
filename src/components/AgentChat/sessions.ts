/**
 * 会话管理 API(G2):用户历史会话列表 + 会话原文回看。
 * 端点(契约 #90 同源扩展):GET {base}/sessions · GET {base}/sessions/{tid}/messages
 * 401 沿用 sse.ts 约定(code=http_401),由调用方走登录过期处理。
 */
import { getToken } from "@/utils/token";

export interface AgentSession {
  thread_id: string;
  channel: string;
  subject: string | null;
  created_at: string;
  rounds: number;
  last_at: string | null;
  preview: string;
}

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
}

async function agentGet(url: string, token: string): Promise<unknown> {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 401) {
    throw Object.assign(new Error("登录已过期"), { code: "http_401" });
  }
  if (!resp.ok) {
    throw new Error(`请求失败(HTTP ${resp.status})`);
  }
  return resp.json();
}

/** 我的历史会话(活跃度倒序;含每会话轮次/最近预览)。 */
export async function fetchSessions(baseUrl: string): Promise<AgentSession[]> {
  const data = (await agentGet(
    `${baseUrl}/sessions`,
    getTokenOrThrow()
  )) as { items: AgentSession[] };
  return data.items ?? [];
}

/** 回看某个会话的原文(user/assistant 文本,工具中间态不进回看面)。 */
export async function fetchSessionMessages(
  baseUrl: string,
  threadId: string
): Promise<SessionMessage[]> {
  const data = (await agentGet(
    `${baseUrl}/sessions/${encodeURIComponent(threadId)}/messages`,
    getTokenOrThrow()
  )) as { messages: SessionMessage[] };
  return data.messages ?? [];
}

function getTokenOrThrow(): string {
  const token = getToken();
  if (!token) {
    throw Object.assign(new Error("登录已过期"), { code: "http_401" });
  }
  return token;
}
