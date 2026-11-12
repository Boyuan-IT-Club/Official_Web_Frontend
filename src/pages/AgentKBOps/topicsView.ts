import type { KbOpsRun, KbOpsTopic } from "@/api/manage/kbOpsApis";

/**
 * 主题清单的展示逻辑:纯函数,不发请求、不渲染。
 * 字段随 Agent 版本可能增减,缺字段一律降级显示,不抛错。
 */

const SCOPE_LABELS: Record<string, string> = {
  official_knowledge: "官方知识",
  personal_data: "个人数据",
  out_of_scope: "超出范围",
  chitchat: "闲聊",
};

/** 归类的中文名;没归类的显示「未归类」,不认识的原样显示 */
export const scopeLabel = (scope?: string | null): string =>
  scope ? SCOPE_LABELS[scope] ?? scope : "未归类";

const TRIAGE_LABELS: Record<string, string> = {
  failed: "甄别失败",
  unsafe_samples: "样本疑似指令",
  out_of_budget: "预算用完,未甄别",
  not_selected: "未进甄别名额",
};

/** 没甄别成的原因;已甄别(done)或没给状态时为空串 */
export const triageLabel = (status?: string | null): string =>
  !status || status === "done" ? "" : TRIAGE_LABELS[status] ?? status;

const GAP_HINT_LABELS: Record<string, string> = { wording: "补问法", missing: "补条目" };

export const gapHintLabel = (hint?: string | null): string =>
  hint ? GAP_HINT_LABELS[hint] ?? hint : "";

const DRAFT_STATUS_LABELS: Record<string, string> = {
  drafted: "有草稿待审",
  auto_rejected: "草稿被自动驳回",
  failed: "起草失败",
  out_of_budget: "预算用完,未起草",
  duplicate: "与已有问法重复",
};

export const draftStatusLabel = (status?: string | null): string =>
  status ? DRAFT_STATUS_LABELS[status] ?? status : "";

const RUN_STATUS_LABELS: Record<string, string> = {
  running: "进行中",
  succeeded: "成功",
  failed: "失败",
};

export const runStatusLabel = (status?: string | null): string =>
  status ? RUN_STATUS_LABELS[status] ?? status : "未知";

/**
 * 主题的标题。没甄别成的主题没有模型写的名字,用第一条样本提问顶上;
 * 样本也没有(所在会话都已删除)时只能给个序号。
 */
export function topicTitle(t: KbOpsTopic): string {
  if (t.topic) return t.topic;
  const sample = Array.isArray(t.samples) ? t.samples[0]?.query : undefined;
  return sample || `第 ${t.rank} 个主题(样本已不可查)`;
}

/** 主题清单接口的返回 → { run, items };形状不对的部分按空处理 */
export function normalizeTopics(data: any): { run: KbOpsRun | null; items: KbOpsTopic[] } {
  const run = data?.run && typeof data.run === "object" ? (data.run as KbOpsRun) : null;
  const items = Array.isArray(data?.items)
    ? (data.items as KbOpsTopic[]).filter((t) => t && typeof t === "object")
    : [];
  return { run, items };
}

/** 运行列表接口的返回 → 运行数组 */
export function normalizeRuns(data: any): KbOpsRun[] {
  return Array.isArray(data?.items)
    ? (data.items as KbOpsRun[]).filter((r) => r && typeof r.run_id === "string")
    : [];
}

/**
 * 「个人数据」类的主题不是知识库缺口——问的是「我的面试在几点」这类要查本人数据的事,
 * 补条目解决不了,得有工具能查。和真正的缺口分开列,免得有人照着去写 FAQ。
 */
export function splitByNature(items: KbOpsTopic[]): { gaps: KbOpsTopic[]; personal: KbOpsTopic[] } {
  return {
    gaps: items.filter((t) => t.scope !== "personal_data"),
    personal: items.filter((t) => t.scope === "personal_data"),
  };
}

export interface StatItem {
  label: string;
  value: string;
  hint?: string;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const percent = (part: number, total: number): string =>
  total > 0 ? `${Math.round((part / total) * 1000) / 10}%` : "—";

/** 运行统计里认识的几项;缺哪项就不出哪项,不补 0 */
export function summarizeStats(stats: KbOpsRun["stats"]): StatItem[] {
  if (!stats || typeof stats !== "object") return [];
  const out: StatItem[] = [];
  const w = stats.window;
  if (w && isNumber(w.total)) {
    out.push({ label: "检索总数", value: String(w.total), hint: "时间窗内对话里查知识库的次数" });
    if (isNumber(w.not_found)) {
      out.push({
        label: "未命中",
        value: `${w.not_found}(${percent(w.not_found, w.total)})`,
        hint: "没查到答案的检索",
      });
    }
    if (isNumber(w.near_miss)) {
      out.push({
        label: "差一点命中",
        value: `${w.near_miss}(${percent(w.near_miss, w.total)})`,
        hint: "相似度接近门槛但没过,多半是问法没覆盖到",
      });
    }
    if (isNumber(w.unavailable) && w.unavailable > 0) {
      out.push({ label: "检索不可用", value: String(w.unavailable), hint: "嵌入端点或库故障" });
    }
  }
  if (isNumber(stats.topics)) {
    out.push({ label: "进入清单的主题", value: String(stats.topics) });
  }
  if (isNumber(stats.below_support)) {
    out.push({
      label: "问的人太少、没进清单",
      value: String(stats.below_support),
      hint: "这个数偏大可能是聚类阈值定得太高",
    });
  }
  return out;
}

/** 运行需要提醒管理员的情况(预算用完、日志被截断等);没有就是空数组 */
export function runWarnings(run: KbOpsRun | null | undefined): string[] {
  const stats = run?.stats;
  if (!stats || typeof stats !== "object") return [];
  const out: string[] = [];
  if (stats.budget_exhausted === true) {
    out.push("这次分析的时间预算用完了,排在后面的主题没有甄别。");
  }
  if (stats.queries_truncated === true) {
    out.push("时间窗内未命中的提问太多,只分析了其中一部分。");
  }
  return out;
}
