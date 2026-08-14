import * as Y from 'yjs';
import { applyTextDiff, dimensionColId, weightedTotal, BoardColumn } from './collab';

const textOf = (doc: Y.Doc) => doc.getText('t');

const scoreColumn = (id: string, weight: number): BoardColumn => ({
  id, label: id, type: 'score', weight, maxScore: 10, order: 1,
});

describe('applyTextDiff', () => {
  it('把整串改动折算成最小的增删', () => {
    const doc = new Y.Doc();
    const text = textOf(doc);
    text.insert(0, '沟通清晰');

    applyTextDiff(text, '沟通非常清晰');

    expect(text.toString()).toBe('沟通非常清晰');
  });

  it('只改中间一段时不动首尾', () => {
    const doc = new Y.Doc();
    const text = textOf(doc);
    text.insert(0, 'abcdef');

    const deltas: any[] = [];
    text.observe((event) => deltas.push(...event.changes.delta));
    // 真实写入都包在事务里，这样一次改动只产生一个 delta
    doc.transact(() => applyTextDiff(text, 'abXYef'));

    expect(text.toString()).toBe('abXYef');
    // 保留了公共前缀 ab 与后缀 ef，只替换中间两个字符
    expect(deltas).toEqual([{ retain: 2 }, { delete: 2 }, { insert: 'XY' }]);
  });

  it('内容没变时不产生任何操作', () => {
    const doc = new Y.Doc();
    const text = textOf(doc);
    text.insert(0, '不变');

    let changed = false;
    text.observe(() => { changed = true; });
    applyTextDiff(text, '不变');

    expect(changed).toBe(false);
  });

  it('清空与从空写入都能正确处理', () => {
    const doc = new Y.Doc();
    const text = textOf(doc);

    applyTextDiff(text, '首次输入');
    expect(text.toString()).toBe('首次输入');

    applyTextDiff(text, '');
    expect(text.toString()).toBe('');
  });

  /**
   * 共编模型下一份评语就是几位面试官一起写的，同时下笔是常态——两边的改动都必须活下来。
   */
  it('两个副本各自改动后合并，双方内容都不丢', () => {
    const local = new Y.Doc();
    const remote = new Y.Doc();
    local.getText('t').insert(0, '基础评价');
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(local));

    applyTextDiff(textOf(local), '基础评价，技术扎实');
    applyTextDiff(textOf(remote), '补充：基础评价');

    Y.applyUpdate(local, Y.encodeStateAsUpdate(remote));
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(local));

    const merged = textOf(local).toString();
    expect(textOf(remote).toString()).toBe(merged);
    expect(merged).toContain('技术扎实');
    expect(merged).toContain('补充：');
  });
});

describe('weightedTotal', () => {
  const columns = [scoreColumn(dimensionColId(1), 1), scoreColumn(dimensionColId(2), 2)];

  it('按 Σ(得分 × 权重) 计算并保留两位小数', () => {
    expect(weightedTotal({ 'dim:1': 8, 'dim:2': 7 }, columns)).toBe(22);
    expect(weightedTotal({ 'dim:1': 8.15, 'dim:2': 0 }, columns)).toBe(8.15);
  });

  it('只填了部分维度时按已填的算', () => {
    expect(weightedTotal({ 'dim:2': 5 }, columns)).toBe(10);
  });

  it('一个维度都没填时返回 null，避免把未评价显示成 0 分', () => {
    expect(weightedTotal({}, columns)).toBeNull();
  });

  it('忽略已被删除的维度留下的历史得分', () => {
    expect(weightedTotal({ 'dim:1': 6, 'dim:99': 10 }, columns)).toBe(6);
  });
});
