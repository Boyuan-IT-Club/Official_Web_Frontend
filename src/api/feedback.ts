import { request } from '@/utils';

export interface Feedback {
  feedbackId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackAdminView extends Feedback {
  username?: string | null;
  userName?: string | null;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  first: boolean;
  last: boolean;
}

/** 提交当前登录用户的问题反馈。 */
export function createFeedback(content: string) {
  return request({ url: '/api/feedback', method: 'post', data: { content } });
}

/** 获取当前登录用户自己的反馈记录。 */
export function fetchMyFeedback(page = 0, size = 10) {
  return request({ url: '/api/feedback/me', method: 'get', params: { page, size } });
}

/** 管理员/超管获取全部反馈记录。 */
export function fetchAllFeedback(page = 0, size = 10) {
  return request({ url: '/api/admin/feedback', method: 'get', params: { page, size } });
}
