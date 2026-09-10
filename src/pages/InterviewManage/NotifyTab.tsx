// 通知中心：一届招新对外发的所有邮件都在这里收口。
//
// 原来只有「结果与通知」一个页面，发的其实只是录取/未录取那一类；
// 简历初筛未通过要去简历页发、面试安排与提醒是系统自动发但看不到发没发。
// 谁收到过什么、还差谁，散在三处，靠人记。这里按通知类型分区列出，
// 每类都给出「应发 / 已发 / 待发」，能补发的直接在本页勾选补发。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, Tooltip, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import PageHint from '@/components/PageHint';
import {
  InterviewResultItem,
  NotificationBucket,
  NotificationOverview,
  ScreenedOutItem,
  getNotificationOverview,
  listResults,
  sendResultNotifications,
} from '@/api/manage/interviewAdmin';
import { notifyScreenedOut } from '@/api/manage/resumeEntry';

const fmt = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '');

const DECISION_TAG: Record<number, { text: string; color: string }> = {
  0: { text: '待定', color: 'default' },
  1: { text: '通过', color: 'green' },
  2: { text: '不通过', color: 'red' },
  3: { text: '待调剂', color: 'orange' },
};

/** 一类通知的进度条目 */
const BucketCard: React.FC<{
  title: string;
  desc: string;
  bucket?: NotificationBucket;
  auto?: boolean;
}> = ({ title, desc, bucket, auto }) => {
  const total = bucket?.total ?? 0;
  const sent = bucket?.sent ?? 0;
  const pending = bucket?.pending ?? 0;
  return (
    <Card size="small" style={{ minWidth: 190 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {title}
        {auto && <Tooltip title="由系统定时发送，无需手动操作"><Tag style={{ marginLeft: 6 }}>自动</Tag></Tooltip>}
      </div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{desc}</div>
      <Space size={4}>
        <span style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{sent}</span>
        <span style={{ color: '#999' }}>/ {total} 已发</span>
      </Space>
      {pending > 0 && <Tag color="orange" style={{ marginLeft: 8 }}>待发 {pending}</Tag>}
    </Card>
  );
};

const NotifyTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
  const [overview, setOverview] = useState<NotificationOverview | null>(null);
  const [results, setResults] = useState<InterviewResultItem[]>([]);
  const [loading, setLoading] = useState(false);

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
  // 只有已录入决定的人才该收到结果通知，「待定」发出去等于乱通知
  const decided = useMemo(() => results.filter((r) => r.decision != null && r.decision !== 0), [results]);

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
        对外邮件都在这里发与查。提醒类由系统定时发送，其余按名单勾选。已通知过的再发一次是重发。
      </PageHint>

      <Space wrap size={12} style={{ marginBottom: 16 }} align="start">
        <BucketCard title="简历初筛未通过" desc="初筛出结论后手动发"
                    bucket={overview?.resumeRejected} />
        <BucketCard title="面试安排通知" desc="排上场次后发出"
                    bucket={overview?.interviewArranged} />
        <BucketCard title="面试前一天提醒" desc="前一天 12:00" auto
                    bucket={overview?.eveReminder} />
        <BucketCard title="面试当天提醒" desc="当天 08:00" auto
                    bucket={overview?.dayReminder} />
        <BucketCard title="录取 / 未录取" desc="录入决定后手动发"
                    bucket={overview?.result} />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ marginTop: 28 }}>
          刷新
        </Button>
      </Space>

      <Card
        size="small"
        title={`简历初筛未通过（${screenedOut.length} 人）`}
        style={{ marginBottom: 16 }}
        extra={(
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
        )}
      >
        <Table
          rowKey="resumeId"
          size="small"
          loading={loading}
          dataSource={screenedOut}
          pagination={screenedOut.length > 20 ? { pageSize: 20, showTotal: (t) => `共 ${t} 人` } : false}
          locale={{ emptyText: '本周期还没有被标记为初筛未通过的简历' }}
          rowSelection={{ selectedRowKeys: screenSel, onChange: (k) => setScreenSel(k as number[]) }}
          columns={[
            { title: '姓名', dataIndex: 'name', width: 110, render: (v: string, r: ScreenedOutItem) => v || `用户#${r.userId}` },
            { title: '学号', dataIndex: 'studentId', width: 140, render: (v: string) => v || '-' },
            { title: '邮箱', dataIndex: 'email', ellipsis: true, render: (v: string) => v || <Tag color="red">缺邮箱</Tag> },
            {
              title: '简历分', dataIndex: 'resumeScore', width: 90, align: 'right' as const,
              // null 是「没打过分」，0 分才是初筛不通过的依据，两者不能混
              render: (v: number | null) => (v == null ? <span style={{ color: '#bbb' }}>未打分</span> : v),
            },
            {
              title: '通知状态', dataIndex: 'notifiedAt', width: 170,
              render: (v: string | null) => (v
                ? <Tooltip title={`发送于 ${fmt(v)}`}><Tag color="green">已通知</Tag></Tooltip>
                : <Tag color="orange">未通知</Tag>),
            },
          ] as any}
        />
      </Card>

      <Card
        size="small"
        title={`录取 / 未录取（${decided.length} 人已录入决定）`}
        style={{ marginBottom: 16 }}
        extra={(
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
        )}
      >
        {results.length > decided.length && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`另有 ${results.length - decided.length} 人还没录入录取决定，到「录取结果」页处理后才会出现在这里`}
          />
        )}
        <Table
          rowKey="resultId"
          size="small"
          loading={loading}
          dataSource={decided}
          pagination={decided.length > 20 ? { pageSize: 20, showTotal: (t) => `共 ${t} 人` } : false}
          locale={{ emptyText: '还没有人录入录取决定' }}
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
              title: '通知状态', dataIndex: 'notifiedAt', width: 170,
              render: (v: string) => (v
                ? <Tooltip title={`发送于 ${fmt(v)}`}><Tag color="green">已通知</Tag></Tooltip>
                : <Tag color="orange">未通知</Tag>),
            },
          ] as any}
        />
      </Card>

      <Card size="small" title="面试安排通知与提醒">
        <p style={{ color: '#888', margin: 0 }}>
          排上场次时系统会自动发出面试安排通知；面试前一天 12:00 与当天 08:00 各发一次提醒，
          都不需要手动操作。手动调整过某人的面试时间后，提醒会按新时间重新发送。
          上方卡片里的数字就是这三类通知的实际送达人数。
        </p>
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
