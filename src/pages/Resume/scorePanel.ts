// 多人打分面板的纯逻辑，抽出来是为了能直接测。
//
// 后端从 V38 起返回打分明细 scoreEntries（谁、几分、什么时候），
// resumeScore 变成全部明细的平均分。输入框编辑的是「我这一票」，
// 不再是那个唯一的全局分。

export interface ScoreEntry {
  scorerId: number;
  /** 账号已注销时为 null，展示「已注销」 */
  scorerName?: string | null;
  score: number;
  scoredAt?: string | null;
}

/** 我打过的分；没打过返回 undefined（输入框留空） */
export function myScoreOf(
  entries: ScoreEntry[] | null | undefined,
  myUserId: number | string | null | undefined,
): number | undefined {
  if (!entries || myUserId == null) return undefined;
  const mine = entries.find((e) => String(e.scorerId) === String(myUserId));
  return mine ? mine.score : undefined;
}

/** 打分人展示名 */
export function scorerLabel(e: ScoreEntry): string {
  return e.scorerName && e.scorerName.trim() ? e.scorerName : '已注销';
}

/**
 * 「我」还没打分：看打分明细里有没有我这一票。0 分算打过。
 *
 * 多人打分下不能看平均分——别人先打过的那份平均分已不为空，按它判断
 * 会把这份跳过去，我这一票就漏了。拿不到自己的 userId（用户信息还没
 * 加载）时退回按平均分判断，否则刚打完的人仍算「未打」，会原地打转。
 */
export const isUngradedBy = (myUserId?: number | string | null) => (r: any): boolean => (
  myUserId == null
    ? r?.resumeScore == null
    : myScoreOf(r?.scoreEntries, myUserId) == null
);

/**
 * 盲评：能打分的人在自己打分前看不到别人的分（平均分、逐人明细都藏），
 * 免得被先打的人带着走。打完即可见，撤销后重新藏起来。
 *
 * - 不能打分（只读）的账号不受影响，否则他们永远看不到分数；
 * - 还拿不到自己的 userId（用户信息未加载）时先藏着，宁可晚一拍显示，
 *   也不闪一下别人的分。
 */
export function othersHidden(
  entries: ScoreEntry[] | null | undefined,
  myUserId: number | string | null | undefined,
  canScore: boolean,
): boolean {
  if (!canScore) return false;
  if (myUserId == null) return true;
  return myScoreOf(entries, myUserId) == null;
}
