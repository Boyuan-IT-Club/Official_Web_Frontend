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
