import {
  QueueItem, filterByDept, landingAfterDeptChange, neighborOf, nextUngradedOf, progressOf,
} from './useScoringQueue';

const q = (id: number, score: number | null, depts: string[] = ['技术部']): QueueItem =>
  ({ resumeId: id, name: `候选人${id}`, score, depts });

describe('打分舞台的队列推进', () => {
  const list = [q(1, 80), q(2, null), q(3, null, ['媒体部']), q(4, 90)];

  it('回车跳下一位未打分：跳过已打分的', () => {
    expect(nextUngradedOf(list, 1)?.resumeId).toBe(2);
  });

  it('末尾回绕：从最后一位往回找到前面漏掉的', () => {
    expect(nextUngradedOf(list, 4)?.resumeId).toBe(2);
  });

  it('不会绕回自己——刚打完分时列表可能还没回填', () => {
    const justScored = [q(1, 80), q(2, null)];
    expect(nextUngradedOf(justScored, 2)).toBeNull();
  });

  it('全部打完返回 null', () => {
    expect(nextUngradedOf([q(1, 80), q(2, 90)], 1)).toBeNull();
  });

  it('相邻浏览含回绕，且不过滤已打分', () => {
    expect(neighborOf(list, 1, 1)?.resumeId).toBe(2);
    expect(neighborOf(list, 1, -1)?.resumeId).toBe(4);
    expect(neighborOf(list, 4, 1)?.resumeId).toBe(1);
  });

  it('部门筛选按志愿并集匹配', () => {
    expect(filterByDept(list, '媒体部').map((x) => x.resumeId)).toEqual([3]);
    expect(filterByDept(list, undefined)).toHaveLength(4);
  });

  it('切部门后当前这位还在范围内就不打断', () => {
    const scoped = filterByDept(list, '技术部');
    expect(landingAfterDeptChange(scoped, 2)?.resumeId).toBe(2);
  });

  it('切部门后当前这位被筛走：落到第一位未打分的', () => {
    const scoped = filterByDept(list, '媒体部');
    expect(landingAfterDeptChange(scoped, 1)?.resumeId).toBe(3);
  });

  it('进度统计', () => {
    expect(progressOf(list, 2)).toEqual({ index: 2, total: 4, ungraded: 2 });
  });
});
