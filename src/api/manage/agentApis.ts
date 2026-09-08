import { request } from '@/utils';

/**
 * 客服 Agent 管理面板 API(M6 #115)。
 * Backend 只做代理(/api/admin/agent/**,agent:monitor 权限,#103 决策),
 * 数据权威在 Agent 服务:运营视图 conversation_log、配置热载 agent_config。
 */

/** 运营列表行(列表投影不含 user_message/reply_summary 全文,要全文走详情) */
export interface AgentConversationRow {
  id: number;
  thread_id: string;
  user_id: number | null;
  channel: string;
  /** 列表投影:问题首 20 字 */
  user_message_head?: string;
  /** 详情:问题原文(错误行为空) */
  user_message?: string;
  /** 详情:回复摘要(非全文) */
  reply_summary?: string;
  tools?: string[];
  duration_ms?: number | null;
  error_code?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_hit_tokens?: number | null;
  cache_miss_tokens?: number | null;
  created_at?: string;
}

/** 高敏配置项回显形状:是否已配置 + 掩码末 4 位 */
export interface AgentSecretValue {
  configured: boolean;
  masked: string;
}

/** GET /admin/config:低敏键为 string 实值,高敏键为掩码对象 */
export type AgentConfig = Record<string, string | AgentSecretValue>;

/** 运营列表:支持 user_id / thread_id 过滤 + 分页(limit 上限 200,Agent 侧钳制) */
export function listAgentConversations(params: {
  user_id?: number;
  thread_id?: string;
  limit?: number;
  offset?: number;
}) {
  return request({ url: '/api/admin/agent/conversations', method: 'get', params });
}

/** 单轮详情:工具/耗时/错误码 + 可展开回复摘要 */
export function getAgentConversation(id: number) {
  return request({ url: `/api/admin/agent/conversations/${id}`, method: 'get' });
}

/** 配置回显:低敏键实值(DB 覆盖优先)+ 高敏键掩码 */
export function getAgentConfig() {
  return request({ url: '/api/admin/agent/config', method: 'get' });
}

/** 改低敏配置(白名单外键 Agent 侧 400;成功即热生效,无需重启) */
export function updateAgentConfig(payload: Record<string, string>) {
  return request({ url: '/api/admin/agent/config', method: 'put', data: payload });
}

/** ── 会话管理(G3):用户 → 会话两级视图 + 原文回看 ─────────────────────── */

export interface AgentSessionRow {
  thread_id: string;
  owner_user_id: number;
  channel: string;
  subject: string | null;
  created_at: string;
  rounds: number;
  last_at: string | null;
  preview: string;
}

export interface AgentSessionMessage {
  role: "user" | "assistant";
  content: string;
}

/** 会话列表(user_id 缺省 = 全部用户;活跃度倒序,含轮次/最近预览) */
export function listAgentSessions(params: { user_id?: number }) {
  return request({ url: '/api/admin/agent/sessions', method: 'get', params });
}

/** 会话原文(checkpointer 全文,user/assistant 文本) */
export function getAgentSessionMessages(threadId: string) {
  return request({
    url: `/api/admin/agent/sessions/${encodeURIComponent(threadId)}/messages`,
    method: 'get',
  });
}

/** ── 知识库管理(RAG #134 R6):/api/admin/agent/kb/**,kb:manage 独立权限 ── */

/** 知识条目行(列表投影;详情另有 question/answer/content_md) */
export interface KbSourceRow {
  source_id: string;
  title: string;
  type: 'faq' | 'doc';
  kind: 'normal' | 'test';
  tags: string[];
  enabled: boolean;
  updated_by: string;
  chunk_count?: number;
  question?: string;
  answer?: string;
  content_md?: string;
  created_at?: string;
  updated_at?: string;
}

/** 条目分页列表(kind=normal|test 过滤,keyword 匹配标题) */
export function listKbSources(params: {
  page?: number;
  size?: number;
  kind?: string;
  keyword?: string;
}) {
  return request({ url: '/api/admin/agent/kb/sources', method: 'get', params });
}

/** 条目详情(含内容与块数) */
export function getKbSource(sourceId: string) {
  return request({
    url: `/api/admin/agent/kb/sources/${encodeURIComponent(sourceId)}`,
    method: 'get',
  });
}

export interface KbSourcePayload {
  title: string;
  type: 'faq' | 'doc';
  kind: 'normal' | 'test';
  tags: string[];
  question?: string;
  answer?: string;
  content_md?: string;
}

/** 新建并入库(分块+embedding;EMBED 未配置时上游 503) */
export function createKbSource(payload: KbSourcePayload) {
  return request({ url: '/api/admin/agent/kb/sources', method: 'post', data: payload });
}

/** 更新并重嵌 */
export function updateKbSource(sourceId: string, payload: KbSourcePayload) {
  return request({
    url: `/api/admin/agent/kb/sources/${encodeURIComponent(sourceId)}`,
    method: 'put',
    data: payload,
  });
}

/** 启/停用(停用立即退出生检索) */
export function setKbSourceEnabled(sourceId: string, enabled: boolean) {
  return request({
    url: `/api/admin/agent/kb/sources/${encodeURIComponent(sourceId)}/enabled`,
    method: 'put',
    data: { enabled },
  });
}

/** 删除(级联 chunks) */
export function deleteKbSource(sourceId: string) {
  return request({
    url: `/api/admin/agent/kb/sources/${encodeURIComponent(sourceId)}`,
    method: 'delete',
  });
}

/** 重嵌(按已存内容重建向量;换 embedding 模型后逐条补齐) */
export function reembedKbSource(sourceId: string) {
  return request({
    url: `/api/admin/agent/kb/sources/${encodeURIComponent(sourceId)}/reembed`,
    method: 'post',
  });
}
