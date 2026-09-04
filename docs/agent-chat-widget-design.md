# 客服 Agent 前端聊天浮窗设计(INF-09 #92)

> 调研日期:2026-09-04。宿主 React 18 + antd v5(极简浅色主题)、/main 布局。
> 契约依据:Agent 仓库 SSE 契约 #90(已冻结)。

## 决策(与 Zewang 确认)

1. **挂载点**:/main 布局(Layout/index.js,Content 之后)——候选人任何 /main 子页可见。
2. **UI**:antd v5 组件(FloatButton + Drawer),零新依赖;参考成熟客服 agent UI 设计。
3. **SSE 连接**:`fetch` + ReadableStream 手动解析(契约是 POST,EventSource 不支持)。
4. **token**:请求头 `Authorization: Bearer token`;401 → 清 token 跳 /login(复用 request.ts
   模式);流内 `auth_expired` → 清 token 提示重登录,session_id 续传(#94 落地)。

## UI 状态设计(对照契约 #90 事件)

| 前端状态 | 触发事件 | 视觉 |
|---|---|---|
| queued(请求已发) | — | 占位气泡 + CSS pulse 圆点 |
| tool(工具调用) | `tool` | 折叠行「正在查询面试安排…」(Spinner+文案,可展开看工具名) |
| streaming(流式) | `delta` | 文本逐段追加 + 末尾闪烁光标(caret blink) |
| complete | `done` | 光标消失,消息完成 |
| error | `error(code)` | 按 code 显示文案 + 单一恢复动作(重试/重新登录),不泛化 |
| auth_expired | `error:auth_expired` | 清 token + 提示重登录(session_id 保留可续传) |

- 消息淡入(fadeIn 0.2s)、光标 blink(CSS keyframes)。
- 候选问答是纯文本(面试安排/简历状态),第一版不渲染 markdown(不引库)。

## SSE fetch 封装

```ts
// sseFetch: POST + ReadableStream 按 \n\n 切帧,解析 data: JSON → 事件回调
// AbortController 支持停止/关闭
```

## 组件结构

- `components/AgentChat/` 
  - `AgentChatWidget.tsx` — FloatButton + Drawer 外壳(挂 /main Layout)
  - `MessageList.tsx` — 消息渲染(含状态:queued/tool/streaming/error)
  - `MessageInput.tsx` — 输入框 + 发送/停止
  - `sse.ts` — fetch+SSE 解析
  - `useAgentChat.ts` — 状态机(useReducer):session/消息/流式/错误
  - `index.scss` — 极简浅色风格(对齐 index.scss token)

## Agent 契约回顾(#90)

- `POST /api/agent/chat` body `{message, session_id}`,响应 SSE
- 事件:`session`(session_id,created) / `delta`(role,content) / `tool`(role,name) /
  `done`(session_id) / `error`(code,message)
- 首事件 session 拿 session_id;续传带原 session_id