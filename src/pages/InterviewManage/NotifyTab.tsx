// 通知中心：一届招新对外发的所有邮件都在这里收口。
//
// 原来只有「结果与通知」一个页面，发的其实只是录取/未录取那一类；
// 简历初筛未通过要去简历页发、面试安排与提醒是系统自动发但看不到发没发。
// 谁收到过什么、还差谁，散在三处，靠人记。这里按通知类型分区列出，
// 每类都给出「应发 / 已发 / 待发」，能补发的直接在本页勾选补发。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Segmented, Space, Table, Tag, Tooltip, message } from 'antd';
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
} from '@/api/manage/interviewAdmin';
import { notifyScreenedOut } from '@/api/manage/resumeEntry';
import './notifyTab.scss';

const fmt = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '');

/** 名单要看全部还是只看已发/未发 */
type Filter = 'all' | 'sent' | 'pending';
/** 当前聚焦哪一类通知 —— 决定下面显示哪份名单 */
type Kind = 'rejected' | 'arranged' | 'eve' | 'day' | 'result';

const KIND_TITLE: Record<Kind, string> = {
  rejected: '简历初筛未通过',
  arranged: '面试安排通知',
  eve: '面试前一天提醒',
  day: '面试当天提醒',
  result: '录取 / 未录取',
};

const DECISION_TAG: Record<number, { text: string; color: string }> = {
  0: { text: '待定', color: 'default' },
  1: { text: '通过', color: 'green' },
  2: { text: '不通过', color: 'red' },
  3: { text: '待调剂', color: 'orange' },
};

/**
 * 一类通知的进度卡。整块可点：点数字那半边看已发，点「待发」看没发的，
 * 点标题看全部——之前卡片只是个只读计数，看到「待发 6」也没有去处，
 * 还得自己去别的页翻名单。
 */
const BucketCard: React.FC<{
  title: string;
  desc: string;
  bucket?: NotificationBucket;
  auto?: boolean;
  active?: boolean;
  activeFilter?: Filter;
  onPick: (filter: Filter) => void;
}> = ({ title, desc, bucket, auto, active, activeFilter, onPick }) => {
  const total = bucket?.total ?? 0;
  const sent = bucket?.sent ?? 0;
  const pending = bucket?.pending ?? 0;
  return (
    <Card
      size="small"
      hoverable
      className={`notify-card${active ? ' is-active' : ''}`}
      styles={{ body: { padding: 12 } }}
      onClick={() => onPick('all')}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {title}
        {auto && <Tooltip title="由系统定时发送，无需手动操作"><Tag style={{ marginLeft: 6 }}>自动</Tag></Tooltip>}
      </div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{desc}</div>
      <Space size={4} wrap>
        <Tag
          color={active && activeFilter === 'sent' ? 'blue' : undefined}
          style={{ cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
          onClick={(e) => { e.stopPropagation(); onPick('sent'); }}
        >
          已发 {sent} / {total}
        </Tag>
        {pending > 0 && (
          <Tag
            color={active && activeFilter === 'pending' ? 'orange' : 'warning'}
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onPick('pending'); }}
          >
            待发 {pending}
          </Tag>
        )}
      </Space>
    </Card>
  );
};

const NotifyTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
  const [overview, setOverview] = useState<NotificationOverview | null>(null);
  const [results, setResults] = useState<InterviewResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 聚焦到哪一类通知、只看哪一档。默认落在初筛未通过：
  // 它是唯一需要人工判断该不该发的一类
  const [kind, setKind] = useState<Kind>('rejected');
  const [filter, setFilter] = useState<Filter>('all');

  const [screenSel, setScreenSel] = useState<number[]>([]);
  const [screenOpen, setScreenOpen] = useState(false);
  const [screenMsg, setScreenMsg] = useState('');
  const [screenSending, setScreenSending] = useState(false);

  const [resultSel, setResultSel] = useState<number[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [resultSending, setResultSending] = useState(false);

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
  const decided = useMemo(() => results.filter((r) => r.decision != null && r.decision !== 0), [results]);

  const pick = (k: Kind, f: Filter) => {
    setKind(k);
    setFilter(f);
    // 换了名单就清掉勾选：上一份名单的勾选留着，发送时会发给一批看不见的人
    setScreenSel([]);
    setResultSel([]);
  };

  /** 某行在当前这类通知下算不算「已发」 */
  const flagOf = (r: ScheduleNoticeItem, k: Kind) =>
    (k === 'eve' ? r.eve : k === 'day' ? r.day : r.arranged);

  const keep = (sent: boolean) => filter === 'all' || (filter === 'sent' ? sent : !sent);

  const visibleScreened = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => screenedOut.filter((i) => keep(!!i.notifiedAt)), [screenedOut, filter]);
  const visibleDecided = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => decided.filter((r) => keep(!!r.notifiedAt)), [decided, filter]);
  const visibleSchedules = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => scheduleRows.filter((r) => keep(flagOf(r, kind))), [scheduleRows, kind, filter]);

  /** 当前这一类的三个计数，给标题上的分段器用 */
  const counts = useMemo(() => {
    const b = kind === 'rejected' ? overview?.resumeRejected
      : kind === 'arranged' ? overview?.interviewArranged
        : kind === 'eve' ? overview?.eveReminder
          : kind === 'day' ? overview?.dayReminder
            : overview?.result;
    return { total: b?.total ?? 0, sent: b?.sent ?? 0, pending: b?.pending ?? 0 };
  }, [overview, kind]);

  const sentTag = (sent: boolean, at?: string | null) => (sent
    ? (at
      ? <Tooltip title={`发送于 ${fmt(at)}`}><Tag color="green">已发送</Tag></Tooltip>
      : <Tag color="green">已发送</Tag>)
    : <Tag color="orange">未发送</Tag>);

  /** 筛选后为空和本来就没有人，是两回事 */
  const emptyText = (whenNoData: string) => (
    counts.total === 0 ? whenNoData
      : filter === 'sent' ? '这一类还没有发送记录'
        : filter === 'pending' ? '都发过了，没有待发的' : whenNoData);

  const doNotifyScreened = async () => {
    setScreenSending(true);
    try {
      const res: any = await notifyScreenedOut(screenSel, screenMsg.trim() || undefined);
      const d = res?.data ?? {};
      const skipped = d.skipped?.length ?? 0;
      // 这一步只是入队，邮件由 MQ 消费者实际发出，「已通知」状态要几秒后才会变
      message.success(`已提交 ${d.queued ?? screenSel.length} 封初筛未通过通知`
        + (skipped > 0 ? `，跳过 ${skipped} 人（状态已不是未通过）` : '')
        + '，稍后刷新查看发送状态');
      setScreenOpen(false);
      setScreenSel([]);
      load();
    } catch (e: any) {
      message.error(e?.message || '发送失败');
    } finally {
      setScreenSending(false);
    }
  };

  const doNotifyResults = async () => {
    setResultSending(true);
    try {
      const res: any = await sendResultNotifications({
        resultIds: resultSel,
        notificationType: 'email',
        customMessage: resultMsg.trim() || undefined,
      });
      const d = res?.data ?? {};
      if ((d.failedCount ?? 0) > 0) {
        message.warning(`发送完成：成功 ${d.sentCount ?? 0}，失败 ${d.failedCount}`);
      } else {
        message.success(`已发送 ${d.sentCount ?? resultSel.length} 封结果通知`);
      }
      setResultOpen(false);
      setResultSel([]);
      load();
    } catch (e: any) {
      message.error(e?.message || '发送失败');
    } finally {
      setResultSending(false);
    }
  };

  const resentCount = (ids: number[], sentIds: Set<number>) => ids.filter((i) => sentIds.has(i)).length;
  const screenSentIds = new Set(screenedOut.filter((i) => i.notifiedAt).map((i) => i.resumeId));
  const resultSentIds = new Set(decided.filter((r) => r.notifiedAt).map((r) => r.resultId));

  return (
    <>
      <PageHint style={{ marginBottom: 12 }}>
        对外邮件都在这里发与查。点上方任意一张卡片看对应名单，点「已发 / 待发」直接筛。
        提醒类由系统定时发送，其余按名单勾选；已通知过的再发一次是重发。
      </PageHint>

      <Space wrap size={12} style={{ marginBottom: 16 }} align="start">
        <BucketCard title={KIND_TITLE.rejected} desc="初筛出结论后手动发"
                    bucket={overview?.resumeRejected}
                    active={kind === 'rejected'} activeFilter={filter}
                    onPick={(f) => pick('rejected', f)} />
        <BucketCard title={KIND_TITLE.arranged} desc="排上场次后发出"
                    bucket={overview?.interviewArranged}
                    active={kind === 'arranged'} activeFilter={filter}
                    onPick={(f) => pick('arranged', f)} />
        <BucketCard title={KIND_TITLE.eve} desc="前一天 12:00" auto
                    bucket={overview?.eveReminder}
                    active={kind === 'eve'} activeFilter={filter}
                    onPick={(f) => pick('eve', f)} />
        <BucketCard title={KIND_TITLE.day} desc="当天 08:00" auto
                    bucket={overview?.dayReminder}
                    active={kind === 'day'} activeFilter={filter}
                    onPick={(f) => pick('day', f)} />
        <BucketCard title={KIND_TITLE.result} desc="录入决定后手动发"
                    bucket={overview?.result}
                    active={kind === 'result'} activeFilter={filter}
                    onPick={(f) => pick('result', f)} />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ marginTop: 28 }}>
          刷新
        </Button>
      </Space>

      <Card
        size="small"
        title={(
          <Space>
            <span>{KIND_TITLE[kind]}</span>
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
          </Space>
        )}
        style={{ marginBottom: 16 }}
        extra={kind === 'rejected' ? (
          <Button
            type="primary"
            disabled={screenSel.length === 0}
            onClick={() => {
              setScreenMsg('');
              const again = resentCount(screenSel, screenSentIds);
              if (again > 0) message.info(`所选名单中 ${again} 人此前已通知过，本次为重发`);
              setScreenOpen(true);
            }}
          >
            发送通知（已选 {screenSel.length}）
          </Button>
        ) : kind === 'result' ? (
          <Button
            type="primary"
            disabled={resultSel.length === 0}
            onClick={() => {
              setResultMsg('');
              const again = resentCount(resultSel, resultSentIds);
              if (again > 0) message.info(`所选名单中 ${again} 人此前已通知过，本次为重发`);
              setResultOpen(true);
            }}
          >
            发送通知（已选 {resultSel.length}）
          </Button>
        ) : (
          <Tooltip title="排上场次时自动发出，提醒按面试时间定时发送，不需要手动操作">
            <Tag>系统自动发送</Tag>
          </Tooltip>
        )}
      >
        {kind === 'result' && results.length > decided.length && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`另有 ${results.length - decided.length} 人还没录入录取决定，到「录取结果」页处理后才会出现在这里`}
          />
        )}

        {kind === 'rejected' && (
          <Table
            rowKey="resumeId"
            size="small"
            loading={loading}
            dataSource={visibleScreened}
            pagination={visibleScreened.length > 20 ? { pageSize: 20, showTotal: (t) => `共 ${t} 人` } : false}
            locale={{ emptyText: emptyText('本周期还没有被标记为初筛未通过的简历') }}
            rowSelection={{ selectedRowKeys: screenSel, onChange: (k) => setScreenSel(k as number[]) }}
            columns={[
              { title: '姓名', dataIndex: 'name', width: 110, render: (v: string, r: ScreenedOutItem) => v || `用户#${r.userId}` },
              { title: '学号', dataIndex: 'studentId', width: 140, render: (v: string) => v || '-' },
              { title: '邮箱', dataIndex: 'email', ellipsis: true, render: (v: string) => v || <Tag color="warning">缺邮箱</Tag> },
              {
                title: '简历分', dataIndex: 'resumeScore', width: 90, align: 'right' as const,
                // null 是「没打过分」，0 分才是初筛不通过的依据，两者不能混
                render: (v: number | null) => (v == null ? <span style={{ color: '#bbb' }}>未打分</span> : v),
              },
              {
                title: '通知状态', dataIndex: 'notifiedAt', width: 150,
                render: (v: string | null) => sentTag(!!v, v),
              },
            ] as any}
          />
        )}

        {kind === 'result' && (
          <Table
            rowKey="resultId"
            size="small"
            loading={loading}
            dataSource={visibleDecided}
            pagination={visibleDecided.length > 20 ? { pageSize: 20, showTotal: (t) => `共 ${t} 人` } : false}
            locale={{ emptyText: emptyText('还没有人录入录取决定') }}
            rowSelection={{ selectedRowKeys: resultSel, onChange: (k) => setResultSel(k as number[]) }}
            columns={[
              {
                title: '姓名', dataIndex: 'userName', width: 110,
                render: (v: string, r: InterviewResultItem) => v || `用户#${r.userId}`,
              },
              {
                title: '结果', dataIndex: 'decision', width: 100,
                render: (d: number) => <Tag color={DECISION_TAG[d]?.color}>{DECISION_TAG[d]?.text ?? d}</Tag>,
              },
              { title: '录取部门', dataIndex: 'departmentName', width: 120, render: (v: string) => v || '-' },
              {
                title: '志愿', dataIndex: 'firstDeptName', width: 150,
                render: (_: unknown, r: InterviewResultItem) => (r.firstDeptName
                  ? <span>{r.firstDeptName}{r.secondDeptName ? ` / ${r.secondDeptName}` : ''}</span>
                  : <span style={{ color: '#bbb' }}>—</span>),
              },
              {
                title: '通知状态', dataIndex: 'notifiedAt', width: 150,
                render: (v: string) => sentTag(!!v, v),
              },
            ] as any}
          />
        )}

        {/* 三类挂在面试安排上的通知共用一张名单，只是「已发」看的列不同。
            提醒虽然是系统发的，但发没发必须逐人看得见——手动改过时间后
            提醒没重发这种事，只看总数是发现不了的 */}
        {(kind === 'arranged' || kind === 'eve' || kind === 'day') && (
          <Table
            rowKey="scheduleId"
            size="small"
            loading={loading}
            dataSource={visibleSchedules}
            pagination={visibleSchedules.length > 20 ? { pageSize: 20, showTotal: (t) => `共 ${t} 人` } : false}
            locale={{ emptyText: emptyText('本周期还没有面试安排 —— 先到「分配与调剂」一键分配') }}
            columns={[
              {
                title: '面试时间', dataIndex: 'interviewTime', width: 140,
                render: (v: string) => (v ? fmt(v).slice(5) : '-'),
              },
              { title: '姓名', dataIndex: 'name', width: 110, render: (v: string, r: ScheduleNoticeItem) => v || `用户#${r.userId}` },
              { title: '学号', dataIndex: 'studentId', width: 140, render: (v: string) => v || '-' },
              { title: '部门', dataIndex: 'deptName', width: 100, render: (v: string) => v || '-' },
              { title: '地点', dataIndex: 'location', ellipsis: true, render: (v: string) => v || '-' },
              {
                title: '本类通知', width: 120,
                render: (_: unknown, r: ScheduleNoticeItem) => sentTag(flagOf(r, kind)),
              },
              {
                // 三类一起列出来：管理员多半是想确认「这个人该收到的都收到了没」
                title: '安排 / 前一天 / 当天', width: 190,
                render: (_: unknown, r: ScheduleNoticeItem) => (
                  <Space size={4}>
                    <Tag color={r.arranged ? 'green' : undefined}>安排</Tag>
                    <Tag color={r.eve ? 'green' : undefined}>前一天</Tag>
                    <Tag color={r.day ? 'green' : undefined}>当天</Tag>
                  </Space>
                ),
              },
            ] as any}
          />
        )}
      </Card>

      <Modal
        title={`向 ${screenSel.length} 人发送「简历初筛未通过」通知`}
        open={screenOpen}
        confirmLoading={screenSending}
        okText="确认发送"
        onOk={doNotifyScreened}
        onCancel={() => setScreenOpen(false)}
      >
        <p style={{ color: '#888', marginTop: 0 }}>
          邮件正文用统一模板。下面填的内容会附在模板正文之后，作为「社团补充说明」，不会替换原文。
        </p>
        <Input.TextArea
          rows={4}
          maxLength={500}
          showCount
          placeholder="选填，例如：欢迎关注下学期的招新"
          value={screenMsg}
          onChange={(e) => setScreenMsg(e.target.value)}
        />
      </Modal>

      <Modal
        title={`向 ${resultSel.length} 人发送录取 / 未录取通知`}
        open={resultOpen}
        confirmLoading={resultSending}
        okText="确认发送"
        onOk={doNotifyResults}
        onCancel={() => setResultOpen(false)}
      >
        <p style={{ color: '#888', marginTop: 0 }}>
          按每个人的结果自动选用录取信或感谢信。下面填的内容会附在模板正文之后，不会替换原文。
        </p>
        <Input.TextArea
          rows={4}
          maxLength={500}
          showCount
          placeholder="选填，例如：请于本周五前加入新社员群"
          value={resultMsg}
          onChange={(e) => setResultMsg(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default NotifyTab;
