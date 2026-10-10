import * as Y from 'yjs';
import {
  addInterviewerToSessionRows, applyTextDiff, buildDimensionColumns, dimensionColId,
  reconcileDimensionColumns, weightedTotal, BoardColumn,
} from './collab';

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

/**
 * 自助顶班后让同场其他人立刻看见。
 *
 * 文档里的面试官名单是服务端播种的，要等下一轮对账（默认 5 分钟）才刷新。
 * 之前只在本地记一笔，结果：加入的人自己退出重进就失效，同场其他人更是
 * 五分钟内都看不到他的评分列。
 */
describe('addInterviewerToSessionRows', () => {
  const docWithRows = (rows: { scheduleId: number; sessionId: number | null; ids: number[] }[]) => {
    const doc = new Y.Doc();
    doc.transact(() => {
      const map = doc.getMap<Y.Map<any>>('rows');
      rows.forEach((r) => {
        const rowMap = new Y.Map<any>();
        const info = new Y.Map<any>();
        info.set('scheduleId', r.scheduleId);
        info.set('sessionId', r.sessionId);
        info.set('interviewerUserIds', r.ids);
        rowMap.set('_info', info);
        map.set(String(r.scheduleId), rowMap);
      });
    });
    return doc;
  };

  const idsOf = (doc: Y.Doc, scheduleId: number) =>
    doc.getMap<Y.Map<any>>('rows').get(String(scheduleId))!.get('_info').get('interviewerUserIds');

  it('写进该场次的每一行，不碰别的场次', () => {
    const doc = docWithRows([
      { scheduleId: 1, sessionId: 17, ids: [7] },
      { scheduleId: 2, sessionId: 17, ids: [] },
      { scheduleId: 3, sessionId: 23, ids: [7] },
    ]);

    expect(addInterviewerToSessionRows(doc, 17, 2)).toBe(2);

    expect(idsOf(doc, 1)).toEqual([7, 2]);
    expect(idsOf(doc, 2)).toEqual([2]);
    expect(idsOf(doc, 3)).toEqual([7]);
  });

  it('已经在名单里就不重复加', () => {
    const doc = docWithRows([{ scheduleId: 1, sessionId: 17, ids: [2] }]);

    expect(addInterviewerToSessionRows(doc, 17, 2)).toBe(0);
    expect(idsOf(doc, 1)).toEqual([2]);
  });

  it('线上面试那类没有场次的行不受影响', () => {
    const doc = docWithRows([{ scheduleId: 1, sessionId: null, ids: [] }]);

    expect(addInterviewerToSessionRows(doc, 17, 2)).toBe(0);
    expect(idsOf(doc, 1)).toEqual([]);
  });

  it('一次事务，对端只收到一个更新', () => {
    const doc = docWithRows([
      { scheduleId: 1, sessionId: 17, ids: [] },
      { scheduleId: 2, sessionId: 17, ids: [] },
    ]);
    let updates = 0;
    doc.on('update', () => { updates += 1; });

    addInterviewerToSessionRows(doc, 17, 2);

    expect(updates).toBe(1);
  });
});

// 评分维度改动后，评价表的列必须跟着变。
// 线上 bug：管理端改了维度，表纹丝不动——列只在协同文档首次播种时写过一次。
// 这组断言同时锁住「与 collab-server/src/doc-model.js 同规则」这条约定：
// 两边都会写 columns，规则分叉会表现为「刚改好又被服务端改回去」。
describe('评分维度列', () => {
  const dims = (...items: Array<[number, string]>) => items.map(([dimensionId, name], index) => ({
    dimensionId, name, maxScore: 10, weight: 1, sortOrder: index + 1,
  }));

  const idsOf = (doc: Y.Doc) => doc.getArray<Y.Map<any>>('columns').toArray().map((c) => c.get('id'));

  const seeded = (...items: Array<[number, string]>) => {
    const doc = new Y.Doc();
    reconcileDimensionColumns(doc, dims(...items));
    return doc;
  };

  it('评语列与推荐意见列始终排在维度之后', () => {
    const columns = buildDimensionColumns(dims([1, '能力'], [2, '价值']));
    expect(columns.map((c) => c.id)).toEqual([
      dimensionColId(1), dimensionColId(2), 'comment', 'recommendation',
    ]);
    expect(columns.map((c) => c.order)).toEqual([1, 2, 3, 4]);
  });

  it('新增维度后多出一列，原有列保持原样', () => {
    const doc = seeded([1, '能力'], [2, '价值']);
    reconcileDimensionColumns(doc, dims([1, '能力'], [2, '价值'], [3, '社交']));
    expect(idsOf(doc)).toEqual([
      dimensionColId(1), dimensionColId(2), 'comment', 'recommendation', dimensionColId(3),
    ]);
    // 物理顺序无所谓，渲染按 order 排
    const byId = (id: string) => doc.getArray<Y.Map<any>>('columns').toArray().find((c) => c.get('id') === id);
    expect(byId(dimensionColId(3))!.get('order')).toBe(3);
    expect(byId('comment')!.get('order')).toBe(4);
  });

  it('改名就地生效', () => {
    const doc = seeded([1, '能力'], [2, '价值']);
    reconcileDimensionColumns(doc, dims([1, '能力（技术+学习+思维）'], [2, '价值']));
    const first = doc.getArray<Y.Map<any>>('columns').toArray()[0];
    expect(first.get('id')).toBe(dimensionColId(1));
    expect(first.get('label')).toBe('能力（技术+学习+思维）');
  });

  it('删除维度只撤列', () => {
    const doc = seeded([1, '能力'], [2, '价值']);
    reconcileDimensionColumns(doc, dims([1, '能力']));
    expect(idsOf(doc)).toEqual([dimensionColId(1), 'comment', 'recommendation']);
  });

  it('新增维度时顺手预建每行的评语格', () => {
    // 不预建的话，两人同时在这个空格里敲第一个字会各建一个 Y.Text，合并后有人丢字
    const doc = seeded([1, '能力']);
    const rowMap = new Y.Map<any>();
    doc.getMap<Y.Map<any>>('rows').set('100', rowMap);

    reconcileDimensionColumns(doc, dims([1, '能力'], [2, '价值']));

    expect(rowMap.get(`${dimensionColId(2)}:note`)).toBeInstanceOf(Y.Text);
  });

  it('重复执行不产生重复列，也不再写入任何改动', () => {
    // 服务端对账与本地刷新先后跑同一套规则，必须幂等，否则两边会互相推翻
    const doc = seeded([1, '能力'], [2, '价值']);
    let changed = false;
    doc.on('update', () => { changed = true; });
    reconcileDimensionColumns(doc, dims([1, '能力'], [2, '价值']));
    expect(idsOf(doc)).toEqual([
      dimensionColId(1), dimensionColId(2), 'comment', 'recommendation',
    ]);
    expect(changed).toBe(false);
  });
});
