import { shouldShowMemberNotice } from './memberGate';

const base = { isMember: false, isHistory: false, resumeStatus: null, loading: false };

describe('申请进度页的社员态判定', () => {
  it('社员 + 本届没投过 → 显示社员态（这正是用户报的问题）', () => {
    expect(shouldShowMemberNotice({ ...base, isMember: true })).toBe(true);
  });

  it('非社员一律照常显示进度', () => {
    expect(shouldShowMemberNotice({ ...base, isMember: false })).toBe(false);
  });

  it('社员看往届 → 照常显示进度，不能把人家当年的记录吃掉', () => {
    expect(shouldShowMemberNotice({ ...base, isMember: true, isHistory: true })).toBe(false);
  });

  it('社员本届真投了 → 显示真实进度，不要拿社员态盖掉', () => {
    expect(shouldShowMemberNotice({ ...base, isMember: true, resumeStatus: 2 })).toBe(false);
    expect(shouldShowMemberNotice({ ...base, isMember: true, resumeStatus: 0 })).toBe(false);
  });

  it('加载中不下结论——否则会闪一下社员态再跳回进度', () => {
    expect(shouldShowMemberNotice({ ...base, isMember: true, loading: true })).toBe(false);
  });
});
