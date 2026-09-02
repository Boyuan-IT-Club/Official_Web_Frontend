// 活动图文详情页：/Activities/:id，公开访问。
// 正文是管理端富文本编辑器的产出，服务端入库前已按白名单消毒；
// 这里再过一遍 DOMPurify 才交给 dangerouslySetInnerHTML——双保险，
// 万一有老数据绕过了服务端消毒（或未来接口被误改），展示端也不放行脚本。
import { safeBack } from '@/utils/safeBack';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { getActivity, Activity } from '@/api/manage/activityApis';
import './index.scss';

const ActivityDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activityId = Number(id);
    if (!Number.isFinite(activityId)) {
      setError('链接不完整');
      return undefined;
    }
    let cancelled = false;
    getActivity(activityId)
      .then((res: any) => { if (!cancelled) setActivity(res?.data ?? null); })
      .catch((e: any) => { if (!cancelled) setError(e?.message || '活动不存在或已删除'); });
    return () => { cancelled = true; };
  }, [id]);

  const timeText = activity?.startTime
    ? `${activity.startTime}${activity.endTime && activity.endTime !== activity.startTime ? ` ~ ${activity.endTime}` : ''}`
    : '时间待定';

  const detailHtml = activity?.detailContent
    ? DOMPurify.sanitize(activity.detailContent)
    : '';

  return (
    <div className="activity-detail-wrapper">
      <div className="activity-detail-container">
        <header className="detail-header">
          {/* 用 safeBack 而不是 navigate('/Activities')：后者是 push，
              会把「列表」再压一条进历史，和列表页的 navigate(-1) 形成来回打转
              （列表→详情→返回→在列表点返回又回到详情）。 */}
          <button className="back-btn" onClick={() => safeBack(navigate, '/Activities')}>← 返回活动列表</button>
        </header>

        {error && <div className="detail-empty">{error} 🎈</div>}
        {!error && !activity && <div className="detail-empty">加载中…</div>}

        {activity && (
          <article>
            <h1 className="detail-title">
              {activity.title}
              {activity.category && <span className="detail-category">{activity.category}</span>}
            </h1>
            <div className="detail-meta">
              <span>⏰ {timeText}</span>
              <span>📍 {activity.location || '地点待定'}</span>
              {activity.maxParticipants ? (
                <span>👥 {activity.currentParticipants ?? 0}/{activity.maxParticipants}</span>
              ) : null}
            </div>

            {activity.coverImage && (
              <img className="detail-cover" src={activity.coverImage} alt={activity.title} />
            )}

            {detailHtml ? (
              // 内容来自服务端白名单消毒 + 上方 DOMPurify 双重过滤
              // eslint-disable-next-line react/no-danger
              <div className="detail-rich-content" dangerouslySetInnerHTML={{ __html: detailHtml }} />
            ) : (
              <p className="detail-plain">{activity.description || '这个活动还没有更多介绍～'}</p>
            )}
          </article>
        )}
      </div>
    </div>
  );
};

export default ActivityDetail;
