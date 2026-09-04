/**
 * 客服 Agent 聊天状态机(契约 #90)。
 *
 * 管理:session_id(首事件建立,续传复用)、消息列表、流式增量、工具状态、错误。
 * 用 useReducer 收敛状态转移,避免 setState 竞态。
 *
 * 关键行为:
 * - 首轮 POST 不带 session_id → 服务端生成,首事件 session 带回
 * - 续传带原 session_id(断线/刷新/重登录后)
 * - delta → 追加当前 assistant 消息;tool → 当前 assistant 消息标记工具调用
 * - done → 收尾;error:auth_expired → 触发登出回调(外部清 token 跳登录)
 */
import { useCallback, useReducer, useRef, useState } from "react";
import { getToken, removeToken } from "@/utils/token";
import { sseFetch, AgentEvent } from "./sse";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string; // 文本(assistant 流式累积;user 原文)
  toolNames: string[]; // 本轮调用的工具(assistant)
  status: "complete" | "streaming" | "error" | "queued" | "stopped";
  errorCode?: string;
  errorText?: string;
}

interface State {
  sessionId: string | null;
  messages: ChatMessage[];
  streaming: boolean; // 是否正在生成(控制发送/停止按钮)
}

type Action =
  | { type: "session"; sessionId: string }
  | { type: "append_user"; content: string }
  | { type: "assistant_start" } // 添加 assistant 占位(queued)
  | { type: "delta"; content: string }
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "stopped" } // 用户主动停止(保留部分输出,标记可辨)
  | { type: "error"; code: string; message: string }

const uid = () => Math.random().toString(36).slice(2, 10);

const initialState: State = { sessionId: null, messages: [], streaming: false };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "session":
      return { ...state, sessionId: action.sessionId };
    case "append_user":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: uid(), role: "user", content: action.content, toolNames: [], status: "complete" },
        ],
      };
    case "assistant_start":
      return {
        ...state,
        streaming: true,
        messages: [
          ...state.messages,
          { id: uid(), role: "assistant", content: "", toolNames: [], status: "queued" },
        ],
      };
    case "delta": {
      const messages = state.messages.slice();
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + action.content,
          status: "streaming",
        };
      }
      return { ...state, messages };
    }
    case "tool": {
      const messages = state.messages.slice();
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant" && !last.toolNames.includes(action.name)) {
        messages[messages.length - 1] = {
          ...last,
          toolNames: [...last.toolNames, action.name],
          status: "streaming",
        };
      }
      return { ...state, messages };
    }
    case "done":
    case "stopped": {
      const messages = state.messages.slice();
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        // stopped:保留部分输出,标记为 stopped(与 complete 可辨,review P3)
        messages[messages.length - 1] = {
          ...last,
          status: action.type === "stopped" ? "stopped" : "complete",
        };
      }
      return { ...state, streaming: false, messages };
    }
    case "error": {
      const messages = state.messages.slice();
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = {
          ...last,
          status: "error",
          errorCode: action.code,
          errorText: action.message,
        };
      }
      return { ...state, streaming: false, messages };
    }
    case "reset":
      return initialState;
    default:
      return state;
  }
}

export function useAgentChat(targetUrl: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((evt: AgentEvent) => {
    switch (evt.type) {
      case "session":
        dispatch({ type: "session", sessionId: evt.session_id });
        break;
      case "delta":
        dispatch({ type: "delta", content: evt.content });
        break;
      case "tool":
        dispatch({ type: "tool", name: evt.name });
        break;
      case "done":
        dispatch({ type: "done" });
        break;
      case "error": {
        dispatch({ type: "error", code: evt.code, message: evt.message });
        if (evt.code === "auth_expired") {
          // 契约 #94:官网 JWT 过期 → 清 token,由外部跳登录;session 保留可续传
          removeToken();
          onAuthExpiredRef.current?.();
        }
        break;
      }
    }
  }, []);

  // 外部登出回调(跳转 /login 等)用 ref 存,避免闭包过期
  const onAuthExpiredRef = useRef<(() => void) | null>(null);
  const setAuthExpiredHandler = useCallback((fn: () => void) => {
    onAuthExpiredRef.current = fn;
  }, []);

  /** 发送一条消息。可带 session_id 续传;无则新会话。 */
  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || state.streaming) return;
      const token = getToken();
      if (!token) {
        dispatch({
          type: "error",
          code: "auth_expired",
          message: "登录已过期,请重新登录",
        });
        onAuthExpiredRef.current?.();
        return;
      }

      dispatch({ type: "append_user", content });
      dispatch({ type: "assistant_start" });
      const controller = new AbortController();
      abortRef.current = controller;
      setInput("");

      try {
        await sseFetch(
          {
            url: targetUrl,
            body: { message: content, session_id: state.sessionId },
            token,
            signal: controller.signal,
          },
          handleEvent,
        );
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return; // 用户主动停止
        const e = err as { code?: string; message?: string };
        if (e.code === "http_401") {
          // 连接期 401:占位先标记错误收敛 streaming,再清 token 跳登录——
          // 否则 queued 占位永久残留且流卡死无法再发(review P2)
          dispatch({
            type: "error",
            code: "auth_expired",
            message: "登录已过期,请重新登录",
          });
          removeToken();
          onAuthExpiredRef.current?.();
          return;
        }
        dispatch({
          type: "error",
          code: "backend_unavailable",
          message: e.message || "网络异常,请稍后重试",
        });
      }
    },
    [state.streaming, state.sessionId, targetUrl, handleEvent],
  );

  /** 停止当前生成(中断 fetch)。 */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    // 中断 fetch;截断的部分内容保留但标记 stopped(与 complete 可辨,review P3)
    dispatch({ type: "stopped" });
  }, []);

  return {
    messages: state.messages,
    streaming: state.streaming,
    sessionId: state.sessionId,
    input,
    setInput,
    send,
    stop,
    setAuthExpiredHandler,
    reset: () => dispatch({ type: "reset" }),
  };
}