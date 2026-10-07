import { attendanceLabel, parseInterviewTimes } from './ResumeDetail';

const resumeWith = (fields: any[]) => ({ resumeId: 1, status: 2, simpleFields: fields }) as any;

describe('管理端简历 · 是否能参加线下面试', () => {
  it('按 fieldKey 找，与字段 id 无关（线上 #14 周期是 277）', () => {
    const r = resumeWith([{ fieldId: 277, fieldKey: 'expected_interview_time', fieldValue: '{"canAttend":"no","customTime":"离普陀比较远"}' }]);
    const t = parseInterviewTimes(r);
    expect(t.canAttend).toBe('no');
    expect(attendanceLabel(t.canAttend)).toBe('不能参加');
  });

  it('没存这个回答时显示「未填写」，不再冒充「能参加」', () => {
    const t = parseInterviewTimes(resumeWith([{ fieldId: 3, fieldKey: 'name', fieldValue: '张三' }]));
    expect(t.canAttend).toBeNull();
    expect(attendanceLabel(t.canAttend)).toBe('未填写（表单默认能参加）');
  });

  it('明确选了能参加时照常显示', () => {
    const t = parseInterviewTimes(resumeWith([{ fieldId: 277, fieldKey: 'expected_interview_time', fieldValue: '{"canAttend":"yes"}' }]));
    expect(attendanceLabel(t.canAttend)).toBe('能参加');
  });

  it('没有 fieldKey 的远古数据仍按旧 id 14 兜底', () => {
    const t = parseInterviewTimes(resumeWith([{ fieldId: 14, fieldValue: '{"canAttend":"no"}' }]));
    expect(t.canAttend).toBe('no');
  });
});
