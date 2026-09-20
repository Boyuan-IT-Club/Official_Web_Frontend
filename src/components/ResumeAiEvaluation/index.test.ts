import { aiRecommendation } from './index';

describe('aiRecommendation', () => {
  it('prioritizes hard-zero review over a high numeric score', () => {
    expect(aiRecommendation({ hard_zero: true, total: 95 }).text).toBe('建议重点复核');
  });

  it('uses stable score bands for the resume list and detail view', () => {
    expect(aiRecommendation({ hard_zero: false, total: 85 }).text).toBe('建议优先进入面试');
    expect(aiRecommendation({ hard_zero: false, total: 60 }).text).toBe('建议进入人工复核');
    expect(aiRecommendation({ hard_zero: false, total: 59 }).text).toBe('建议谨慎复核');
  });
});
