import { ensureInterviewTimesInPayload, serializeInterviewTimes } from '../interviewTimes';

const yes = { first: '', second: '', canAttend: 'yes' as const, customTime: '' };
const no = { first: '周六上午', second: '', canAttend: 'no' as const, customTime: '周末线上可以' };

describe('能否参加线下面试 · 落库', () => {
  it('学生没动过默认值时，保存载荷里也带上「能参加」', () => {
    const out = ensureInterviewTimesInPayload([{ fieldId: 1, fieldValue: '张三', resumeId: 9 }], {
      fieldId: 277, disabled: false, times: yes, resumeId: 9,
    });
    const answer = out.find((p) => p.fieldId === 277);
    expect(answer).toBeDefined();
    expect(JSON.parse(answer!.fieldValue).canAttend).toBe('yes');
  });

  it('学生改过（载荷里已有）时不覆盖', () => {
    const changed = { fieldId: 277, fieldValue: serializeInterviewTimes(no), resumeId: 9 };
    const out = ensureInterviewTimesInPayload([changed], {
      fieldId: 277, disabled: false, times: yes, resumeId: 9,
    });
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0].fieldValue).canAttend).toBe('no');
  });

  it('字段被停用或本届没有这个字段时不加', () => {
    expect(ensureInterviewTimesInPayload([], { fieldId: 277, disabled: true, times: yes, resumeId: 9 })).toEqual([]);
    expect(ensureInterviewTimesInPayload([], { fieldId: undefined, disabled: false, times: yes, resumeId: 9 })).toEqual([]);
  });

  it('已有记录时沿用 valueId（更新而不是新增）', () => {
    const out = ensureInterviewTimesInPayload([], {
      fieldId: 277, disabled: false, times: yes, existingValueId: 55, resumeId: 9,
    });
    expect(out[0].valueId).toBe(55);
  });

  it('选了不能参加时清掉线下时间、保留线上说明', () => {
    expect(JSON.parse(serializeInterviewTimes(no))).toEqual({
      first: '', second: '', canAttend: 'no', customTime: '周末线上可以',
    });
  });
});
