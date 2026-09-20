/**
 * 申请进度页要不要整页换成「你已经是社员」。
 *
 * 抽出来是因为这四个条件各有各的理由，写在 583 行的组件里读不出意图，
 * 也没法测。2026-09 之前这一屏对社员显示的是「开始你的申请 / 去填写」，
 * 而点进投递页又会被挡回来——两屏自相矛盾。
 */
export interface MemberGateInput {
  /** 当前用户是不是社员 */
  isMember: boolean;
  /** 当前查看的是不是往届（不在开放周期列表里） */
  isHistory: boolean;
  /** 本届简历状态，null 表示这届没投过 */
  resumeStatus: number | null;
  /** 数据还在加载时不要下结论，否则会闪一下社员态再跳回进度 */
  loading: boolean;
}

export const shouldShowMemberNotice = ({
  isMember, isHistory, resumeStatus, loading,
}: MemberGateInput): boolean => {
  if (loading) return false;
  if (!isMember) return false;
  // 往届照常渲染进度：社员多半就是从某一届进来的，回看当年的记录是合理需求
  if (isHistory) return false;
  // 本届真投了就显示真实进度（比如社员换部门重新投递）
  if (resumeStatus != null) return false;
  return true;
};
