// 反馈截图缩略图组。
//
// 截图要带 Authorization 才取得到，所以不能把接口地址直接塞进 <img src>——
// 那样的请求不带头，一律 401。与简历照片同一套打法：先取 blob 再渲染，
// 卸载时释放对象 URL，免得翻几页就攒一堆没人回收的 blob。
import React, { useEffect, useState } from 'react';
import { Image, Space, Spin } from 'antd';
import { fetchFeedbackImage } from '@/api/feedback';

const FeedbackImages: React.FC<{ feedbackId: number; count: number }> = ({ feedbackId, count }) => {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!count) { setUrls([]); return undefined; }
    let alive = true;
    const created: string[] = [];
    setLoading(true);
    Promise.all(
      Array.from({ length: count }, (_, i) =>
        fetchFeedbackImage(feedbackId, i).then(
          (u) => { created.push(u); return u; },
          // 单张失败不该让整组空掉：截图可能被删过，其余照常显示
          () => '',
        )),
    ).then((list) => {
      if (alive) setUrls(list.filter(Boolean));
      else created.forEach((u) => URL.revokeObjectURL(u));
    }).finally(() => { if (alive) setLoading(false); });

    return () => {
      alive = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [feedbackId, count]);

  if (!count) return null;
  if (loading && urls.length === 0) return <Spin size="small" />;

  return (
    <Image.PreviewGroup>
      <Space size={8} wrap>
        {urls.map((u) => (
          <Image
            key={u}
            src={u}
            width={84}
            height={84}
            style={{ objectFit: 'cover', borderRadius: 6 }}
          />
        ))}
      </Space>
    </Image.PreviewGroup>
  );
};

export default FeedbackImages;
