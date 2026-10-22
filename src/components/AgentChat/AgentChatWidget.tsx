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
import { Button, Drawer, Input, List, Popconfirm, Spin, Tag, message } from "antd";
import {
  BulbOutlined,
  CheckOutlined,
  DeleteOutlined,
  CloseOutlined,
  CustomerServiceOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import MarkdownContent from "./Markdown";
import {
  AgentSession,
  fetchSessionMessages,
  fetchSessions,
} from "./sessions";
import { AgentMemory, clearMemories, deleteMemory, fetchMemories } from "./memories";
import { ChatMessage, PendingConfirm, useAgentChat } from "./useAgentChat";
import "./index.scss";


const AGENT_URL =
  process.env.REACT_APP_AGENT_URL ?? "http://127.0.0.1:8001/api/agent/chat";
const AGENT_BASE = AGENT_URL.replace(/\/chat$/, "");

const TOOL_LABEL: Record<string, string> = {
  get_my_interview: "查询面试安排",
  get_open_cycle: "查询招新周期",
  search_resumes: "检索简历",
  get_resume_detail: "查看简历详情",
  find_available_sessions: "查询可用场次",
  list_unassigned: "查询待调剂名单",
  list_reschedule_requests: "查询改期申请",
  get_recruit_statistics: "统计招新数据",
  search_knowledge: "查询社团知识库",
  assign_interview: "分配面试场次",
  handle_reschedule: "处理改期申请",
};

const CONFIRM_STATE_TEXT: Record<PendingConfirm["state"], string> = {
  pending: "",
  approved: "已确认执行",
  rejected: "已取消",
  cancelled: "未确认,已取消",
  expired: "已过期",
};

/** 写操作确认卡片:操作摘要 + 确认/取消。只有等待中的卡片可以点。 */
function ConfirmCard({
  confirm,
  disabled,
  onRespond,
}: {
  confirm: PendingConfirm;
  disabled: boolean;
  onRespond: (decision: "approve" | "reject") => void;
}) {
  const pending = confirm.state === "pending";
  return (
    <div className={`agent-chat__confirm${pending ? "" : " is-settled"}`}>
      <div className="agent-chat__confirm-title">
        <ExclamationCircleOutlined />
        <span>需要你确认的操作</span>
      </div>
      <div className="agent-chat__confirm-summary">{confirm.summary}</div>
      {pending ? (
        <div className="agent-chat__confirm-actions">
          <Button size="small" icon={<CloseOutlined />} disabled={disabled} onClick={() => onRespond("reject")}>
            取消
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            disabled={disabled}
            onClick={() => onRespond("approve")}
          >
            确认执行
          </Button>
        </div>
      ) : (
        <div className="agent-chat__confirm-state">{CONFIRM_STATE_TEXT[confirm.state]}</div>
      )}
    </div>
  );
}

/** 单条 assistant 消息:机器人头像 + 工具折叠 + 流式/状态渲染 */
function AssistantBubble({
  msg,
  busy,
  onRespond,
}: {
  msg: ChatMessage;
  busy: boolean;
  onRespond: (decision: "approve" | "reject") => void;
}) {
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
            <MarkdownContent content={msg.content} />
            {streaming && <span className="agent-chat__caret" />}
            {msg.status === "stopped" && (
              <span className="agent-chat__stopped">(已停止)</span>
            )}
          </div>
        ) : null}

        {msg.confirm && <ConfirmCard confirm={msg.confirm} disabled={busy} onRespond={onRespond} />}

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
  const {
    messages,
    streaming,
    sessionId,
    input,
    setInput,
    send,
    respond,
    stop,
    adoptSession,
    setAuthExpiredHandler,
    reset,
  } = useAgentChat(AGENT_URL);
  const listRef = useRef<HTMLDivElement>(null);
  const [stuckTop, setStuckTop] = useState(false); // 用户是否滚离底部

  // G2:历史会话视图状态;memory:长期记忆管理视图
  const [view, setView] = useState<"chat" | "history" | "memory">("chat");
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [adopting, setAdopting] = useState(false);

  // auth_expired → 提示 + 跳登录(session 保留可续传)
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

  /** 打开历史会话列表(G2):拉本人会话(活跃度倒序)。 */
  const openHistory = useCallback(async () => {
    setView("history");
    setSessionsLoading(true);
    try {
      setSessions(await fetchSessions(AGENT_BASE));
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "http_401") {
        onAuthExpired();
        return;
      }
      message.error((err as Error).message || "加载历史会话失败");
    } finally {
      setSessionsLoading(false);
    }
  }, [onAuthExpired]);

  /** 回看某会话:拉原文并装载(此后发送自动续传该会话)。 */
  const adoptFromHistory = useCallback(
    async (s: AgentSession) => {
      setAdopting(true);
      try {
        const msgs = await fetchSessionMessages(AGENT_BASE, s.thread_id);
        const chatMsgs: ChatMessage[] = msgs.map((m, i) => ({
          id: `h${i}`,
          role: m.role,
          content: m.content,
          toolNames: [],
          status: "complete" as const,
        }));
        adoptSession(s.thread_id, chatMsgs);
        setView("chat");
        if (!msgs.length) message.info("该会话暂无内容");
      } catch (err: unknown) {
        if ((err as { code?: string }).code === "http_401") {
          onAuthExpired();
          return;
        }
        message.error((err as Error).message || "加载会话原文失败");
      } finally {
        setAdopting(false);
      }
    },
    [adoptSession, onAuthExpired]
  );

  /** 打开长期记忆视图:列出助手记住的本人偏好与事实。 */
  const openMemories = useCallback(async () => {
    setView("memory");
    setMemoriesLoading(true);
    try {
      const data = await fetchMemories(AGENT_BASE);
      setMemories(data.items);
      setMemoryEnabled(data.enabled);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "http_401") {
        onAuthExpired();
        return;
      }
      message.error((err as Error).message || "加载记忆失败");
    } finally {
      setMemoriesLoading(false);
    }
  }, [onAuthExpired]);

  const removeMemory = useCallback(async (memoryId: string) => {
    try {
      await deleteMemory(AGENT_BASE, memoryId);
      setMemories((items) => items.filter((m) => m.memory_id !== memoryId));
    } catch (err: unknown) {
      message.error((err as Error).message || "删除失败");
    }
  }, []);

  const removeAllMemories = useCallback(async () => {
    try {
      await clearMemories(AGENT_BASE);
      setMemories([]);
      message.success("已清空记忆");
    } catch (err: unknown) {
      message.error((err as Error).message || "清空失败");
    }
  }, []);

  /** 新建会话(G1):清空本地状态;下次发送不带 session_id → 服务端开新会话。 */
  const startNewSession = useCallback(() => {
    reset();
    setView("chat");
  }, [reset]);

  const drawerTitle = (
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
      <span className="agent-chat__header-actions">
        <button
          type="button"
          className={`agent-chat__header-action${view === "history" ? " is-active" : ""}`}
          onClick={() => (view === "history" ? setView("chat") : openHistory())}
          aria-label="历史会话"
          title="历史会话"
        >
          <HistoryOutlined />
        </button>
        <button
          type="button"
          className={`agent-chat__header-action${view === "memory" ? " is-active" : ""}`}
          onClick={() => (view === "memory" ? setView("chat") : openMemories())}
          aria-label="我的记忆"
          title="我的记忆"
        >
          <BulbOutlined />
        </button>
        <button
          type="button"
          className="agent-chat__header-action"
          onClick={startNewSession}
          aria-label="新建会话"
          title="新建会话"
        >
          <PlusOutlined />
        </button>
      </span>
    </div>
  );

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
        title={drawerTitle}
        placement="right"
        width={390}
        open={open}
        onClose={() => setOpen(false)}
        className="agent-chat"
        closable
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
      >
        {view === "memory" ? (
          <div className="agent-chat__history agent-chat__memory">
            {memoriesLoading ? (
              <div className="agent-chat__history-loading">
                <Spin />
              </div>
            ) : !memoryEnabled ? (
              <div className="agent-chat__empty">
                <span className="agent-chat__empty-icon">
                  <BulbOutlined />
                </span>
                <p className="agent-chat__empty-title">当前身份未开启长期记忆</p>
              </div>
            ) : memories.length === 0 ? (
              <div className="agent-chat__empty">
                <span className="agent-chat__empty-icon">
                  <BulbOutlined />
                </span>
                <p className="agent-chat__empty-title">还没有记住什么</p>
                <p className="agent-chat__empty-sub">
                  聊天时提到的偏好(如「回答先给结论」)和工作信息,
                  <br />
                  助手会记下来,下次对话直接用上
                </p>
              </div>
            ) : (
              <>
                <p className="agent-chat__memory-tip">
                  助手从你以前的对话里记住了这些,只在回答你时参考;不准确可以删掉。
                </p>
                <List
                  dataSource={memories}
                  renderItem={(m) => (
                    <List.Item
                      className="agent-chat__memory-item"
                      actions={[
                        <Button
                          key="del"
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          aria-label="删除这条记忆"
                          onClick={() => removeMemory(m.memory_id)}
                        />,
                      ]}
                    >
                      <span>
                        <Tag color={m.kind === "preference" ? "blue" : "default"}>
                          {m.kind === "preference" ? "偏好" : "事实"}
                        </Tag>
                        {m.content}
                      </span>
                    </List.Item>
                  )}
                />
                <div className="agent-chat__memory-actions">
                  <Popconfirm title="清空全部记忆?" okText="清空" cancelText="取消" onConfirm={removeAllMemories}>
                    <Button size="small" danger>
                      清空全部
                    </Button>
                  </Popconfirm>
                </div>
              </>
            )}
          </div>
        ) : view === "history" ? (
          <div className="agent-chat__history">
            {sessionsLoading ? (
              <div className="agent-chat__history-loading">
                <Spin />
              </div>
            ) : sessions.length === 0 ? (
              <div className="agent-chat__empty">
                <span className="agent-chat__empty-icon">
                  <HistoryOutlined />
                </span>
                <p className="agent-chat__empty-title">还没有历史会话</p>
                <p className="agent-chat__empty-sub">
                  点右上角 + 开始第一次对话吧
                </p>
              </div>
            ) : (
              <List
                dataSource={sessions}
                renderItem={(s) => (
                  <List.Item
                    className="agent-chat__session"
                    onClick={() => adoptFromHistory(s)}
                  >
                    <List.Item.Meta
                      title={
                        <span className="agent-chat__session-title">
                          {s.preview || s.subject || "未命名会话"}
                        </span>
                      }
                      description={
                        <span className="agent-chat__session-meta">
                          {s.last_at
                            ? dayjs(s.last_at).format("MM-DD HH:mm")
                            : dayjs(s.created_at).format("MM-DD")}
                          <span> · {s.rounds} 轮</span>
                        </span>
                      }
                    />
                    {s.thread_id === sessionId && (
                      <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                        当前
                      </Tag>
                    )}
                  </List.Item>
                )}
              />
            )}
            {adopting && (
              <Spin style={{ display: "block", margin: "16px auto" }} />
            )}
          </div>
        ) : (
          <>
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
                    <AssistantBubble key={m.id} msg={m} busy={streaming} onRespond={respond} />
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
          </>
        )}
      </Drawer>
    </>
  );
}