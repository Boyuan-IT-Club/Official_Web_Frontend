import {
  errorText,
  normalizeReportList,
  publishFailureNote,
  reportNotes,
  reportStatusLabel,
  runFailure,
  unverifiedRows,
} from '../reportView';

describe('报告状态', () => {
  it('五种状态各有中文名;不认识的原样显示', () => {
    expect(reportStatusLabel('generating')).toBe('生成中');
    expect(reportStatusLabel('draft')).toBe('草稿');
    expect(reportStatusLabel('failed')).toBe('生成失败');
    expect(reportStatusLabel('published')).toBe('已发布');
    expect(reportStatusLabel('superseded')).toBe('已被取代');
    expect(reportStatusLabel('archived')).toBe('archived');
    expect(reportStatusLabel(undefined)).toBe('未知');
  });
});

describe('版本列表的整理', () => {
  it('形状不对按空处理,不抛错', () => {
    expect(normalizeReportList(undefined)).toEqual([]);
    expect(normalizeReportList({ items: {} })).toEqual([]);
    expect(normalizeReportList({ items: [null, { status: 'draft' }, { version: 2, status: 'draft' }] }))
      .toEqual([{ version: 2, status: 'draft' }]);
  });
});

describe('出错时给人看的一句话', () => {
  it('422 且没有可读的原因(请求体没过校验):给通用说明', () => {
    expect(errorText({ status: 422, message: '' }, '失败')).toBe('请求内容不符合要求,请检查后重试');
    expect(errorText({ status: 422, message: 'Request failed with status code 422' }, '失败'))
      .toBe('请求内容不符合要求,请检查后重试');
  });

  it('422 但接口给了给人看的原因(文字没过闸门):原样显示', () => {
    expect(errorText({ status: 422, message: '内容疑似包含个人信息' }, '失败')).toBe('内容疑似包含个人信息');
  });

  it('其余用接口原文,没有就用兜底', () => {
    expect(errorText({ status: 409, message: '该周期已有一份报告在生成' }, '失败')).toBe('该周期已有一份报告在生成');
    expect(errorText({}, '失败')).toBe('失败');
    expect(errorText(undefined, '失败')).toBe('失败');
  });
});

describe('审阅前要知道的情况', () => {
  const report = (sections: any): any => ({ cycle_id: 2, version: 1, status: 'draft', sections });

  it('撰稿人没有产出:提示各节没有经过汇总', () => {
    const notes = reportNotes(report({ writer_status: 'failed', sections: [] }));
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toContain('没有经过汇总');
    expect(notes[0].level).toBe('warning');
  });

  it('某一节分析员没有产出或没有数据:点名是哪一节', () => {
    const notes = reportNotes(report({
      writer_status: 'ok',
      sections: [
        { role: 'data', title: '招新漏斗与部门', status: 'ok' },
        { role: 'qa', title: '对话与知识库', status: 'analyst_failed' },
        { role: 'evaluation', title: '初筛与出题', status: 'no_data' },
      ],
    }));
    expect(notes.map((n) => n.text)).toEqual([
      '「对话与知识库」这一节的分析员没有产出,这一节只有指标、没有解读。',
      '「初筛与出题」这一节的数据不可用。',
    ]);
  });

  it('一切正常没有提示;生成中/失败时 sections 是空对象也不抛错', () => {
    expect(reportNotes(report({ writer_status: 'ok', sections: [{ title: 'x', status: 'ok' }] }))).toEqual([]);
    expect(reportNotes(report({}))).toEqual([]);
    expect(reportNotes(report(undefined))).toEqual([]);
    expect(reportNotes(null)).toEqual([]);
  });
});

describe('没有进入报告的内容', () => {
  it('逐条列出位置、原文、原因', () => {
    expect(unverifiedRows({
      cycle_id: 2, version: 1,
      unverified: [{ where: 'summary', text: '投递数增长了 80%', reason: '快照里没有这个数' }],
    })).toEqual([{ where: 'summary', text: '投递数增长了 80%', reason: '快照里没有这个数' }]);
  });

  it('字段缺失不抛错', () => {
    expect(unverifiedRows({ cycle_id: 2, version: 1 })).toEqual([]);
    expect(unverifiedRows({ cycle_id: 2, version: 1, unverified: [null, {}] as any }))
      .toEqual([{ where: '', text: '', reason: '' }]);
    expect(unverifiedRows(null)).toEqual([]);
  });
});

describe('触发生成被拒', () => {
  it('503 = 报告生成没有开启,是功能未开放,不是故障', () => {
    expect(runFailure({ status: 503, message: '报告生成未开启;设置 RETRO_REPORT_ENABLED=true 后可用' }))
      .toEqual({ kind: 'disabled', message: '报告生成未开启;设置 RETRO_REPORT_ENABLED=true 后可用' });
  });

  it('409 = 现在不能生成(已有一份在生成,或基线对不上)', () => {
    expect(runFailure({ status: 409, message: '该周期已有一份报告在生成' }).kind).toBe('busy');
  });

  it('其余按出错处理', () => {
    expect(runFailure({ status: 500, message: '采集快照失败' }).kind).toBe('error');
    expect(runFailure({}).message).toBe('启动报告生成失败');
  });
});

describe('发布失败的补充说明', () => {
  it('503:明确说报告没有发布', () => {
    expect(publishFailureNote({ status: 503 })).toContain('没有发布');
  });
  it('409 / 404 各有处置建议;其他情况提示核对', () => {
    expect(publishFailureNote({ status: 409 })).toContain('不是草稿');
    expect(publishFailureNote({ status: 404 })).toContain('没有找到');
    expect(publishFailureNote({ status: 500 })).toContain('核对');
  });
});
