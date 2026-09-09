// 评价舞台的纯逻辑：本场时间表排序、「正在面试」推定、状态标签、总览聚合。
import type { CandidateSummary, EvaluationDimension } from '@/api/manage/interviewEvaluation';

export interface StageRow {
  scheduleId: number;
  candidateName?: string;
  interviewTime?: string;
  sessionId?: number;
}

/** 同场次的行按面试时间升序（无时间垫底） */
export function sortSessionRows<T extends StageRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.interviewTime ?? '9999') < (b.interviewTime ?? '9999') ? -1 : 1);
}

/**
 * 推定「正在面试」的人：时间已到、且是最近一个到时间的。
 * 没有单人时长数据，用「下一位的开始时间」当边界；最后一位面完 60 分钟后不再标。
 */
export function currentScheduleId(rowsSorted: StageRow[], now: Date): number | null {
  const ts = rowsSorted
    .filter((r) => r.interviewTime)
    .map((r) => ({ id: r.scheduleId, t: new Date(String(r.interviewTime)).getTime() }));
  if (ts.length === 0) return null;
  const nowMs = now.getTime();
  let cur: { id: number; t: number } | null = null;
  for (const item of ts) {
    if (item.t <= nowMs) cur = item;
  }
  if (!cur) return null;
  const next = ts.find((x) => x.t > cur!.t);
  const boundary = next ? next.t : cur.t + 60 * 60 * 1000;
  return nowMs < boundary ? cur.id : null;
}

export type ChipStatus = { tag: string; tone: 'good' | 'now' | 'warn' | 'muted' };

/** 胶片条状态字：已评完 > 正在面试 > 面完未评（警示）> 待面试 */
export function chipStatus(args: {
  submitted: boolean; hasScores: boolean; isCurrent: boolean; timePassed: boolean;
}): ChipStatus {
  if (args.submitted) return { tag: '✓ 已评完', tone: 'good' };
  if (args.isCurrent) return { tag: '● 正在面试', tone: 'now' };
  if (args.timePassed && !args.hasScores) return { tag: '⚠ 面完未评', tone: 'warn' };
  if (args.hasScores) return { tag: '评价进行中', tone: 'now' };
  return { tag: '待面试', tone: 'muted' };
}

// ── 评价总览聚合 ──
export interface OverviewRoster {
  scheduleId: number; name?: string; username?: string;
  interviewTime?: string; sessionId?: number; deptName?: string;
}

export interface EvalOverviewData {
  finalized: number;
  inProgress: number;
  /** 面完未评（时间已过且无任何分）——点名名单 */
  missing: Array<{ scheduleId: number; name: string; interviewTime?: string }>;
  notStarted: number;
  perSession: Array<{ label: string; done: number; inProgress: number; total: number }>;
  dimAverages: Array<{ name: string; avg: number; maxScore: number }>;
  /** 加权总分直方图（5 桶，min~max 均分） */
  histogram: { bins: number[]; labels: string[] };
}

export function aggregateOverview(
  roster: OverviewRoster[],
  summaries: CandidateSummary[],
  dimensions: EvaluationDimension[],
  now: Date,
): EvalOverviewData {
  const byId = new Map<number, CandidateSummary>();
  summaries.forEach((c) => byId.set(c.scheduleId, c));
  const nowMs = now.getTime();

  let finalized = 0; let inProgress = 0; let notStarted = 0;
  const missing: EvalOverviewData['missing'] = [];
  const sessions = new Map<string, { done: number; inProgress: number; total: number }>();

  roster.forEach((r) => {
    const ev = byId.get(r.scheduleId);
    const hasScores = !!ev && Object.keys(ev.scores ?? {}).length > 0;
    const submitted = ev?.status === 2;
    const timePassed = !!r.interviewTime && new Date(String(r.interviewTime)).getTime() < nowMs;
    const label = r.sessionId != null ? `场次 #${r.sessionId}${r.deptName ? ` · ${r.deptName}` : ''}` : '线上单约';
    const s = sessions.get(label) ?? { done: 0, inProgress: 0, total: 0 };
    s.total += 1;
    if (submitted) { finalized += 1; s.done += 1; }
    else if (hasScores) { inProgress += 1; s.inProgress += 1; }
    else if (timePassed) missing.push({ scheduleId: r.scheduleId, name: r.name ?? `#${r.scheduleId}`, interviewTime: r.interviewTime });
    else notStarted += 1;
    sessions.set(label, s);
  });

  const withScores = summaries.filter((c) => Object.keys(c.scores ?? {}).length > 0);
  const dimAverages = dimensions.map((d) => {
    const vals = withScores.map((c) => c.scores?.[d.dimensionId]).filter((v): v is number => v != null);
    return { name: d.name, maxScore: d.maxScore, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
  });

  const totals = withScores.map((c) => c.totalScore).filter((v): v is number => v != null);
  const bins = [0, 0, 0, 0, 0];
  let labels: string[] = [];
  if (totals.length > 0) {
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const span = Math.max(1e-6, max - min);
    totals.forEach((t) => { bins[Math.min(4, Math.floor(((t - min) / span) * 5))] += 1; });
    labels = Array.from({ length: 5 }, (_, i) => `${(min + (span / 5) * i).toFixed(0)}`);
    labels.push(`${max.toFixed(0)}`);
  }
  return { finalized, inProgress, missing, notStarted, perSession: Array.from(sessions, ([label, v]) => ({ label, ...v })), dimAverages, histogram: { bins, labels } };
}
