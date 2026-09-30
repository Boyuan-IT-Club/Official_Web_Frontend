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

/**
 * 取附件的限时直链（15 分钟），浏览器拿去直接从 COS 下载，不经过我们的服务器。
 *
 * 为什么不再用 fetchAttachmentBlob：那条路是 COS → 服务器 → 浏览器转一道，
 * 而服务器公网出口只有 5~8Mbps、所有人共享。一份 4MB 的 PDF 就能把管道占满好几秒，
 * 页面上同时发出的列表请求排队超过 10 秒超时，报「获取简历列表失败」。
 * 同一台机器实测：COS 直链 14~32MB/s，走服务器 0.4~1.1MB/s。
 *
 * 签名本身就是凭据，链接可以直接放进 img / object / video 的 src，
 * 不需要 Authorization 头，浏览器还能边下边渲染（PDF 先出第一页）。
 *
 * @returns 直链；COS 未启用时为 null，调用方退回 fetchAttachmentBlob
 */
export async function fetchAttachmentUrl(id: number, inline: boolean): Promise<string | null> {
  const res: any = await request({
    url: `/api/resumes/attachments/${id}/url`,
    method: 'get',
    params: { inline },
  });
  return res?.data?.url ?? null;
}

/** 人类可读的体积。 */
export function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 单个附件上限，必须与后端 `ResumeAttachmentServiceImpl.MAX_BYTES` 一致。
 * 不一致时超限文件会被服务端拒掉，而界面上看不出是「太大」还是「接口坏了」。
 */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
