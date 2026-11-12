import type { KbDraft, KbDraftEvidence } from "@/api/manage/kbDraftsApis";

/**
 * 草稿审核的展示逻辑:纯函数,不发请求、不渲染。
 * 字段随 Agent 版本可能增减,缺字段一律降级显示,不抛错。
 */

const KIND_LABELS: Record<string, string> = {
  alt_question: "补问法",
  new_faq: "新 FAQ",
  missing: "待补充",
};
export const kindLabel = (kind?: string | null): string =>
  kind ? KIND_LABELS[kind] ?? kind : "未知类型";

const KIND_HINTS: Record<string, string> = {
  alt_question: "给一条现有 FAQ 补一种问法,答案沿用那条 FAQ 的",
  new_faq: "一条新的 FAQ,答案里的每句话都要有官方条目的出处",
  missing: "官方条目里找不到答案,需要你来补写,写完才能批准",
};
export const kindHint = (kind?: string | null): string => (kind ? KIND_HINTS[kind] ?? "" : "");

const STATUS_LABELS: Record<string, string> = {
  pending: "待审",
  approved: "已批准",
  rejected: "已驳回",
  superseded: "已被顶替",
};
export const statusLabel = (status?: string | null): string =>
  status ? STATUS_LABELS[status] ?? status : "未知";

const VERDICT_LABELS: Record<string, string> = {
  supported: "有出处",
  unsupported: "出处撑不住",
  contradicted: "与出处矛盾",
};
export const verdictLabel = (verdict?: string | null): string =>
  verdict ? VERDICT_LABELS[verdict] ?? verdict : "";

/** 草稿列表接口的返回 → { items, total };形状不对的部分按空处理 */
export function normalizeDraftList(data: any): { items: KbDraft[]; total: number } {
  const items = Array.isArray(data?.items)
    ? (data.items as KbDraft[]).filter((d) => d && typeof d.draft_id === "number")
    : [];
  const total = typeof data?.total === "number" ? data.total : items.length;
  return { items, total };
}

export interface DraftFlag {
  key: string;
  text: string;
  /** danger = 发布前必须先处理;warn = 需要留意 */
  level: "danger" | "warn" | "info";
}

/** 列表行与详情顶部要标出来的情况 */
export function draftFlags(d: KbDraft): DraftFlag[] {
  const flags: DraftFlag[] = [];
  if (Array.isArray(d.conflict_with) && d.conflict_with.length > 0) {
    flags.push({ key: "conflict", text: "与现有条目冲突", level: "danger" });
  }
  if (d.review?.mixed_cycles === true) {
    flags.push({ key: "cycles", text: "周期待确认", level: "warn" });
  }
  if (d.review?.downgraded === true) {
    flags.push({ key: "downgraded", text: "由有答案的草稿降级", level: "info" });
  }
  if (d.review?.converted_from) {
    flags.push({ key: "converted", text: "由新 FAQ 转成", level: "info" });
  }
  return flags;
}

export interface EvidenceRow extends KbDraftEvidence {
  /** 第几句,从 1 起 */
  index: number;
  verdict: string;
  reason: string;
}

/** 把逐句出处和审核结论按句号(从 1 起)对上;对不上的句子没有结论 */
export function evidenceRows(d: KbDraft): EvidenceRow[] {
  const evidence = Array.isArray(d.evidence) ? d.evidence : [];
  const findings = Array.isArray(d.review?.findings) ? d.review!.findings! : [];
  return evidence.map((e, i) => {
    const finding = findings.find((f) => f?.index === i + 1);
    return {
      ...(e ?? {}),
      index: i + 1,
      verdict: finding?.verdict ?? "",
      reason: finding?.reason ?? "",
    };
  });
}

/** 现在能不能批准;不能时给出原因(和接口的 400 是同一回事,提前说) */
export function approveBlocker(d: KbDraft, draftAnswer: string): string | null {
  if (d.status !== "pending") return "这份草稿已经处理过了";
  if (d.kind === "missing" && !draftAnswer.trim()) {
    return "「待补充」的草稿要先写好答案并保存,才能批准";
  }
  if (d.kind === "alt_question" && d.target === null) {
    return "要补问法的那条 FAQ 已经不存在,这份草稿发布不了,只能驳回";
  }
  return null;
}

export interface ApproveOutcome {
  /** success:已发布且审计已记;warning:已发布但有后续要处理 */
  level: "success" | "warning";
  text: string;
}

/** 批准成功后的说明。审计没写进时内容已经发布,要提示联系运维补记 */
export function approveOutcome(data: any): ApproveOutcome {
  const source = data?.published_source_id ? `(条目 ${data.published_source_id})` : "";
  if (data?.audit_recorded === false) {
    return {
      level: "warning",
      text: `内容已发布到知识库${source},但这次操作的审计记录没有写进,请联系运维补记。`,
    };
  }
  return { level: "success", text: `已批准并发布到知识库${source}` };
}

/**
 * 接口出错时给人看的一句话。422(请求体没过校验)时后端信封里的 message 是空的,
 * 直接显示会是一片空白或一句英文的「status code 422」,换成一句通用的说明。
 */
export function errorText(error: any, fallback: string): string {
  if (error?.status === 422) return "请求内容不符合要求,请检查后重试";
  return error?.message || fallback;
}

export interface ActionFailure {
  /** 接口返回的原文,原样展示 */
  message: string;
  /** 知识库有没有被改动——只在契约说得明确的情况下才下结论 */
  note: string;
}

/**
 * 批准失败时给管理员的说明。接口文案本身写了知识库有没有被改动,原样展示;
 * 这里只按契约补一句处置建议,拿不准的不替接口下结论。
 */
export function approveFailure(error: any): ActionFailure {
  const message: string = errorText(error, "批准失败");
  const status = error?.status;
  if (message.includes("内容已写入知识库")) {
    return { message, note: "内容其实已经发布,只是草稿状态没更新。再点一次「批准并发布」即可,不会重复发布。" };
  }
  // 400 / 404 / 409 是 Agent 在动知识库之前就拒绝的,可以放心说没改
  if ([400, 404, 409].includes(status)) {
    return { message, note: "知识库没有被改动。" };
  }
  // 502 / 503 要看是谁说的:Agent 自己回的(嵌入端点、审计服务不可用)会在文案里写明
  // 「未发布 / 未改动」;但后端代理连不上 Agent 或读超时也是 502,那时 Agent 可能已经
  // 发布完了。所以只在文案自己这么说的时候才下结论
  if (/未发布|未改动|没有被改动/.test(message)) {
    return { message, note: "知识库没有被改动。" };
  }
  return {
    message,
    note: "这次请求没有拿到明确的结果,知识库有没有被改动不确定。请先刷新,核对这份草稿的状态和知识库里的条目,再决定要不要重试。",
  };
}
