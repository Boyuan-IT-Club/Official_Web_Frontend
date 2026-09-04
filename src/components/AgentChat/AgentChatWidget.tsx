/**
 * 客服 Agent 聊天浮窗(INF-09 #92)。
 *
 * 挂在 /main Layout:入口按钮 → Drawer(右侧)。契约 #90。
 * 状态:useAgentChat(useReducer 收敛)。UI:antd v5,对齐站点主色(#1890ff 系)。
 *
 * 事件流(sse.ts 解析):session → (tool / delta)* → done | error(code)
 * auth_expired → 清 token 提示重登录(onAuthExpired),session 保留可续传。
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Drawer, Input, Spin, message } from "antd";
import {
  CustomerServiceOutlined,
  RobotOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ChatMessage, useAgentChat } from "./useAgentChat";
import "./index.scss";


const AGENT_URL =
  process.env.REACT_APP_AGENT_URL ?? "http://127.0.0.1:8001/api/agent/chat";

const TOOL_LABEL: Record<string, string> = {
  get_my_interview: "查询面试安排",
  get_open_cycle: "查询招新周期",
  search_resumes: "检索简历",
};

/** 单条 assistant 消息:机器人头像 + 工具折叠 + 流式/状态渲染 */
function AssistantBubble({ msg }: { msg: ChatMessage }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const streaming = msg.status === "streaming" || msg.status === "queued";

  return (
    <div className="agent-chat__row">
      <span className="agent-chat__avatar">
        <RobotOutlined />
      </span>
      <div className="agent-chat__bubble agent-chat__bubble--assistant">
        {msg.toolNames.length > 0 && (
          <div className="agent-chat__tools">
            <button
              className="agent-chat__tools-toggle"
              onClick={() => setToolsOpen((v) => !v)}
            >
              <Spin size="small" spinning={streaming} />
              <span>{streaming ? "正在处理…" : "已调用工具"}</span>
              <span className="agent-chat__tools-count">{msg.toolNames.length}</span>
            </button>
            {toolsOpen && (
              <ul className="agent-chat__tools-list">
                {msg.toolNames.map((name) => (
                  <li key={name}>
                    <span className="agent-chat__tools-dot" />
                    {TOOL_LABEL[name] ?? name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {msg.status === "queued" && !msg.content ? (
          <div className="agent-chat__queued">
            <span className="agent-chat__dot" />
            <span>正在思考…</span>
          </div>
        ) : msg.content ? (
          <div className="agent-chat__text">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
            {streaming && <span className="agent-chat__caret" />}
            {msg.status === "stopped" && (
              <span className="agent-chat__stopped">(已停止)</span>
            )}
          </div>
        ) : null}

        {msg.status === "error" && (
          <div className="agent-chat__error">{msg.errorText || "出错了,请重试"}</div>
        )}
      </div>
    </div>
  );
}

/** 用户消息气泡 */
function UserBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="agent-chat__row agent-chat__row--user">
      <div className="agent-chat__bubble agent-chat__bubble--user">{msg.content}</div>
    </div>
  );
}

export default function AgentChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
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
      {/* 入口:大号品牌按钮,呼吸光晕提示可点;悬停展开「招新小助手」标签 */}
      <div
        className={`agent-chat agent-chat__launcher${hover ? " agent-chat__launcher--hover" : ""}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {hover && <span className="agent-chat__launcher-label">招新小助手</span>}
        <button
          type="button"
          className="agent-chat__launcher-btn"
          onClick={() => setOpen(true)}
          aria-label="打开招新小助手"
        >
          <CustomerServiceOutlined />
        </button>
      </div>

      <Drawer
        title={
          <div className="agent-chat__header">
            <span className="agent-chat__header-avatar">
              <RobotOutlined />
            </span>
            <div className="agent-chat__header-text">
              <span className="agent-chat__header-title">招新小助手</span>
              <span className="agent-chat__header-sub">
                <span className="agent-chat__header-dot" />
                在线 · 可查面试安排 / 简历状态
              </span>
            </div>
          </div>
        }
        placement="right"
        width={390}
        open={open}
        onClose={() => setOpen(false)}
        className="agent-chat"
        closable
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
      >
        <div className="agent-chat__list" ref={listRef} onScroll={onScroll}>
          {messages.length === 0 ? (
            <div className="agent-chat__empty">
              <span className="agent-chat__empty-icon">
                <RobotOutlined />
              </span>
              <p className="agent-chat__empty-title">你好,我是招新小助手</p>
              <p className="agent-chat__empty-sub">
                可以问我面试安排、简历状态等。
                <br />
                试试:「我的面试安排」
              </p>
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
            placeholder="输入你的问题…"
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              // IME 组合态(拼音预选)回车不发送——nativeEvent.isComposing 守卫
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
                停止生成
              </Button>
            ) : (
              <Button
                type="primary"
                shape="round"
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