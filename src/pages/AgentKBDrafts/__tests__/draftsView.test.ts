import {
  approveBlocker,
  approveFailure,
  approveOutcome,
  draftFlags,
  evidenceRows,
  kindLabel,
  normalizeDraftList,
  statusLabel,
  verdictLabel,
} from '../draftsView';

const draft = (over: any = {}): any => ({
  draft_id: 17, kind: 'new_faq', topic: '社团会费', question: '加入社团需要交费吗?', answer: '不收费。',
  status: 'pending', conflict_with: [], review: {}, evidence: [], ...over,
});

describe('标签', () => {
  it('类型、状态、审核结论:认识的给中文,不认识的原样显示', () => {
    expect(kindLabel('alt_question')).toBe('补问法');
    expect(kindLabel('new_faq')).toBe('新 FAQ');
    expect(kindLabel('missing')).toBe('待补充');
    expect(kindLabel('brand_new')).toBe('brand_new');
    expect(kindLabel(undefined)).toBe('未知类型');
    expect(statusLabel('superseded')).toBe('已被顶替');
    expect(statusLabel(undefined)).toBe('未知');
    expect(verdictLabel('contradicted')).toBe('与出处矛盾');
    expect(verdictLabel(undefined)).toBe('');
  });
});

describe('列表返回的整理', () => {
  it('形状不对按空处理,不抛错', () => {
    expect(normalizeDraftList(undefined)).toEqual({ items: [], total: 0 });
    expect(normalizeDraftList({ items: {} })).toEqual({ items: [], total: 0 });
    expect(normalizeDraftList({ items: [null, { topic: '没 id' }, draft()], total: 9 }))
      .toEqual({ items: [draft()], total: 9 });
  });

  it('没给 total 时用条数顶上', () => {
    expect(normalizeDraftList({ items: [draft()] }).total).toBe(1);
  });
});

describe('需要留意的标记', () => {
  it('与现有条目冲突排在最前,是必须先处理的那一类', () => {
    const flags = draftFlags(draft({ conflict_with: ['kb_x'], review: { mixed_cycles: true } }));
    expect(flags.map((f) => f.key)).toEqual(['conflict', 'cycles']);
    expect(flags[0].level).toBe('danger');
  });

  it('降级、由新 FAQ 转成只是说明;什么都没有就不出标记', () => {
    expect(draftFlags(draft({ review: { downgraded: true, converted_from: 'new_faq' } })).map((f) => f.key))
      .toEqual(['downgraded', 'converted']);
    expect(draftFlags(draft())).toEqual([]);
    expect(draftFlags(draft({ review: undefined, conflict_with: undefined }))).toEqual([]);
  });
});

describe('逐句出处与审核结论', () => {
  it('按句号(从 1 起)对上', () => {
    const rows = evidenceRows(draft({
      evidence: [{ sentence: '不收费。', quote: '不向成员收取会费', source_title: '社团章程' }, { sentence: '第二句。' }],
      review: { findings: [{ index: 2, verdict: 'unsupported', reason: '原文没有这层意思' }, { index: 1, verdict: 'supported', reason: '' }] },
    }));
    expect(rows.map((r) => [r.index, r.verdict])).toEqual([[1, 'supported'], [2, 'unsupported']]);
    expect(rows[1].reason).toBe('原文没有这层意思');
    expect(rows[0].source_title).toBe('社团章程');
  });

  it('没有审核结论的句子不硬凑;字段缺失不抛错', () => {
    expect(evidenceRows(draft({ evidence: [{ sentence: 'x' }], review: {} }))[0].verdict).toBe('');
    expect(evidenceRows(draft({ evidence: undefined, review: undefined }))).toEqual([]);
  });
});

describe('现在能不能批准', () => {
  it('「待补充」没写答案不能批准,写了就可以', () => {
    expect(approveBlocker(draft({ kind: 'missing', answer: '' }), '   ')).toContain('先写好答案');
    expect(approveBlocker(draft({ kind: 'missing' }), '招新不收费')).toBeNull();
  });

  it('补问法的目标 FAQ 已被删除:发布不了', () => {
    expect(approveBlocker(draft({ kind: 'alt_question', target: null }), '')).toContain('已经不存在');
    expect(approveBlocker(draft({ kind: 'alt_question', target: { source_id: 'kb_a' } }), '')).toBeNull();
  });

  it('已经处理过的草稿不能再批准', () => {
    expect(approveBlocker(draft({ status: 'approved' }), 'x')).toContain('已经处理过');
  });
});

describe('批准的结果', () => {
  it('成功:带上发布成的条目 id', () => {
    expect(approveOutcome({ draft_id: 17, status: 'approved', published_source_id: 'kb_draft17', audit_recorded: true }))
      .toEqual({ level: 'success', text: '已批准并发布到知识库(条目 kb_draft17)' });
  });

  it('内容已发布但审计没记上:是警告,要提示联系运维补记', () => {
    const o = approveOutcome({ published_source_id: 'kb_draft17', audit_recorded: false });
    expect(o.level).toBe('warning');
    expect(o.text).toContain('已发布');
    expect(o.text).toContain('联系运维补记');
  });

  it('旧返回里没有 audit_recorded 字段时不当成没记上', () => {
    expect(approveOutcome({ published_source_id: 'kb_a' }).level).toBe('success');
  });
});

describe('批准失败的说明', () => {
  it('接口的原文原样保留', () => {
    const f = approveFailure({ status: 503, message: '审计服务不可用,草稿未发布,请稍后重试' });
    expect(f.message).toBe('审计服务不可用,草稿未发布,请稍后重试');
  });

  it('契约明确说知识库没被改动的几种状态码:照说', () => {
    [400, 404, 409, 502, 503].forEach((status) => {
      expect(approveFailure({ status, message: 'x' }).note).toBe('知识库没有被改动。');
    });
  });

  it('内容其实已经写入知识库:说明重试即可、不会重复发布', () => {
    const f = approveFailure({
      status: 500, message: '内容已写入知识库(条目 kb_draft17),但草稿状态更新失败;请重试批准,重试不会重复发布',
    });
    expect(f.note).toContain('已经发布');
    expect(f.note).toContain('不会重复发布');
    expect(f.note).not.toContain('没有被改动');
  });

  it('其他情况不替接口下结论', () => {
    const f = approveFailure({ status: 500, message: '发布失败,知识库未改动,请稍后重试' });
    expect(f.message).toBe('发布失败,知识库未改动,请稍后重试');
    expect(f.note).not.toContain('没有被改动');
    expect(approveFailure({}).message).toBe('批准失败');
  });
});
