// 我的申请（申请中心，方案C）：以时间线形式展示完整招新旅程——
// 投递 → 审核 → 面试意向 → 面试安排（含改期申请）→ 面试结果，
// 并提供简历 PDF 下载。数据全部来自真实接口。
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Descriptions, Drawer, Input, Modal, Space, Spin, Tag, Timeline, Typography, message,
} from 'antd';
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleTwoTone, ClockCircleOutlined,
  DownloadOutlined, EyeOutlined, FileTextOutlined, FormOutlined, SmileTwoTone, SwapOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveCycle, fetchMyResumeReadonly } from '@/store/modules/resume';
import InterviewIntentEditor from '@/components/InterviewIntentEditor';
import {
  MyPreference, MySchedule, MyResult, RescheduleRequest, PreferenceTimeSlot,
  getMyPreference, getMySchedule, getMyResult, getMyReschedule,
  submitReschedule, listOpenTimeSlots, exportMyResumePdf,
} from '@/api/interviewPreference';
import { getAllCycles, RecruitmentCycle } from '@/api/manage/cycleApis';
import './index.scss';

const { Title, Text } = Typography;

const RESUME_STATUS_TEXT: Record<number, string> = {
  1: '草稿（尚未提交）', 2: '已提交，等待审核', 3: '审核中', 4: '审核通过', 5: '审核未通过',
};

const fmtDT = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '');

const renderFieldValue = (v?: string | null): React.ReactNode => {
  if (!v) return <span style={{ color: '#bbb' }}>未填写</span>;
  const str = String(v);
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) return arr.join('、');
    } catch { /* 原样展示 */ }
  }
  if (str.startsWith('/uploads') || str.startsWith('http')) {
    return <a href={str.startsWith('/') ? str : str} target="_blank" rel="noreferrer">查看附件</a>;
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{str}</span>;
};

const InterviewAppointment: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  const [searchParams] = useSearchParams();
  // 历史周期查看：个人主页「我的申请」以 ?cycleId= 进入；无参数时用活跃周期
  const paramCycleId = searchParams.get('cycleId');
  const resumeState = useSelector((state: any) => state.resume);
  const resume = resumeState?.resume;
  const cycleId: number = paramCycleId ? Number(paramCycleId) : (resumeState?.cycleId ?? 2);

  const [loading, setLoading] = useState(true);
  const [cycleName, setCycleName] = useState<string>('');
  const [isHistory, setIsHistory] = useState(false);
  const [preference, setPreference] = useState<MyPreference | null>(null);
  const [schedule, setSchedule] = useState<MySchedule | null>(null);
  const [result, setResult] = useState<MyResult | null>(null);
  const [reschedule, setReschedule] = useState<RescheduleRequest | null>(null);

  // 简历查看抽屉
  const [resumeOpen, setResumeOpen] = useState(false);

  // 面试意向编辑
  const [intentOpen, setIntentOpen] = useState(false);

  // 改期弹窗
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedReason, setReschedReason] = useState('');
  const [reschedSlots, setReschedSlots] = useState<number[]>([]);
  const [openSlots, setOpenSlots] = useState<PreferenceTimeSlot[]>([]);
  const [reschedSaving, setReschedSaving] = useState(false);

  const loadAll = useCallback(async (cid: number) => {
    setLoading(true);
    try {
      const [p, s, r, rs]: any[] = await Promise.all([
        getMyPreference(cid).catch(() => null),
        getMySchedule(cid).catch(() => null),
        getMyResult(cid).catch(() => null),
        getMyReschedule(cid).catch(() => null),
      ]);
      setPreference(p?.data ?? null);
      setSchedule(s?.data ?? null);
      setResult(r?.data ?? null);
      setReschedule(rs?.data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      let cid = cycleId;
      let activeCid: number | null = null;
      try {
        activeCid = await dispatch(fetchActiveCycle()).unwrap();
      } catch { /* 回退 */ }
      if (!paramCycleId && activeCid != null) cid = activeCid;
      setIsHistory(activeCid != null && cid !== activeCid);
      // 解析周期名，明确标识当前查看的是哪一届
      getAllCycles()
        .then((res: any) => {
          const found = (res?.data ?? []).find((c: RecruitmentCycle) => c.cycleId === cid);
          setCycleName(found?.cycleName ?? `招募周期 #${cid}`);
        })
        .catch(() => setCycleName(`招募周期 #${cid}`));
      dispatch(fetchMyResumeReadonly(cid));
      loadAll(cid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, loadAll, paramCycleId]);

  const handleDownloadPdf = async () => {
    const rid = resume?.resume_id || resume?.id;
    if (!rid) { message.warning('尚未创建简历'); return; }
    try {
      const res: any = await exportMyResumePdf(rid);
      const blob = new Blob([res.data ?? res], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `我的简历_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      message.error(e?.message || '导出失败（简历可能尚未提交）');
    }
  };

  const openReschedModal = async () => {
    setReschedReason('');
    setReschedSlots([]);
    setReschedOpen(true);
    try {
      const res: any = await listOpenTimeSlots(cycleId);
      setOpenSlots(res?.data ?? []);
    } catch { /* 可不选期望时间 */ }
  };

  const handleSubmitResched = async () => {
    if (!reschedReason.trim()) { message.warning('请填写改期原因'); return; }
    setReschedSaving(true);
    try {
      await submitReschedule({
        cycleId,
        reason: reschedReason.trim(),
        preferredTimeSlotIds: reschedSlots.length ? reschedSlots.join(',') : undefined,
      });
      message.success('改期申请已提交，请等待管理员处理');
      setReschedOpen(false);
      loadAll(cycleId);
    } catch (e: any) {
      message.error(e?.message || '提交失败');
    } finally {
      setReschedSaving(false);
    }
  };

  // ---- 时间线节点 ----
  const status: number | null = resume?.status ?? null;
  const submitted = (status ?? 0) >= 2;

  // 当前阶段（英雄区展示）
  const stage = result
    ? (result.decision === 1
        ? { emoji: '🎉', title: `已被${result.assignedDeptName || '社团'}录取`, sub: '欢迎加入博远！后续安排请留意邮件与群通知' }
        : { emoji: '🌱', title: '本次未能录取', sub: '感谢参与，欢迎常来社团活动，期待下次相遇' })
    : schedule?.interviewTime
      ? { emoji: '📅', title: '面试已安排', sub: `${fmtDT(schedule.interviewTime)}${schedule.deptName ? ` · ${schedule.deptName}` : ''}${schedule.location ? ` · ${schedule.location}` : ''}，请准时到场` }
      : preference
        ? { emoji: '⏳', title: '等待安排面试', sub: '志愿已提交，管理员正在排期，结果会邮件通知' }
        : submitted
          ? { emoji: '📨', title: '简历已提交', sub: '记得回到简历页补填面试意向（志愿部门+可面试时间）' }
          : status != null
            ? { emoji: '✍️', title: '简历填写中', sub: '完成后记得点击提交' }
            : { emoji: '🚀', title: '开始你的申请', sub: '填写并提交简历，迈出加入博远的第一步' };

  const items: any[] = [];

  items.push({
    color: status != null ? 'green' : 'gray',
    dot: <FileTextOutlined />,
    children: (
      <>
        <Text strong>投递简历</Text>
        <div><Text type="secondary">{status != null ? (RESUME_STATUS_TEXT[status] ?? `状态${status}`) : '还未开始填写'}</Text></div>
        {!submitted && (
          <Button size="small" type="primary" style={{ marginTop: 4 }} onClick={() => navigate('/main/publish')}>
            {status == null ? '去填写' : '继续填写并提交'}
          </Button>
        )}
      </>
    ),
  });

  items.push({
    color: preference ? 'green' : 'gray',
    dot: <FormOutlined />,
    children: (
      <>
        <Text strong>面试意向</Text>
        <div>
          {preference ? (
            <Space size={4} wrap>
              {preference.firstDeptName && <Tag color="blue">第一志愿：{preference.firstDeptName}</Tag>}
              {preference.secondDeptName && <Tag>第二志愿：{preference.secondDeptName}</Tag>}
              <Text type="secondary">提交于 {fmtDT(preference.submittedAt)}</Text>
            </Space>
          ) : (
            <Text type="secondary">未提交志愿</Text>
          )}
          {!result && !schedule?.interviewTime && submitted && (
            <div style={{ marginTop: 6 }}>
              <Button size="small" onClick={() => setIntentOpen(true)}>
                {preference ? '修改面试意向' : '填写面试意向'}
              </Button>
            </div>
          )}
        </div>
      </>
    ),
  });

  items.push({
    color: schedule?.interviewTime ? 'green' : 'gray',
    dot: <CalendarOutlined />,
    children: (
      <>
        <Text strong>面试安排</Text>
        {schedule?.interviewTime ? (
          <div>
            <div>
              <Text>{fmtDT(schedule.interviewTime)}</Text>
              {schedule.deptName && <Tag color="blue" style={{ marginLeft: 8 }}>{schedule.deptName}</Tag>}
              {schedule.location && <Text type="secondary">@{schedule.location}</Text>}
            </div>
            {reschedule && (
              <div style={{ marginTop: 4 }}>
                {reschedule.status === 0 && <Tag color="orange">改期申请处理中</Tag>}
                {reschedule.status === 1 && <Tag color="green">改期已同意{reschedule.adminNote ? `：${reschedule.adminNote}` : '，请留意新安排'}</Tag>}
                {reschedule.status === 2 && <Tag color="red">改期被拒绝{reschedule.adminNote ? `：${reschedule.adminNote}` : ''}</Tag>}
              </div>
            )}
            {!result && (!reschedule || reschedule.status !== 0) && (
              <Button size="small" icon={<SwapOutlined />} style={{ marginTop: 4 }} onClick={openReschedModal}>
                时间冲突？申请改期
              </Button>
            )}
          </div>
        ) : (
          <Text type="secondary">{preference ? '等待管理员安排（结果同步邮件通知）' : '提交意向后由管理员安排'}</Text>
        )}
      </>
    ),
  });

  items.push({
    color: result ? (result.decision === 1 ? 'green' : 'red') : 'gray',
    dot: result?.decision === 1 ? <SmileTwoTone twoToneColor="#52c41a" /> : <ClockCircleOutlined />,
    children: (
      <>
        <Text strong>面试结果</Text>
        <div>
          {result ? (
            result.decision === 1 ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                message={<span>🎉 恭喜！你已被<b>{result.assignedDeptName || '社团'}</b>录取</span>}
                description={`结果时间：${fmtDT(result.decisionAt)}。欢迎加入博远，后续安排请留意邮件与群通知。`}
                style={{ marginTop: 4 }}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message="很遗憾，这次未能录取"
                description="感谢你的参与！欢迎关注社团活动，期待下一次相遇。"
                style={{ marginTop: 4 }}
              />
            )
          ) : (
            <Text type="secondary">{schedule?.interviewTime ? '面试后等待结果（同步邮件通知）' : '完成面试后可在此查看'}</Text>
          )}
        </div>
      </>
    ),
  });

  return (
    <div className="app-progress-page">
      <div className="progress-hero">
        <div className="hero-main">
          <span className="hero-emoji">{stage.emoji}</span>
          <div>
            <div className="hero-cycle">
              {cycleName}
              {isHistory && <span className="hero-history-tag">历史周期</span>}
            </div>
            <div className="hero-title">{stage.title}</div>
            <div className="hero-sub">{stage.sub}</div>
          </div>
        </div>
        <Space wrap className="hero-actions">
          <Button ghost icon={<EyeOutlined />} onClick={() => setResumeOpen(true)} disabled={status == null}>
            查看简历
          </Button>
          <Button ghost icon={<DownloadOutlined />} onClick={handleDownloadPdf} disabled={!submitted}>
            简历 PDF
          </Button>
          {isHistory && (
            <Button ghost onClick={() => navigate('/main/interview-appointment', { replace: true })}>
              回到当前周期
            </Button>
          )}
          <Button ghost icon={<ArrowLeftOutlined />} onClick={() => navigate('/main/dashboard')}>
            返回首页
          </Button>
        </Space>
      </div>
      <Card className="progress-body" title="申请进度">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : (
          <Timeline className="progress-timeline" items={items} />
        )}
      </Card>

      <InterviewIntentEditor
        open={intentOpen}
        cycleId={cycleId}
        resumeId={resume?.resume_id || resume?.id}
        onClose={() => setIntentOpen(false)}
        onSaved={() => { dispatch(fetchMyResumeReadonly(cycleId)); loadAll(cycleId); }}
      />

      <Drawer
        title={`${cycleName || '本周期'} · 我的简历`}
        width={520}
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        className="resume-drawer"
      >
        {(() => {
          const fields: any[] = Array.isArray(resume?.simpleFields) ? resume.simpleFields : [];
          const filled = fields.filter((f) => f.fieldValue != null && String(f.fieldValue).trim() !== '');
          if (filled.length === 0) return <Text type="secondary">该周期的简历还没有填写内容</Text>;

          const byKey: Record<string, any> = {};
          filled.forEach((f) => { if (f.fieldKey) byKey[f.fieldKey] = f; });
          const isImg = (v: any) => typeof v === 'string' && v.startsWith('data:image');
          const photo = filled.find((f) => isImg(f.fieldValue));
          const asArr = (v: any): string[] => {
            try { const a = JSON.parse(String(v)); return Array.isArray(a) ? a : []; } catch { return []; }
          };
          const BASIC_KEYS = ['student_id', 'email', 'phone', 'grade', 'gender', 'major', 'github'];
          const LONG_KEYS = [
            { key: 'self_introduction', title: '个人简介' },
            { key: 'introduction', title: '个人简介' },
            { key: 'project_experience', title: '项目经验' },
            { key: 'reason', title: '加入原因' },
          ];
          const usedKeys = new Set(['name', 'personal_photo', 'expected_departments', 'tech_stack',
            ...BASIC_KEYS, ...LONG_KEYS.map((x) => x.key)]);
          const seenTitles = new Set<string>();

          return (
            <div className="resume-view">
              <div className="rv-head">
                <div>
                  <div className="rv-name">{byKey.name?.fieldValue || '未填写姓名'}</div>
                  <div className="rv-sub">
                    {asArr(byKey.expected_departments?.fieldValue).map((d) => (
                      <Tag color="blue" key={d}>{d}</Tag>
                    ))}
                  </div>
                </div>
                {photo && <img className="rv-photo" src={photo.fieldValue} alt="证件照" />}
              </div>

              <div className="rv-basics">
                {BASIC_KEYS.map((k) => byKey[k] && (
                  <div className="rv-basic-item" key={k}>
                    <span className="rv-label">{byKey[k].fieldLabel || k}</span>
                    <span className="rv-value">{String(byKey[k].fieldValue)}</span>
                  </div>
                ))}
              </div>

              {asArr(byKey.tech_stack?.fieldValue).length > 0 && (
                <div className="rv-section">
                  <div className="rv-section-title">技术栈</div>
                  <Space size={4} wrap>
                    {asArr(byKey.tech_stack.fieldValue).map((t) => <Tag key={t}>{t}</Tag>)}
                  </Space>
                </div>
              )}

              {LONG_KEYS.map(({ key, title }) => {
                const f = byKey[key];
                if (!f || seenTitles.has(title)) return null;
                seenTitles.add(title);
                return (
                  <div className="rv-section" key={key}>
                    <div className="rv-section-title">{title}</div>
                    <div className="rv-prose">{String(f.fieldValue)}</div>
                  </div>
                );
              })}

              {filled.filter((f) => !usedKeys.has(f.fieldKey) && !isImg(f.fieldValue)).map((f) => (
                <div className="rv-section" key={f.fieldId}>
                  <div className="rv-section-title">{f.fieldLabel || f.fieldKey}</div>
                  <div className="rv-prose">{renderFieldValue(f.fieldValue)}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </Drawer>

      <Modal
        title="申请面试改期"
        open={reschedOpen}
        onOk={handleSubmitResched}
        okButtonProps={{ disabled: !reschedReason.trim() }}
        confirmLoading={reschedSaving}
        onCancel={() => setReschedOpen(false)}
        destroyOnClose
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">请说明改期原因（管理员审核后会重新安排并通知你）：</Text>
        </div>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={reschedReason}
          onChange={(e) => setReschedReason(e.target.value)}
          placeholder="如：当天下午有课程考试，17:00 后可到场"
        />
        {openSlots.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">（可选）勾选你期望的时间窗，便于管理员重排：</Text>
            <Space direction="vertical" size={2} style={{ marginTop: 6 }}>
              {openSlots.map((s) => (
                <label key={s.timeSlotId} style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={reschedSlots.includes(s.timeSlotId)}
                    onChange={(e) => setReschedSlots((prev) =>
                      e.target.checked ? [...prev, s.timeSlotId] : prev.filter((id) => id !== s.timeSlotId))}
                  />
                  <span>{s.slotName}（{s.interviewDate} {String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)}）</span>
                </label>
              ))}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InterviewAppointment;
