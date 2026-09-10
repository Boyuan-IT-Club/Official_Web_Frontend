// 面试名单：一屏看完本周期所有场次的安排。
//
// 之前只能在「场次」页逐个点开场次看名单——排了七八个场次就要点七八次，
// 想按姓名找人、想核对某个志愿部门都做不到。这里把全周期拉平成一张表，
// 带搜索与筛选，并把决策时要看的信息（学号、志愿、地点）并进来。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Space, Spin, Table, Tag, Tooltip, Modal, DatePicker, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHint from '@/components/PageHint';
import {
  InterviewSession,
  ScheduleRosterItem,
  listSchedulesRoster,
  listSessions,
  updateScheduleInterviewTime,
} from '@/api/manage/interviewAdmin';
import { getCandidateResume } from '@/api/manage/interviewEvaluation';
import ResumeDetail from '@/pages/Resume/ResumeDetail';
import { request } from '@/utils';

const fmt = (v?: string | null, len = 16) => (v ? String(v).replace('T', ' ').slice(0, len) : '');

/** 导出成 CSV，供线下核对/打印签到表 */
const exportCsv = (rows: ScheduleRosterItem[], cycleId: number) => {
  const head = ['面试时间', '姓名', '学号', '面试部门', '第一志愿', '第二志愿', '地点', '备注'];
  const body = rows.map((r) => [
    fmt(r.interviewTime),
    r.name || r.username || `用户#${r.userId}`,
    r.studentId || r.username || '',
    r.deptName || '',
    r.firstDeptName || '',
    r.secondDeptName || '',
    r.location || '',
    (r.notes || '').replace(/[\r\n]+/g, ' '),
  ]);
  const csv = [head, ...body]
    .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  // BOM：不加的话 Excel 打开是乱码
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `面试名单_周期${cycleId}_${dayjs().format('YYYYMMDD')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const RosterTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
  const [rows, setRows] = useState<ScheduleRosterItem[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [kw, setKw] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  // 志愿部门 + 位次：面试部门筛的是「被排到哪个部门面试」，
  // 志愿筛的是「他自己想去哪」——调剂时看的正是这两者的差
  const [choiceDept, setChoiceDept] = useState<string | undefined>();
  const [choiceRank, setChoiceRank] = useState<'any' | 'first' | 'second'>('any');
  const [sessionFilter, setSessionFilter] = useState<number | undefined>();
  const [timeEditing, setTimeEditing] = useState<ScheduleRosterItem | null>(null);
  const [timeValue, setTimeValue] = useState<any>(null);
  const [timeSaving, setTimeSaving] = useState(false);
  const [resumeDetail, setResumeDetail] = useState<any>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s]: any[] = await Promise.all([
        listSchedulesRoster(cycleId),
        listSessions(cycleId).catch(() => null),
      ]);
      setRows(r?.data ?? []);
      setSessions(s?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || '加载名单失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const openResume = async (r: ScheduleRosterItem) => {
    setResumeDetail(null);
    setResumeOpen(true);
    setResumeLoading(true);
    try {
      const res: any = await getCandidateResume(cycleId, r.scheduleId);
      setResumeDetail(res?.data ?? null);
    } catch (e: any) {
      message.error(e?.message || '加载简历失败');
      setResumeOpen(false);
    } finally {
      setResumeLoading(false);
    }
  };

  const downloadResume = async (resumeId: number) => {
    try {
      const response: any = await request.get(`/api/resumes/export/pdf/${resumeId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const m = String(response.headers?.['content-disposition'] || '').match(/filename="?([^"]+)"?/);
      link.setAttribute('download', m?.[1] || `resume_${resumeId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      message.error(e?.message || '下载失败');
    }
  };

  const deptOptions = useMemo(() => Array.from(
    new Set(rows.map((r) => r.deptName).filter(Boolean) as string[]),
  ).map((d) => ({ value: d, label: d })), [rows]);

  // 志愿候选从名单里现取，不写死四个部门——部门是可以增删的
  const choiceOptions = useMemo(() => Array.from(new Set([
    ...rows.map((r) => r.firstDeptName), ...rows.map((r) => r.secondDeptName),
  ].filter(Boolean) as string[])).map((d) => ({ value: d, label: d })), [rows]);

  const sessionOptions = useMemo(() => sessions.map((s) => ({
    value: s.sessionId,
    label: `#${s.sessionId} ${s.deptName || ''} @${s.location}`,
  })), [sessions]);

  const visible = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return rows.filter((r) => {
      if (sessionFilter != null && r.sessionId !== sessionFilter) return false;
      if (deptFilter && r.deptName !== deptFilter) return false;
      if (choiceDept) {
        const hit = choiceRank === 'first' ? r.firstDeptName === choiceDept
          : choiceRank === 'second' ? r.secondDeptName === choiceDept
            : (r.firstDeptName === choiceDept || r.secondDeptName === choiceDept);
        if (!hit) return false;
      }
      if (!k) return true;
      return [r.name, r.username, r.studentId, r.firstDeptName, r.secondDeptName, r.location]
        .some((v) => String(v ?? '').toLowerCase().includes(k));
    });
  }, [rows, kw, deptFilter, sessionFilter, choiceDept, choiceRank]);

  const filtered = !!(kw.trim() || deptFilter || choiceDept || sessionFilter != null);

  return (
    <>
      <PageHint style={{ marginBottom: 12 }}>
        本周期所有场次的面试安排，按时间排序。改时间后会标记为「手调」，重新分配不再覆盖。
      </PageHint>
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search
          allowClear
          placeholder="搜姓名 / 学号 / 部门 / 地点"
          style={{ width: 240 }}
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <Select
          allowClear
          placeholder="按面试部门"
          style={{ width: 150 }}
          value={deptFilter}
          onChange={setDeptFilter}
          options={deptOptions}
        />
        <Select
          allowClear
          placeholder="按志愿部门"
          style={{ width: 150 }}
          value={choiceDept}
          onChange={(v) => { setChoiceDept(v); if (!v) setChoiceRank('any'); }}
          options={choiceOptions}
        />
        {/* 位次只在选了志愿部门后出现：没选部门时它没有意义 */}
        {choiceDept && (
          <Select
            style={{ width: 116 }}
            value={choiceRank}
            onChange={setChoiceRank}
            options={[
              { value: 'any', label: '不限志愿' },
              { value: 'first', label: '第一志愿' },
              { value: 'second', label: '第二志愿' },
            ]}
          />
        )}
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="按场次"
          style={{ width: 240 }}
          value={sessionFilter}
          onChange={setSessionFilter}
          options={sessionOptions}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
        <Button icon={<DownloadOutlined />} disabled={visible.length === 0}
                onClick={() => exportCsv(visible, cycleId)}>
          导出 CSV
        </Button>
        <Tag>{filtered ? `筛选后 ${visible.length} / ${rows.length} 人` : `共 ${rows.length} 人`}</Tag>
      </Space>

      <Table
        rowKey="scheduleId"
        size="small"
        loading={loading}
        dataSource={visible}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1080 }}
        locale={{ emptyText: rows.length === 0 ? '本周期还没有面试安排 —— 先到「分配与调剂」一键分配' : '没有符合条件的记录' }}
        columns={[
          {
            title: '面试时间', dataIndex: 'interviewTime', width: 160, fixed: 'left' as const,
            sorter: (a: ScheduleRosterItem, b: ScheduleRosterItem) =>
              String(a.interviewTime ?? '').localeCompare(String(b.interviewTime ?? '')),
            defaultSortOrder: 'ascend' as const,
            render: (v: string, r: ScheduleRosterItem) => (
              <span>
                {v ? fmt(v).slice(5) : '-'}
                {r.timeOverridden === 1 && (
                  <Tooltip title="时间已手动调整，自动分配/换场不会覆盖">
                    <Tag color="purple" style={{ marginLeft: 6 }}>手调</Tag>
                  </Tooltip>
                )}
              </span>
            ),
          },
          {
            title: '姓名', dataIndex: 'name', width: 100,
            render: (v: string, r: ScheduleRosterItem) => v || r.username || `用户#${r.userId}`,
          },
          {
            // 学号取简历里填的那个；没填才退回登录名，并标出来免得当成学号
            title: '学号', dataIndex: 'studentId', width: 130,
            render: (v: string | null, r: ScheduleRosterItem) => (v || (
              <Tooltip title="简历里没填学号，这里显示的是登录名">
                <span style={{ color: '#999' }}>{r.username || '-'}</span>
              </Tooltip>
            )),
          },
          { title: '面试部门', dataIndex: 'deptName', width: 100, render: (v: string) => v || '-' },
          {
            title: '志愿', dataIndex: 'firstDeptName', width: 150,
            render: (_: unknown, r: ScheduleRosterItem) => (r.firstDeptName
              ? <span>{r.firstDeptName}{r.secondDeptName ? ` / ${r.secondDeptName}` : ''}</span>
              : <span style={{ color: '#bbb' }}>—</span>),
          },
          { title: '地点', dataIndex: 'location', width: 130, render: (v: string) => v || '-' },
          {
            title: '简历', dataIndex: 'resumeId', width: 70,
            render: (v: number, r: ScheduleRosterItem) => (
              <Button type="link" size="small" onClick={() => openResume(r)}>#{v}</Button>
            ),
          },
          {
            title: '通知', dataIndex: 'notifStatus', width: 80,
            render: (v: number | null) => (v === 1
              ? <Tag color="green">已通知</Tag>
              : <Tag>未通知</Tag>),
          },
          {
            title: '备注', dataIndex: 'notes', ellipsis: { showTitle: false },
            render: (v: string) => <Tooltip title={v} placement="topLeft"><span>{v || '-'}</span></Tooltip>,
          },
          {
            title: '操作', width: 90, fixed: 'right' as const,
            render: (_: unknown, r: ScheduleRosterItem) => (
              <Button type="link" size="small" onClick={() => {
                setTimeEditing(r);
                setTimeValue(r.interviewTime ? dayjs(r.interviewTime) : null);
              }}>调时间</Button>
            ),
          },
        ] as any}
      />

      <Modal
        title={timeEditing
          ? `调整面试时间：${timeEditing.name || timeEditing.username || `用户#${timeEditing.userId}`}`
          : ''}
        open={!!timeEditing}
        confirmLoading={timeSaving}
        okText="保存新时间"
        onCancel={() => setTimeEditing(null)}
        destroyOnClose
        onOk={async () => {
          if (!timeEditing || !timeValue) { message.warning('请选择新的面试时间'); return; }
          setTimeSaving(true);
          try {
            await updateScheduleInterviewTime(
              timeEditing.scheduleId,
              dayjs(timeValue).format('YYYY-MM-DDTHH:mm:00'),
            );
            message.success('时间已调整，记得到「通知」页重新发送面试提醒');
            setTimeEditing(null);
            load();
          } catch (e: any) {
            message.error(e?.message || '调整失败');
          } finally {
            setTimeSaving(false);
          }
        }}
      >
        <p style={{ color: '#888', marginTop: 0 }}>
          调整后该同学的时间被标记为「手调」，自动分配与换场不会再覆盖；提醒邮件需重新发送。
        </p>
        <DatePicker
          showTime={{ format: 'HH:mm', minuteStep: 5 }}
          format="YYYY-MM-DD HH:mm"
          style={{ width: '100%' }}
          value={timeValue}
          onChange={setTimeValue}
        />
      </Modal>

      {resumeOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#f5f5f5', overflow: 'auto' }}>
          {resumeLoading
            ? <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
            : <ResumeDetail resume={resumeDetail} backText="返回名单"
                            onBack={() => setResumeOpen(false)} onDownload={downloadResume} />}
        </div>
      )}
    </>
  );
};

export default RosterTab;
