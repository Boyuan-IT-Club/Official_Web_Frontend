import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";

import { parseSseData, sseFetch } from "./sse";

// jsdom 老环境缺 TextDecoder/TextEncoder;sseFetch 依赖它们解析 UTF-8 流。
// 这是测试环境的原语补齐,不是被测逻辑。
const globalAny: Record<string, unknown> = globalThis as unknown as Record<string, unknown>;
if (typeof globalAny.TextDecoder === "undefined") globalAny.TextDecoder = NodeTextDecoder;
if (typeof globalAny.TextEncoder === "undefined") globalAny.TextEncoder = NodeTextEncoder;

/**
 * #167 回归:流自然关闭(HTTP EOF)但无 done/error 事件时,sseFetch 必须
 * 兜底补发 done——否则前端 streaming 永不复位、输入框卡死(须点「停止」)。
 */
describe("sseFetch EOF fallback", () => {
  const token = "tok";

  /** 最小 fetch body 桩:按块吐出,读完 done=true(jsdom 无 ReadableStream)。 */
  function mockResponse(chunks: string[]): Response {
    let i = 0;
    const body = {
      getReader: () => ({
        read: async (): Promise<{ done: boolean; value?: Uint8Array }> => {
          if (i >= chunks.length) return { done: true };
          return { done: false, value: new Uint8Array(Buffer.from(chunks[i++], "utf-8")) };
        },
      }),
    };
    return { status: 200, ok: true, body } as unknown as Response;
  }

  it("末端无 done 事件时,EOF 后补发 done", async () => {
    const events: string[] = [];
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse([
        'data: {"type":"session","session_id":"s1","created":true}\n\n',
        'data: {"type":"delta","role":"assistant","content":"你好"}\n\n',
        // 没有 done 帧,直接 EOF
      ]),
    ) as jest.Mock;

    await sseFetch(
      { url: "http://x/chat", body: {}, token, signal: undefined },
      (evt) => events.push(evt.type),
    );
    expect(events).toEqual(["session", "delta", "done"]);
  });

  it("已收到 done 时,EOF 不重复补发", async () => {
    const events: string[] = [];
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse([
        'data: {"type":"delta","role":"assistant","content":"好"}\n\n',
        'data: {"type":"done","session_id":"s1"}\n\n',
      ]),
    ) as jest.Mock;

    await sseFetch(
      { url: "http://x/chat", body: {}, token, signal: undefined },
      (evt) => events.push(evt.type),
    );
    expect(events.filter((t) => t === "done")).toHaveLength(1);
  });

  it("已收到 error 时,EOF 不重复补发", async () => {
    const events: string[] = [];
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(['data: {"type":"error","code":"x","message":"boom"}\n\n']),
    ) as jest.Mock;

    await sseFetch(
      { url: "http://x/chat", body: {}, token, signal: undefined },
      (evt) => events.push(evt.type),
    );
    expect(events).toEqual(["error"]);
  });
});

describe("parseSseData", () => {
  it("非法 JSON 返回 null(静默忽略)", () => {
    expect(parseSseData(": keepalive")).toBeNull();
    expect(parseSseData("not json")).toBeNull();
  });

  it("未知 type 也返回(调用方决定忽略/兜底)", () => {
    expect(parseSseData('{"type":"custom","x":1}')).toEqual({ type: "custom", x: 1 });
  });
});
