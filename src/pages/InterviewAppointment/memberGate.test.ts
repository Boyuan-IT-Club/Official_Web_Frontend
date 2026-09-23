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

  it('社员本届真提交过 → 显示真实进度（本届被录取的人要回来看结果）', () => {
    [2, 3, 4, 5, 6].forEach((st) => {
      expect(shouldShowMemberNotice({ ...base, isMember: true, resumeStatus: st })).toBe(false);
    });
  });

  /**
   * 这条是上一版漏掉的：判据当时写成 resumeStatus != null，草稿也算「有记录」，
   * 于是线上 cycle 14 那 4 个挂着 status=1 空草稿的社员全都没被拦住，
   * 看到的还是「草稿（尚未提交）/ 继续填写并提交」。
   */
  it('社员只有草稿 → 仍显示社员态，草稿不是申请记录', () => {
    expect(shouldShowMemberNotice({ ...base, isMember: true, resumeStatus: 0 })).toBe(true);
    expect(shouldShowMemberNotice({ ...base, isMember: true, resumeStatus: 1 })).toBe(true);
  });

  it('加载中不下结论——否则会闪一下社员态再跳回进度', () => {
    expect(shouldShowMemberNotice({ ...base, isMember: true, loading: true })).toBe(false);
  });
});
