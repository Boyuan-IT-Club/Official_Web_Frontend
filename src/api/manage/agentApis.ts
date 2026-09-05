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
