// 简历个人照片：字节存 COS，personal_photo 字段值里只存 objectKey。
//
// 历史数据里该字段是整段 base64 data URL，所有读取入口都必须兼容两种形态：
// data: 开头 → 直接就是可渲染的 URL；resume-photos/ 开头 → 走鉴权接口取 blob。
//
// 取图不能把接口地址直接塞进 <img> 的 src —— 那样发出的请求不带
// Authorization 头，一律 401。与附件同一套打法：先取 blob 再用 blob: URL。
import { request } from '@/utils/request';

/** 字段值是否为 COS objectKey（而非历史 base64） */
export const isPhotoObjectKey = (v?: string | null): boolean =>
  !!v && v.startsWith('resume-photos/');

/**
 * 上传照片，返回 objectKey。
 *
 * 只上传不落库：调用方要把返回的 key 作为 personal_photo 字段值随
 * 简历字段保存流提交，「保存草稿 / 取消修改」的语义因此保持不变。
 */
export async function uploadResumePhoto(resumeId: number, file: Blob, fileName = 'photo.jpg'): Promise<string> {
  const form = new FormData();
  form.append('file', file, fileName);
  const res: any = await request({
    url: `/api/resumes/${resumeId}/photo`,
    method: 'post',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const key = res?.data?.objectKey ?? res?.objectKey;
  if (!key) throw new Error('照片上传失败：服务端未返回 objectKey');
  return String(key);
}

async function fetchResumePhotoBlob(resumeId: number, cacheBuster?: string): Promise<Blob> {
  const res: any = await request({
    url: `/api/resumes/${resumeId}/photo`,
    method: 'get',
    // 响应带 private 缓存，换照片后 key 会变；把字段值当 v 参数，
    // 同一张照片命中浏览器缓存、换了照片自动失效
    params: cacheBuster ? { v: cacheBuster } : undefined,
    responseType: 'blob',
  });
  return res instanceof Blob ? res : res?.data;
}

/**
 * blob: URL 缓存，键为 resumeId|字段值。
 *
 * 刻意不 revoke：列表页几十张卡片、翻页往返都复用同一批 URL，
 * 生命周期与页面一致；条目数以「本次会话看过的不同照片」为上限，可控。
 */
const urlCache = new Map<string, Promise<string>>();

/** 把字段值解析成可渲染的 URL。没有照片返回 ''。 */
export function resolveResumePhotoUrl(resumeId: number | null | undefined, fieldValue?: string | null): Promise<string> {
  if (!fieldValue) return Promise.resolve('');
  if (fieldValue.startsWith('data:')) return Promise.resolve(fieldValue);
  if (!resumeId || !isPhotoObjectKey(fieldValue)) return Promise.resolve('');

  const cacheKey = `${resumeId}|${fieldValue}`;
  let cached = urlCache.get(cacheKey);
  if (!cached) {
    cached = fetchResumePhotoBlob(resumeId, fieldValue).then((blob) => URL.createObjectURL(blob));
    // 失败不缓存，下次重试
    cached.catch(() => urlCache.delete(cacheKey));
    urlCache.set(cacheKey, cached);
  }
  return cached;
}

/**
 * 把字段值解析成 data URL（Word 导出要把图片字节内嵌进文档，blob: URL 不行）。
 * 没有照片返回 ''。
 */
export async function resolveResumePhotoDataUrl(resumeId: number | null | undefined, fieldValue?: string | null): Promise<string> {
  if (!fieldValue) return '';
  if (fieldValue.startsWith('data:')) return fieldValue;
  if (!resumeId || !isPhotoObjectKey(fieldValue)) return '';
  try {
    const blob = await fetchResumePhotoBlob(resumeId, fieldValue);
    return await blobToDataUrl(blob);
  } catch {
    // 导出别因为照片取不到而整体失败，降级为无照片
    return '';
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

/** dataURL → Blob（compressImage 产出 dataURL，上传接口要文件） */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const mime = meta.slice(meta.indexOf(':') + 1, meta.indexOf(';'));
  const bytes = atob(dataUrl.slice(comma + 1));
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime || 'image/jpeg' });
}
