/**
 * 长期记忆 API:查看 / 删除本人的记忆(助手跨会话记住的偏好与事实)。
 * 端点:GET {base}/memories · DELETE {base}/memories/{id} · DELETE {base}/memories
 * 只有本人入口,服务端按登录身份取 owner。401 沿用 code=http_401 约定。
 */
import { getToken } from "@/utils/token";

export interface AgentMemory {
  memory_id: string;
  content: string;
  kind: "preference" | "fact";
  updated_at: string | null;
}

export interface MemoryList {
  /** 当前身份是否开启长期记忆(候选人不开启) */
  enabled: boolean;
  items: AgentMemory[];
}

async function agentRequest(url: string, method: "GET" | "DELETE"): Promise<unknown> {
  const token = getToken();
  if (!token) {
    throw Object.assign(new Error("登录已过期"), { code: "http_401" });
  }
  const resp = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
  if (resp.status === 401) {
    throw Object.assign(new Error("登录已过期"), { code: "http_401" });
  }
  if (!resp.ok) {
    let detail = "";
    try {
      detail = (await resp.json())?.detail ?? "";
    } catch {
      // 非 JSON 响应体:只报状态码
    }
    throw new Error(detail || `请求失败(HTTP ${resp.status})`);
  }
  return resp.json();
}

export async function fetchMemories(baseUrl: string): Promise<MemoryList> {
  const data = (await agentRequest(`${baseUrl}/memories`, "GET")) as MemoryList;
  return { enabled: Boolean(data.enabled), items: data.items ?? [] };
}

export async function deleteMemory(baseUrl: string, memoryId: string): Promise<void> {
  await agentRequest(`${baseUrl}/memories/${encodeURIComponent(memoryId)}`, "DELETE");
}

export async function clearMemories(baseUrl: string): Promise<number> {
  const data = (await agentRequest(`${baseUrl}/memories`, "DELETE")) as { deleted: number };
  return data.deleted ?? 0;
}
