// 老社员认领：往届社员注册后自助申请，管理员审批置为社员。
import { request } from '@/utils';

export interface MemberClaim {
  claimId: number;
  userId: number;
  realName: string;
  studentId?: string | null;
  joinYear?: string | null;
  deptId?: number | null;
  evidence?: string | null;
  /** 0待审核 1已通过 2已驳回 */
  status: number;
  reviewNote?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  // 联表展示字段
  username?: string;
  email?: string;
  deptName?: string;
}

export const CLAIM_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;

// ── 学生侧 ──

export const submitMemberClaim = (data: {
  realName: string; studentId?: string; joinYear?: string; deptId?: number; evidence?: string;
}) => request({ url: '/api/member-claims', method: 'post', data });

/** 返回 { isMember, claim }；claim 为 null 表示从未申请过 */
export const getMyMemberClaim = () =>
  request({ url: '/api/member-claims/my', method: 'get' });

// ── 管理侧 ──

export const listMemberClaims = (params: {
  status?: number; keyword?: string; page?: number; size?: number;
}) => request({ url: '/api/member-claims', method: 'get', params });

export const getPendingClaimCount = () =>
  request({ url: '/api/member-claims/pending-count', method: 'get' });

export const approveMemberClaim = (claimId: number, data: { deptId?: number; note?: string }) =>
  request({ url: `/api/member-claims/${claimId}/approve`, method: 'post', data });

export const rejectMemberClaim = (claimId: number, data: { note?: string }) =>
  request({ url: `/api/member-claims/${claimId}/reject`, method: 'post', data });
