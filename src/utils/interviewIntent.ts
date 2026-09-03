// 「能否参加线下面试」的读取。
//
// 这个值没有自己的字段，而是塞在 expected_interview_time 的 JSON 里
// （{ first, second, canAttend }）——面试意向卡一次性写进去的。
// 需要它的地方不止一处（首页进度卡、申请进度页），解析逻辑放这里统一，
// 免得各写一份、哪天存储格式变了漏改。

/** 简历里的一个字段值，只约束这里用得到的两个属性。 */
export interface IntentBearingField {
  fieldKey?: string | null;
  fieldValue?: unknown;
}

/**
 * @returns true=能参加线下面试；false=不能；null=还没填意向或值解析不了。
 *          null 与 true 要分开处理：不能参加的同学不会被排进线下场次，
 *          给他们看线下时间地点只会白等；而「未知」应按默认的线下流程展示。
 */
export function readCanAttendOffline(fields: IntentBearingField[] | null | undefined): boolean | null {
  const raw = (fields ?? []).find((f) => f?.fieldKey === 'expected_interview_time')?.fieldValue;
  if (raw == null || raw === '') return null;
  try {
    const parsed = JSON.parse(String(raw)) as { canAttend?: unknown };
    if (parsed?.canAttend == null) return null;
    return parsed.canAttend !== 'no';
  } catch {
    return null;
  }
}
