import { readCanAttendOffline } from '../interviewIntent';

const field = (v: unknown) => [{ fieldKey: 'expected_interview_time', fieldValue: v }];

describe('readCanAttendOffline', () => {
  it('选了不能参加线下面试 → false', () => {
    expect(readCanAttendOffline(field('{"first":"","second":"","canAttend":"no"}'))).toBe(false);
  });

  it('选了能参加 → true', () => {
    expect(readCanAttendOffline(field('{"first":"周六上午","canAttend":"yes"}'))).toBe(true);
  });

  it('还没填意向 → null（不是 true）', () => {
    // null 与 true 必须分开：未知时按默认的线下流程展示，
    // 而不是把人当成「确认能来」
    expect(readCanAttendOffline([])).toBeNull();
    expect(readCanAttendOffline(undefined)).toBeNull();
    expect(readCanAttendOffline(field(''))).toBeNull();
  });

  it('JSON 里没有 canAttend → null', () => {
    expect(readCanAttendOffline(field('{"first":"周六上午"}'))).toBeNull();
  });

  it('值不是合法 JSON 也不抛异常', () => {
    expect(readCanAttendOffline(field('不是 JSON'))).toBeNull();
  });

  it('无关字段不参与判断', () => {
    expect(readCanAttendOffline([
      { fieldKey: 'name', fieldValue: '{"canAttend":"no"}' },
    ])).toBeNull();
  });
});
