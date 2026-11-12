import { chunkIds, hasConfidenceInfo, matchesAiFilter, AI_RUN_BATCH_MAX } from './aiScreening';

const card = (over: any = {}): any => ({ resume_id: 1, hard_zero: false, ...over });

describe('AI 状态筛选', () => {
  it('暂无 AI 初筛 = 没有评分卡', () => {
    expect(matchesAiFilter(undefined, 'pending')).toBe(true);
    expect(matchesAiFilter(card(), 'pending')).toBe(false);
  });

  it('各档按评分卡字段判定', () => {
    expect(matchesAiFilter(card({ match_level: '优秀' }), 'match_top')).toBe(true);
    expect(matchesAiFilter(card({ effort_level: '一般' }), 'effort_low')).toBe(true);
    expect(matchesAiFilter(card({ transfer_hint: { dept: '媒体部', is_second_choice: false } }), 'transfer')).toBe(true);
    expect(matchesAiFilter(card({ hard_zero: true }), 'review')).toBe(true);
    expect(matchesAiFilter(card({ needs_rerun: true }), 'rerun')).toBe(true);
    expect(matchesAiFilter(undefined, 'match_top')).toBe(false);
  });

  it('全部 AI 状态不过滤', () => {
    expect(matchesAiFilter(undefined, 'all')).toBe(true);
  });

  it('置信度低:只收 confidence 为 low 的卡', () => {
    expect(matchesAiFilter(card({ confidence: 'low' }), 'low_confidence')).toBe(true);
    expect(matchesAiFilter(card({ confidence: 'medium' }), 'low_confidence')).toBe(false);
    expect(matchesAiFilter(card({ confidence: 'high' }), 'low_confidence')).toBe(false);
  });

  it('单评委模式的卡(confidence 为 null)和旧版 Agent 的卡(没有这个字段)不算低置信', () => {
    expect(matchesAiFilter(card({ confidence: null, scoring_mode: null }), 'low_confidence')).toBe(false);
    expect(matchesAiFilter(card(), 'low_confidence')).toBe(false);
    expect(matchesAiFilter(undefined, 'low_confidence')).toBe(false);
  });

  it('疑似提示注入:只认明确的 true', () => {
    expect(matchesAiFilter(card({ injection_detected: true }), 'injection')).toBe(true);
    expect(matchesAiFilter(card({ injection_detected: false }), 'injection')).toBe(false);
    expect(matchesAiFilter(card(), 'injection')).toBe(false);
  });
});

describe('本周期有没有置信度信息', () => {
  it('只要有一张卡带置信度就算有', () => {
    expect(hasConfidenceInfo([card(), card({ confidence: 'high' })])).toBe(true);
    expect(hasConfidenceInfo([card({ confidence: 'low' })])).toBe(true);
  });

  it('全是单评委模式的卡、旧版 Agent 的卡,或一张卡都没有:算没有', () => {
    expect(hasConfidenceInfo([])).toBe(false);
    expect(hasConfidenceInfo([card(), card({ confidence: null }), undefined])).toBe(false);
    expect(hasConfidenceInfo([card({ confidence: 'weird' })])).toBe(false);
  });
});

describe('AI 初筛按 Agent 上限切批', () => {
  it('120 份一批提交', () => {
    const ids = Array.from({ length: 120 }, (_, i) => i + 1);
    expect(chunkIds(ids)).toEqual([ids]);
  });

  it('超过上限切成多批，顺序不变（job_ids 按提交顺序映射）', () => {
    const ids = Array.from({ length: AI_RUN_BATCH_MAX * 2 + 5 }, (_, i) => i);
    const batches = chunkIds(ids);
    expect(batches.map((b) => b.length)).toEqual([AI_RUN_BATCH_MAX, AI_RUN_BATCH_MAX, 5]);
    expect(batches.flat()).toEqual(ids);
  });

  it('空列表不产生批次', () => {
    expect(chunkIds([])).toEqual([]);
  });
});
