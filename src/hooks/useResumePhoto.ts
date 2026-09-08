// 把 personal_photo 字段值变成可渲染的图片 URL。
//
// 兼容两种形态：历史 base64（直接返回）与 COS objectKey（带鉴权取 blob，
// 模块级缓存，列表页几十张卡片不会重复请求）。没有照片返回 ''。
import { useEffect, useState } from 'react';
import { resolveResumePhotoUrl } from '@/api/resumePhoto';

export function useResumePhoto(
  resumeId?: number | string | null,
  fieldValue?: string | null,
): string {
  // base64 同步可用，首帧就渲染，避免旧数据闪一下占位图
  const [url, setUrl] = useState<string>(() =>
    (fieldValue && fieldValue.startsWith('data:') ? fieldValue : ''));

  useEffect(() => {
    let alive = true;
    const id = resumeId == null ? null : Number(resumeId);
    resolveResumePhotoUrl(id, fieldValue)
      .then((u) => { if (alive) setUrl(u); })
      .catch(() => { if (alive) setUrl(''); });
    return () => { alive = false; };
  }, [resumeId, fieldValue]);

  return url;
}

export default useResumePhoto;
