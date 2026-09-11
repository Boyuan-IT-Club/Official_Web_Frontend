import { request } from '@/utils';

export type FeedbackCategory = 'bug' | 'suggestion' | 'other';

export const FEEDBACK_CATEGORY: Record<FeedbackCategory, { label: string; color: string }> = {
  bug: { label: '功能异常', color: 'red' },
  suggestion: { label: '功能建议', color: 'blue' },
  other: { label: '其他', color: 'default' },
};

export interface Feedback {
  feedbackId: number;
  userId: number;
  category: FeedbackCategory;
  content: string;
  /** 截图的 objectKey；只有「我的反馈」返回，展示一律走取图接口 */
  imageKeys?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackAdminView extends Omit<Feedback, 'imageKeys'> {
  username?: string | null;
  userName?: string | null;
  /** 截图张数；管理端列表不回 objectKey，按序号取图 */
  imageCount?: number;
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
export function createFeedback(payload: {
  category: FeedbackCategory;
  content: string;
  imageKeys?: string[];
}) {
  return request({ url: '/api/feedback', method: 'post', data: payload });
}

/**
 * 先传图拿 objectKey，再随反馈提交。
 *
 * 分两步而不是一次 multipart：用户往往先截图、再慢慢描述问题，
 * 一次性提交意味着写到一半刷新就全丢。
 */
export function uploadFeedbackImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request({ url: '/api/feedback/images', method: 'post', data: form });
}

/**
 * 取一张截图，返回可直接渲染的 blob: URL。
 *
 * 不能把接口地址直接塞进 <img src> —— 那样发出的请求不带 Authorization 头，
 * 一律 401（简历照片、附件都踩过，统一走「先取 blob」这条路）。
 * 调用方负责在卸载时 revokeObjectURL。
 */
export async function fetchFeedbackImage(feedbackId: number, index: number): Promise<string> {
  const res: any = await request({
    url: `/api/feedback/${feedbackId}/images/${index}`,
    method: 'get',
    responseType: 'blob',
  });
  const blob: Blob = res instanceof Blob ? res : res?.data;
  return URL.createObjectURL(blob);
}

/** 获取当前登录用户自己的反馈记录。 */
export function fetchMyFeedback(page = 0, size = 10) {
  return request({ url: '/api/feedback/me', method: 'get', params: { page, size } });
}

/** 管理员/超管获取全部反馈记录。 */
export function fetchAllFeedback(page = 0, size = 10, category?: FeedbackCategory) {
  return request({
    url: '/api/admin/feedback',
    method: 'get',
    params: category ? { page, size, category } : { page, size },
  });
}
