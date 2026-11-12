/** 一条 FAQ 至多带多少条附加问法(Agent 侧 KbSourceUpsert.alt_questions 的上限) */
export const ALT_QUESTIONS_MAX = 20;

/**
 * 附加问法的整理:去掉首尾空白、丢掉空的、去重(保留先出现的)、超出上限的截掉。
 * 接口返回的值形状不对(不是数组、里面混着非字符串)时按空处理——旧版 Agent 根本不返回这个字段。
 */
export function normalizeAltQuestions(raw: unknown, max: number = ALT_QUESTIONS_MAX): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  raw.forEach((item) => {
    if (typeof item !== 'string') return;
    const text = item.trim();
    if (text && !out.includes(text)) out.push(text);
  });
  return out.slice(0, max);
}
