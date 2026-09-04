/**
 * 客服 Agent 聊天浮窗(INF-09 #92)。
 *
 * 挂在 /main Layout:FloatButton 入口 → Drawer(右侧)。契约 #90。
 * 状态:useAgentChat(useReducer 收敛)。UI:antd v5,极简浅色风格。
 *
 * 事件流(sse.ts 解析):session → (tool / delta)* → done | error(code)
 * auth_expired → 清 token 提示重登录(onAuthExpired),session 保留可续传。
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Drawer, FloatButton, Input, Spin, Typography, message } from "antd";
import { MessageOutlined, SendOutlined, StopOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ChatMessage, useAgentChat } from "./useAgentChat";
import "./index.scss";

const { Text } = Typography;
const AGENT_URL =
  process.env.REACT_APP_AGENT_URL ?? "http://127.0.0.1:8001/api/agent/chat";

const TOOL_LABEL: Record<string, string> = {
  get_my_interview: "查询面试安排",
  get_open_cycle: "查询招新周期",
};

/** 单条 assistant 消息:工具调用折叠行 + 流式/状态渲染 */
function AssistantBubble({ msg }: { msg: ChatMessage }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const streaming = msg.status === "streaming" || msg.status === "queued";

  return (
    <div className="agent-chat__bubble agent-chat__bubble--assistant">
      {msg.toolNames.length > 0 && (
        <div className="agent-chat__tools">
          <button
            className="agent-chat__tools-toggle"
            onClick={() => setToolsOpen((v) => !v)}
          >
            <Spin size="small" spinning={streaming} />
            <span>正在查询…</span>
            <span className="agent-chat__tools-count">{msg.toolNames.length}</span>
          </button>
          {toolsOpen && (
            <ul className="agent-chat__tools-list">
              {msg.toolNames.map((name) => (
                <li key={name}>⚙ {TOOL_LABEL[name] ?? name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {msg.status === "queued" && !msg.content ? (
        <div className="agent-chat__queued">
          <span className="agent-chat__dot" />
          <Text type="secondary">正在思考…</Text>
        </div>
      ) : (
        <div className="agent-chat__text">
          {msg.content}
          {streaming && <span className="agent-chat__caret" />}
          {msg.status === "stopped" && msg.content && (
            <span className="agent-chat__stopped">(已停止)</span>
          )}
        </div>
      )}
      {msg.status === "error" && (
        <div className="agent-chat__error">
          <Text type="danger">{msg.errorText || "出错了,请重试"}</Text>
        </div>
      )}
    </div>
  );
}

/** 用户消息气泡 */
function UserBubble({ msg }: { msg: ChatMessage }) {
  return <div className="agent-chat__bubble agent-chat__bubble--user">{msg.content}</div>;
}

export default function AgentChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { messages, streaming, input, setInput, send, stop, setAuthExpiredHandler } =
    useAgentChat(AGENT_URL);
  const listRef = useRef<HTMLDivElement>(null);
  const [stuckTop, setStuckTop] = useState(false); // 用户是否滚离底部

  // auth_expired → 提示 + 跳登录(session 保留;重登录后重开抽屉续传)
  const onAuthExpired = useCallback(() => {
    message.warning("登录已过期,请重新登录");
    navigate("/login", { replace: true });
  }, [navigate]);
  useEffect(() => setAuthExpiredHandler(onAuthExpired), [setAuthExpiredHandler, onAuthExpired]);

  // 自动滚底(仅当用户没滚上去)
  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setStuckTop(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (el && !stuckTop) el.scrollTop = el.scrollHeight;
  }, [messages, stuckTop]);

  const canSend = !streaming && input.trim().length > 0;
  const handleSend = () => {
    if (!streaming && input.trim()) send(input);
  };

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />}
        tooltip="招新小助手"
        onClick={() => setOpen(true)}
        style={{ right: 28, bottom: 28 }}
      />
      <Drawer
        title="招新小助手"
        placement="right"
        width={380}
        open={open}
        onClose={() => setOpen(false)}
        className="agent-chat"
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
      >
        <div className="agent-chat__list" ref={listRef} onScroll={onScroll}>
          {messages.length === 0 ? (
            <div className="agent-chat__empty">
              <MessageOutlined className="agent-chat__empty-icon" />
              <Text type="secondary">
                你好,我是招新小助手。
                <br />
                可以问我面试安排、简历状态等问题。
              </Text>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <UserBubble key={m.id} msg={m} />
              ) : (
                <AssistantBubble key={m.id} msg={m} />
              ),
            )
          )}
        </div>

        <div className="agent-chat__input">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题,如:我的面试安排"
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              // IME 组合态(拼音预选)回车不发送——nativeEvent.isComposing 守卫,
              // 否则预选词在 compositionend 前被清空,丢字/乱码(review P1)
              if (e.nativeEvent.isComposing) return;
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={streaming}
          />
          <div className="agent-chat__input-actions">
            {streaming ? (
              <Button size="small" icon={<StopOutlined />} onClick={stop}>
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                disabled={!canSend}
                onClick={handleSend}
              >
                发送
              </Button>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}