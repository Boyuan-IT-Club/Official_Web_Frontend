// 通知中心：一届招新对外发的所有邮件都在这里收口。
//
// 原来只有「结果与通知」一个页面，发的其实只是录取/未录取那一类；
// 简历初筛未通过要去简历页发、面试安排与提醒是系统自动发但看不到发没发。
// 谁收到过什么、还差谁，散在三处，靠人记。
//
// 交互按实际用法定：五张卡各是一类通知，点开是一个弹窗——里面有这一类
// 该发多少人、谁发过谁没发过，可以直接勾人补发。第一版做成卡片下方就地
// 筛选的长列表，管理员反馈「点不动、也看不出谁通知过」，于是改成弹窗。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Segmented, Space, Table, Tag, Tooltip, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import PageHint from '@/components/PageHint';
import {
  InterviewResultItem,
  NotificationBucket,
  NotificationOverview,
  ScheduleNoticeItem,
  ScreenedOutItem,
  getNotificationOverview,
  listResults,
  sendResultNotifications,
  sendScheduleNotices,
} from '@/api/manage/interviewAdmin';
import { notifyScreenedOut } from '@/api/manage/resumeEntry';
import './notifyTab.scss';

const fmt = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '');

/** 五类通知 */
type Kind = 'rejected' | 'arranged' | 'eve' | 'day' | 'result';
/** 名单看全部还是只看已发/未发 */
type Filter = 'all' | 'sent' | 'pending';

interface KindMeta {
  title: string;
  desc: string;
  /** 系统定时发送的，手动只用于补发 */
  auto?: boolean;
  /** 弹窗里对「这一类该发给谁」的一句话解释 */
  scope: string;
}

const KINDS: Record<Kind, KindMeta> = {
  rejected: {
    title: '简历初筛未通过', desc: '初筛出结论后手动发',
    scope: '本周期被标记为「未通过初筛」的同学',
  },
  arranged: {
    title: '面试安排通知', desc: '排上场次后发出',
    scope: '本周期已排上面试的同学',
  },
  eve: {
    title: '面试前一天提醒', desc: '前一天 12:00', auto: true,
    scope: '本周期已排上面试的同学；系统在面试前一天中午自动发',
  },
  day: {
    title: '面试当天提醒', desc: '当天 08:00', auto: true,
    scope: '本周期已排上面试的同学；系统在面试当天早上自动发',
  },
  result: {
    title: '录取 / 未录取', desc: '录入决定后手动发',
    scope: '已录入录取或未录取决定的同学（「待定」不发）',
  },
};

const SCHEDULE_KINDS: Record<string, 'BOOKING_SUCCESS' | 'EVE_REMINDER' | 'DAY_REMINDER'> = {
  arranged: 'BOOKING_SUCCESS', eve: 'EVE_REMINDER', day: 'DAY_REMINDER',
};

const DECISION_TAG: Record<number, { text: string; color: string }> = {
  0: { text: '待定', color: 'default' },
  1: { text: '通过', color: 'green' },
  2: { text: '不通过', color: 'red' },
  3: { text: '待调剂', color: 'orange' },
};

const sentTag = (sent: boolean, at?: string | null) => (sent
  ? (at
    ? <Tooltip title={`发送于 ${fmt(at)}`}><Tag color="green">已发送</Tag></Tooltip>
    : <Tag color="green">已发送</Tag>)
  : <Tag color="orange">未发送</Tag>);

/** 一类通知的进度卡。整块可点，点开是这一类的名单弹窗 */
const BucketCard: React.FC<{
  meta: KindMeta;
  bucket?: NotificationBucket;
  onOpen: () => void;
}> = ({ meta, bucket, onOpen }) => {
  const total = bucket?.total ?? 0;
  const sent = bucket?.sent ?? 0;
  const pending = bucket?.pending ?? 0;
  return (
    <Card size="small" hoverable className="notify-card" onClick={onOpen}
          styles={{ body: { padding: 12 } }}>
      <div className="notify-card__title">
        {meta.title}
        {meta.auto && (
          <Tooltip title="系统定时发送，手动只用于补发漏掉的人">
            <Tag style={{ marginLeft: 6 }}>自动</Tag>
          </Tooltip>
        )}
      </div>
      <div className="notify-card__desc">{meta.desc}</div>
      <div className="notify-card__stat">
        <span className="notify-card__num">{sent}</span>
        <span className="notify-card__total">/ {total} 已发</span>
        {pending > 0 && <Tag color="warning">待发 {pending}</Tag>}
      </div>
      <div className="notify-card__more">点击查看名单 →</div>
    </Card>
  );
};

const NotifyTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
  const [overview, setOverview] = useState<NotificationOverview | null>(null);
  const [results, setResults] = useState<InterviewResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  /** 打开的是哪一类；null = 没开弹窗 */
  const [openKind, setOpenKind] = useState<Kind | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, r]: any[] = await Promise.all([
        getNotificationOverview(cycleId),
        listResults({ cycleId, page: 1, size: 500 }).catch(() => null),
      ]);
      setOverview(o?.data ?? null);
      setResults(r?.data?.interviewResults ?? []);
    } catch (e: any) {
      message.error(e?.message || '加载通知总览失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const screenedOut = overview?.screenedOut ?? [];
  const scheduleRows = overview?.schedules ?? [];
  // 只有已录入决定的人才该收到结果通知，「待定」发出去等于乱通知
  const decided = useMemo(
    () => results.filter((r) => r.decision != null && r.decision !== 0), [results]);

  const bucketOf = (k: Kind) => (k === 'rejected' ? overview?.resumeRejected
    : k === 'arranged' ? overview?.interviewArranged
      : k === 'eve' ? overview?.eveReminder
        : k === 'day' ? overview?.dayReminder
          : overview?.result);

  /** 某条面试安排在这一类通知下发没发 */
  const scheduleSent = (r: ScheduleNoticeItem, k: Kind) =>
    (k === 'eve' ? r.eve : k === 'day' ? r.day : r.arranged);

  /** 弹窗里的行：统一成 {key, sent} 以便共用筛选与勾选逻辑 */
  const rows = useMemo(() => {
    if (!openKind) return [] as Array<{ key: number; sent: boolean; raw: any }>;
    if (openKind === 'rejected') {
      return screenedOut.map((i) => ({ key: i.resumeId, sent: !!i.notifiedAt, raw: i }));
    }
    if (openKind === 'result') {
      return decided.map((r) => ({ key: r.resultId, sent: !!r.notifiedAt, raw: r }));
    }
    return scheduleRows.map((r) => ({
      key: r.scheduleId, sent: scheduleSent(r, openKind), raw: r,
    }));
  }, [openKind, screenedOut, decided, scheduleRows]);

  const visible = useMemo(
    () => rows.filter((r) => filter === 'all' || (filter === 'sent' ? r.sent : !r.sent)),
    [rows, filter]);

  const counts = useMemo(() => {
    const sent = rows.filter((r) => r.sent).length;
    return { total: rows.length, sent, pending: rows.length - sent };
  }, [rows]);

  const openModal = (k: Kind) => {
    setOpenKind(k);
    setCustomMsg('');
    // 默认落在「未发」并把他们全勾上：打开这个弹窗多半就是来补发的
    setFilter('pending');
    const pending = (k === 'rejected'
      ? screenedOut.filter((i) => !i.notifiedAt).map((i) => i.resumeId)
      : k === 'result'
        ? decided.filter((r) => !r.notifiedAt).map((r) => r.resultId)
        : scheduleRows.filter((r) => !scheduleSent(r, k)).map((r) => r.scheduleId));
    setSelected(pending);
  };

  const doSend = async () => {
    if (!openKind || selected.length === 0) return;
    setSending(true);
    try {
      const ids = selected.map(Number);
      if (openKind === 'rejected') {
        const res: any = await notifyScreenedOut(ids, customMsg.trim() || undefined);
        const d = res?.data ?? {};
        const skipped = d.skipped?.length ?? 0;
        // 这一步只是入队，邮件由 MQ 消费者实际发出，「已发送」几秒后才会变
        message.success(`已提交 ${d.queued ?? ids.length} 封通知`
          + (skipped > 0 ? `，跳过 ${skipped} 人（状态已不是未通过）` : '')
          + '，稍后刷新查看发送状态');
      } else if (openKind === 'result') {
        const res: any = await sendResultNotifications({
          resultIds: ids, notificationType: 'email',
          customMessage: customMsg.trim() || undefined,
        });
        const d = res?.data ?? {};
        if ((d.failedCount ?? 0) > 0) {
          message.warning(`发送完成：成功 ${d.sentCount ?? 0}，失败 ${d.failedCount}`);
        } else {
          message.success(`已发送 ${d.sentCount ?? ids.length} 封结果通知`);
        }
      } else {
        const res: any = await sendScheduleNotices(cycleId, SCHEDULE_KINDS[openKind], ids);
        const d = res?.data ?? {};
        const skipped = d.skipped?.length ?? 0;
        message.success(`已提交 ${d.queued ?? 0} 封通知`
          + (skipped > 0 ? `，跳过 ${skipped} 人（此前已发过或不在本周期）` : '')
          + '，稍后刷新查看发送状态');
      }
      setOpenKind(null);
      setSelected([]);
      load();
    } catch (e: any) {
      message.error(e?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const columns = useMemo(() => {
    if (openKind === 'rejected') {
      return [
        { title: '姓名', dataIndex: ['raw', 'name'], width: 110,
          render: (_: unknown, r: any) => r.raw.name || `用户#${r.raw.userId}` },
        { title: '学号', dataIndex: ['raw', 'studentId'], width: 140,
          render: (_: unknown, r: any) => r.raw.studentId || '-' },
        { title: '邮箱', dataIndex: ['raw', 'email'], ellipsis: true,
          render: (_: unknown, r: any) => r.raw.email || <Tag color="warning">缺邮箱</Tag> },
        { title: '简历分', width: 90, align: 'right' as const,
          // null 是「没打过分」，0 分才是初筛不通过的依据，两者不能混
          render: (_: unknown, r: any) => (r.raw.resumeScore == null
            ? <span style={{ color: '#bbb' }}>未打分</span> : r.raw.resumeScore) },
        { title: '通知状态', width: 140,
          render: (_: unknown, r: any) => sentTag(r.sent, r.raw.notifiedAt) },
      ];
    }
    if (openKind === 'result') {
      return [
        { title: '姓名', width: 110,
          render: (_: unknown, r: any) => r.raw.userName || `用户#${r.raw.userId}` },
        { title: '结果', width: 100,
          render: (_: unknown, r: any) => (
            <Tag color={DECISION_TAG[r.raw.decision]?.color}>
              {DECISION_TAG[r.raw.decision]?.text ?? r.raw.decision}
            </Tag>) },
        { title: '录取部门', width: 120,
          render: (_: unknown, r: any) => r.raw.departmentName || '-' },
        { title: '志愿', width: 150,
          render: (_: unknown, r: any) => (r.raw.firstDeptName
            ? <span>{r.raw.firstDeptName}{r.raw.secondDeptName ? ` / ${r.raw.secondDeptName}` : ''}</span>
            : <span style={{ color: '#bbb' }}>—</span>) },
        { title: '通知状态', width: 140,
          render: (_: unknown, r: any) => sentTag(r.sent, r.raw.notifiedAt) },
      ];
    }
    return [
      { title: '面试时间', width: 140,
        render: (_: unknown, r: any) => (r.raw.interviewTime ? fmt(r.raw.interviewTime).slice(5) : '-') },
      { title: '姓名', width: 110,
        render: (_: unknown, r: any) => r.raw.name || `用户#${r.raw.userId}` },
      { title: '学号', width: 140, render: (_: unknown, r: any) => r.raw.studentId || '-' },
      { title: '部门', width: 100, render: (_: unknown, r: any) => r.raw.deptName || '-' },
      { title: '地点', ellipsis: true, render: (_: unknown, r: any) => r.raw.location || '-' },
      { title: '本类通知', width: 130, render: (_: unknown, r: any) => sentTag(r.sent) },
      {
        // 三类一起列出来：管理员多半是想确认「这个人该收到的都收到了没」
        title: '安排 / 前一天 / 当天', width: 200,
        render: (_: unknown, r: any) => (
          <Space size={4}>
            <Tag color={r.raw.arranged ? 'green' : undefined}>安排</Tag>
            <Tag color={r.raw.eve ? 'green' : undefined}>前一天</Tag>
            <Tag color={r.raw.day ? 'green' : undefined}>当天</Tag>
          </Space>),
      },
    ];
  }, [openKind]);

  const meta = openKind ? KINDS[openKind] : null;
  const canCustomize = openKind === 'rejected' || openKind === 'result';

  return (
    <>
      <PageHint style={{ marginBottom: 12 }}>
        对外邮件都在这里发与查。点任意一张卡片，能看到这一类该发给谁、谁已经发过，并直接补发。
      </PageHint>

      <Space wrap size={12} align="start" style={{ marginBottom: 8 }}>
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <BucketCard key={k} meta={KINDS[k]} bucket={bucketOf(k)} onOpen={() => openModal(k)} />
        ))}
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ marginTop: 34 }}>
          刷新
        </Button>
      </Space>

      <Modal
        open={!!openKind}
        onCancel={() => setOpenKind(null)}
        width={960}
        title={meta ? `${meta.title} · 名单` : ''}
        footer={(
          <Space>
            <span style={{ color: '#999', fontSize: 12 }}>已选 {selected.length} 人</span>
            <Button onClick={() => setOpenKind(null)}>关闭</Button>
            <Button type="primary" loading={sending} disabled={selected.length === 0} onClick={doSend}>
              发送通知
            </Button>
          </Space>
        )}
      >
        {meta && (
          <>
            <p className="notify-modal__scope">
              {meta.scope}。共 <b>{counts.total}</b> 人，已发 <b>{counts.sent}</b>，未发 <b>{counts.pending}</b>。
              {meta.auto && '这一类由系统定时发送，手动发只用于补发漏掉的人。'}
              已发过的再发一次会被跳过，不会重复打扰。
            </p>

            <Space wrap style={{ marginBottom: 10 }}>
              <Segmented
                size="small"
                value={filter}
                onChange={(v) => setFilter(v as Filter)}
                options={[
                  { label: `全部 ${counts.total}`, value: 'all' },
                  { label: `已发 ${counts.sent}`, value: 'sent' },
                  { label: `未发 ${counts.pending}`, value: 'pending' },
                ]}
              />
              <Button size="small" onClick={() => setSelected(visible.map((r) => r.key))}>
                全选当前 {visible.length} 人
              </Button>
              <Button size="small" onClick={() => setSelected([])}>清空勾选</Button>
            </Space>

            <Table
              rowKey="key"
              size="small"
              loading={loading}
              dataSource={visible}
              pagination={visible.length > 15 ? { pageSize: 15, showTotal: (t) => `共 ${t} 人` } : false}
              scroll={{ y: 380 }}
              locale={{
                emptyText: counts.total === 0
                  ? '这一类现在没有人需要通知'
                  : filter === 'sent' ? '还没有发送记录' : '都发过了，没有待发的',
              }}
              rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
              columns={columns as any}
            />

            {canCustomize && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                  补充说明（选填）——会附在模板正文之后，不会替换原文
                </div>
                <Input.TextArea
                  rows={3}
                  maxLength={500}
                  showCount
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder={openKind === 'rejected'
                    ? '例如：欢迎关注下学期的招新'
                    : '例如：请于本周五前加入新社员群'}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default NotifyTab;
