import type { ReportResponse, ReportVersionRow } from "@/api/manage/retrospectiveApis";

/**
 * 复盘报告的展示逻辑:纯函数,不发请求、不渲染。
 * 字段随 Agent 版本可能增减,缺字段一律降级显示,不抛错。
 */

const STATUS_LABELS: Record<string, string> = {
  generating: "生成中",
  draft: "草稿",
  failed: "生成失败",
  published: "已发布",
  superseded: "已被取代",
};
const STATUS_COLORS: Record<string, string | undefined> = {
  generating: "processing",
  draft: "warning",
  failed: "error",
  published: "success",
  superseded: undefined,
};

export const reportStatusLabel = (status?: string | null): string =>
  status ? STATUS_LABELS[status] ?? status : "未知";
export const reportStatusColor = (status?: string | null): string | undefined =>
  status ? STATUS_COLORS[status] : undefined;

/** 报告版本列表接口的返回 → 版本数组;形状不对按空处理 */
export function normalizeReportList(data: any): ReportVersionRow[] {
  return Array.isArray(data?.items)
    ? (data.items as ReportVersionRow[]).filter((r) => r && typeof r.version === "number")
    : [];
}

/**
 * 接口出错时给人看的一句话。422 有两种:文字没过 Agent 的闸门(detail 是给人看的原因,
 * 会原样带过来),或请求体没过校验(那时后端信封里的 message 是空的,axios 只剩一句英文的
 * 「status code 422」)。后一种换成一句通用说明,别显示空白或英文状态码。
 */
export function errorText(error: any, fallback: string): string {
  const message: string = typeof error?.message === "string" ? error.message.trim() : "";
  if (error?.status === 422 && (!message || /status code 422/i.test(message))) {
    return "请求内容不符合要求,请检查后重试";
  }
  return message || fallback;
}

export interface ReportNote {
  key: string;
  level: "warning" | "info";
  text: string;
}

/**
 * 这一版报告在审阅时要先知道的情况:撰稿人没有产出、哪几节的分析员没有产出或没有数据。
 * 正文本身不会说这些,不提示的话读的人会以为那几节「没什么可说的」。
 */
export function reportNotes(report: ReportResponse | null | undefined): ReportNote[] {
  const body = report?.sections;
  if (!body || typeof body !== "object") return [];
  const notes: ReportNote[] = [];
  if (body.writer_status === "failed") {
    notes.push({
      key: "writer",
      level: "warning",
      text: "撰稿人这次没有产出:下面各节直接列出分析员的发现,没有经过汇总。",
    });
  } else if (body.writer_status === "skipped") {
    notes.push({ key: "writer", level: "info", text: "这一版没有任何发现可写,所以没有汇总。" });
  }
  (Array.isArray(body.sections) ? body.sections : []).forEach((s, i) => {
    const title = s?.title || s?.role || `第 ${i + 1} 节`;
    if (s?.status === "analyst_failed") {
      notes.push({
        key: `section-${i}`,
        level: "warning",
        text: `「${title}」这一节的分析员没有产出,这一节只有指标、没有解读。`,
      });
    } else if (s?.status === "no_data") {
      notes.push({ key: `section-${i}`, level: "warning", text: `「${title}」这一节的数据不可用。` });
    }
  });
  return notes;
}

export interface UnverifiedRow {
  where: string;
  text: string;
  reason: string;
}

/** 没有进入报告的内容(被数字落地守卫删掉的句子等)。审阅的人要看得到,不能悄悄藏起来 */
export function unverifiedRows(report: ReportResponse | null | undefined): UnverifiedRow[] {
  return (Array.isArray(report?.unverified) ? report!.unverified! : [])
    .filter((u) => u && typeof u === "object")
    .map((u) => ({ where: u.where ?? "", text: u.text ?? "", reason: u.reason ?? "" }));
}

export interface RunFailure {
  /** disabled = 功能没有开启(不是故障);busy = 已有一份在生成;其余按出错展示 */
  kind: "disabled" | "busy" | "error";
  message: string;
}

/** 触发生成失败时怎么说。503 是「报告生成没有开启」,要显示成功能未开放,不是出错 */
export function runFailure(error: any): RunFailure {
  const message = errorText(error, "启动报告生成失败");
  if (error?.status === 503) return { kind: "disabled", message };
  if (error?.status === 409) return { kind: "busy", message };
  return { kind: "error", message };
}

/** 发布失败的补充说明:契约说得明确的才下结论 */
export function publishFailureNote(error: any): string {
  if (error?.status === 503) return "报告没有发布,可以稍后重试。";
  if (error?.status === 409) return "这一版现在不是草稿(可能还在生成、已发布或已被取代),请刷新后再看。";
  if (error?.status === 404) return "没有找到这个版本,请刷新版本列表。";
  return "请刷新后核对这一版的状态。";
}
