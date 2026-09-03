// 简历附件：学生上传任意格式资料，面试官在管理端预览或下载。
//
// 取文件不走 /api/files（那是头像、活动图这类公开图片的通道），
// 而是走带鉴权的 /api/resumes/attachments/{id}/content ——
// 附件是申请人的个人资料。
import { request } from '@/utils/request';

export interface ResumeAttachment {
  id: number;
  resumeId: number;
  fileName: string;
  contentType?: string | null;
  sizeBytes: number;
  createdAt?: string;
  /** 浏览器能否直接内联预览。由服务端判定，前端不要自己猜 */
  previewable: boolean;
}

export function listAttachments(resumeId: number) {
  return request({ url: `/api/resumes/${resumeId}/attachments`, method: 'get' });
}

export function uploadAttachment(resumeId: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return request({
    url: `/api/resumes/${resumeId}/attachments`,
    method: 'post',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function deleteAttachment(id: number) {
  return request({ url: `/api/resumes/attachments/${id}`, method: 'delete' });
}

/**
 * 取附件内容的 blob。
 *
 * 不能直接把 URL 塞进 <img>/<iframe> 的 src：那样发出的是不带
 * Authorization 头的普通请求，一律 401。所以先带着 token 取回 blob，
 * 再用 blob: URL 渲染。用完记得 revokeObjectURL，否则一直占着内存。
 */
export async function fetchAttachmentBlob(id: number, inline: boolean): Promise<Blob> {
  const res: any = await request({
    url: `/api/resumes/attachments/${id}/content`,
    method: 'get',
    params: { inline },
    responseType: 'blob',
  });
  // request 拦截器通常会剥一层 data；两种形状都兼容
  return res instanceof Blob ? res : res?.data;
}

/** 人类可读的体积。 */
export function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
