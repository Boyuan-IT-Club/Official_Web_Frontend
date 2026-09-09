// 预录取 · 终审：三段一体。
//   矩阵  全场总览（默认）——候选人 × 维度的着色矩阵，悬浮看评语
//   舞台  全屏沉浸逐人审——Hero 面板 + 部门胶囊 + 键盘流
//   名单  草稿名单管理与「按名单最终录取」
// 数据一次拉齐四个现有接口，前端关联（finalReview.ts），后端零改动。
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Card, Drawer, Empty, Modal, Popconfirm, Segmented, Space, Spin, Table, Tag, Typography, message,
} from 'antd';
import { ReloadOutlined, RocketOutlined, FullscreenOutlined } from '@ant-design/icons';
import { request } from '@/utils';
import {
  InterviewResultItem, PreAdmissionDeptStat, PreAdmissionDraftItem,
  finalizePreAdmission, listPreAdmission, listResults, listSchedulesRoster,
  removePreAdmission, savePreAdmission,
} from '@/api/manage/interviewAdmin';
import { EvaluationDimension, getEvaluationSummary } from '@/api/manage/interviewEvaluation';
import ResumeAttachments from '@/components/ResumeAttachments';
import StageShell from '@/components/stage/StageShell';
import FilmStrip, { FilmChip } from '@/components/stage/FilmStrip';
import FinalStage from './FinalStage';
import FinalMatrix from './FinalMatrix';
import {
  FinalCandidate, assembleCandidates, clampIndex, rankCandidates, stageKeyAction,
} from './finalReview';

const { Text } = Typography;

type Mode = 'matrix' | 'stage' | 'list';

const PreAdmitTab: React.FC<{
  cycleId: number;
  depts?: Array<{ deptId: number; deptName: string }>;
  refreshToken?: number;
}> = ({ cycleId, depts = [], refreshToken }) => {
  const [mode, setMode] = useState<Mode>('matrix');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<FinalCandidate[]>([]);
  const [dimensions, setDimensions] = useState<EvaluationDimension[]>([]);
  const [stats, setStats] = useState<PreAdmissionDeptStat[]>([]);
  const [draftTotal, setDraftTotal] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  // 简历速览抽屉
  const [peek, setPeek] = useState<{ name: string; fields: any[]; resumeId?: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, evalRes, pre, roster]: any[] = await Promise.all([
        listResults({ cycleId, page: 1, size: 500 }),
        getEvaluationSummary(cycleId).catch(() => null),
        listPreAdmission({ cycleId, page: 1, size: 500 }),
        listSchedulesRoster(cycleId).catch(() => null),
      ]);
      const usernames: Record<number, string | undefined> = {};
      (roster?.data ?? []).forEach((r: any) => { if (r.userId != null) usernames[r.userId] = r.username; });
      const drafts: PreAdmissionDraftItem[] = pre?.data?.candidates ?? [];
      const rows = rankCandidates(assembleCandidates(
        res?.data?.interviewResults ?? [],
        evalRes?.data?.candidates ?? [],
        drafts,
        usernames,
      ));
      setCandidates(rows);
      setDimensions(evalRes?.data?.dimensions ?? []);
      setStats(pre?.data?.departmentStats ?? []);
      setDraftTotal(Number(pre?.data?.total ?? drafts.length));
      setStageIndex((i) => clampIndex(i, rows.length));
    } catch (e: any) {
      message.error(e?.message || '加载终审数据失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load, refreshToken]);

  /** 单人加入 / 换部门。局部更新后台再静默刷新，避免整页闪 */
  const assign = useCallback(async (c: FinalCandidate, deptId: number) => {
    try {
      const res: any = await savePreAdmission({ cycleId, resultIds: [c.resultId], assignedDeptId: deptId });
      if ((res?.data?.skipped?.length ?? 0) > 0) {
        message.warning('这位同学已被定稿，不能再改预录取');
        return;
      }
      const deptName = depts.find((d) => d.deptId === deptId)?.deptName ?? `#${deptId}`;
      message.success(`${c.name} → ${deptName}`);
      setCandidates((prev) => prev.map((x) => (x.resultId === c.resultId
        ? { ...x, preDeptId: deptId, preDeptName: deptName } : x)));
      listPreAdmission({ cycleId, page: 1, size: 1 }).then((r: any) => {
        setStats(r?.data?.departmentStats ?? []);
        setDraftTotal(Number(r?.data?.total ?? 0));
      }).catch(() => undefined);
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  }, [cycleId, depts]);

  const remove = useCallback(async (c: FinalCandidate) => {
    try {
      await removePreAdmission({ cycleId, resultIds: [c.resultId] });
      message.success(`已把 ${c.name} 移出名单`);
      setCandidates((prev) => prev.map((x) => (x.resultId === c.resultId
        ? { ...x, preDeptId: null, preDeptName: null } : x)));
      listPreAdmission({ cycleId, page: 1, size: 1 }).then((r: any) => {
        setStats(r?.data?.departmentStats ?? []);
        setDraftTotal(Number(r?.data?.total ?? 0));
      }).catch(() => undefined);
    } catch (e: any) {
      message.error(e?.message || '移出失败');
    }
  }, [cycleId]);

  // ── 舞台键盘流 ──
  const stageRef = useRef({ candidates, stageIndex, depts });
  stageRef.current = { candidates, stageIndex, depts };
  useEffect(() => {
    if (mode !== 'stage') return undefined;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const { candidates: list, stageIndex: idx, depts: ds } = stageRef.current;
      const act = stageKeyAction(e.key, ds.length);
      if (!act || list.length === 0) return;
      e.preventDefault();
      if (act.type === 'prev') setStageIndex((i) => clampIndex(i - 1, list.length));
      else if (act.type === 'next') setStageIndex((i) => clampIndex(i + 1, list.length));
      else if (act.type === 'assign') assign(list[idx], ds[act.deptIndex].deptId);
      else if (act.type === 'remove' && list[idx].preDeptId != null) remove(list[idx]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, assign, remove]);

  const openPeek = useCallback(async (c: FinalCandidate) => {
    try {
      const res: any = await request({ url: `/api/resumes/admin/${c.userId}/${cycleId}`, method: 'get' });
      setPeek({ name: c.name, fields: res?.data?.simpleFields ?? [], resumeId: res?.data?.resumeId });
    } catch (e: any) {
      message.error(e?.message || '读取简历失败');
    }
  }, [cycleId]);

  const doFinalize = async () => {
    setFinalizing(true);
    try {
      const res: any = await finalizePreAdmission({ cycleId });
      message.success(`已正式录取 ${res?.data?.published ?? 0} 人，去「结果与通知」发送录取邮件`);
      setFinalizeOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || '转正失败');
    } finally {
      setFinalizing(false);
    }
  };

  const filmItems: FilmChip[] = useMemo(() => candidates.map((c, i) => ({
    key: c.resultId,
    name: c.name,
    sub: c.evalTotal != null ? `#${i + 1} · ${Number(c.evalTotal).toFixed(1)}` : `#${i + 1} · —`,
    tag: c.scheduleId == null ? '无面试' : (c.preDeptName ?? '未入名单'),
    tagTone: c.preDeptName ? 'good' : c.scheduleId == null ? 'warn' : 'muted',
    selected: i === stageIndex,
  })), [candidates, stageIndex]);

  const deptPills = (
    <Space wrap size={6}>
      {stats.map((s) => <Tag color="blue" key={s.deptId}>{s.departmentName} · {s.candidateCount}</Tag>)}
      <Tag>未入名单 {Math.max(0, candidates.length - draftTotal)}</Tag>
    </Space>
  );

  const modeSeg = (
    <Segmented
      size="small"
      value={mode}
      onChange={(v) => setMode(v as Mode)}
      options={[
        { label: '总览矩阵', value: 'matrix' },
        { label: '舞台', value: 'stage' },
        { label: '名单', value: 'list' },
      ]}
    />
  );

  const current = candidates[clampIndex(stageIndex, Math.max(1, candidates.length))];

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }} align="center">
        {modeSeg}
        {deptPills}
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
        <Button type="primary" icon={<FullscreenOutlined />} disabled={candidates.length === 0}
                onClick={() => setMode('stage')}>
          进入终审舞台
        </Button>
        <Button icon={<RocketOutlined />} disabled={!draftTotal} loading={finalizing}
                onClick={() => setFinalizeOpen(true)}>
          按名单最终录取（{draftTotal} 人）
        </Button>
      </Space>

      {mode === 'matrix' && (
        loading && candidates.length === 0 ? <Spin style={{ display: 'block', margin: '48px auto' }} /> : (
        <FinalMatrix
          candidates={candidates}
          dimensions={dimensions}
          onOpenStage={(resultId) => {
            const i = candidates.findIndex((c) => c.resultId === resultId);
            if (i >= 0) setStageIndex(i);
            setMode('stage');
          }}
        />
      ))}

      {mode === 'list' && (
        <ListSection
          candidates={candidates.filter((c) => c.preDeptId != null)}
          onRemove={remove}
        />
      )}

      {mode === 'stage' && current && (
        <StageShell
          title={`终审舞台 · 周期 #${cycleId}`}
          meta={`${candidates.length} 位候选人`}
          topExtra={<Space>{deptPills}{modeSeg}</Space>}
          onExit={() => setMode('matrix')}
          film={<FilmStrip items={filmItems} onSelect={(key) => {
            const i = candidates.findIndex((c) => c.resultId === Number(key));
            if (i >= 0) setStageIndex(i);
          }} />}
        >
          <FinalStage
            candidate={current}
            rank={stageIndex + 1}
            total={candidates.length}
            dimensions={dimensions}
            depts={depts}
            onAssign={(deptId) => assign(current, deptId)}
            onRemove={() => remove(current)}
            onViewResume={() => openPeek(current)}
          />
        </StageShell>
      )}

      <Modal
        title="按名单最终录取？"
        open={finalizeOpen}
        confirmLoading={finalizing}
        okText="确认录取"
        onOk={doFinalize}
        onCancel={() => setFinalizeOpen(false)}
      >
        <p style={{ marginBottom: 8 }}>将把名单里的 {draftTotal} 人正式录取到各自部门（写入结果，不发邮件）：</p>
        {stats.map((s) => <div key={s.deptId}>{s.departmentName} · {s.candidateCount} 人</div>)}
        <p style={{ marginTop: 8, color: '#999' }}>
          录取邮件仍需到「结果与通知」勾选发送。若名单中有人已被别处定稿，本次会整批失败，刷新后重试。
        </p>
      </Modal>

      <Drawer
        open={!!peek}
        onClose={() => setPeek(null)}
        width={520}
        title={peek ? `简历 · ${peek.name}` : ''}
        zIndex={1100}
      >
        {peek && (
          <>
            {peek.fields.length === 0 ? <Empty description="简历没有内容" /> : peek.fields.map((f: any) => (
              <p key={f.fieldId ?? f.fieldLabel} style={{ marginBottom: 8 }}>
                <Text type="secondary">{f.fieldLabel}</Text><br />
                <span style={{ whiteSpace: 'pre-wrap' }}>{renderFieldValue(f.fieldValue)}</span>
              </p>
            ))}
            {peek.resumeId && <ResumeAttachments resumeId={peek.resumeId} canEdit={false} />}
          </>
        )}
      </Drawer>
    </>
  );
};

/** 名单段：草稿成员表（终审动作在舞台/矩阵，这里只管看与移出） */
const ListSection: React.FC<{
  candidates: FinalCandidate[];
  onRemove: (c: FinalCandidate) => void;
}> = ({ candidates, onRemove }) => (
  <Table
    rowKey="resultId"
    size="middle"
    dataSource={candidates}
    pagination={false}
    locale={{ emptyText: <Empty description={<span>名单还是空的 —— 在「舞台」或「总览矩阵」里挑人加入</span>} /> }}
    columns={[
      { title: '姓名', dataIndex: 'name', width: 140 },
      { title: '拟录取部门', dataIndex: 'preDeptName', width: 140,
        render: (v: string) => <Tag color="blue">{v}</Tag> },
      { title: '面试分', dataIndex: 'evalTotal', width: 100, align: 'right' as const,
        render: (v: number | null) => (v != null ? Number(v).toFixed(1) : '—') },
      { title: '简历分', dataIndex: 'resumeScore', width: 100, align: 'right' as const,
        render: (v: number | null) => v ?? '—' },
      { title: '操作', width: 100,
        render: (_: unknown, r: FinalCandidate) => (
          <Popconfirm title="移出预录取名单？" okText="移出" cancelText="取消" onConfirm={() => onRemove(r)}>
            <Button type="link" size="small" danger>移出</Button>
          </Popconfirm>
        ) },
    ] as any}
  />
);

/** 字段值展示：JSON 数组拍平成顿号串，图片字段太长直接省略 */
function renderFieldValue(v?: string | null): string {
  if (!v) return '—';
  if (v.length > 2000 && v.startsWith('data:')) return '（图片，见完整简历）';
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.join('、');
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([k, val]) => `${k}: ${val}`).join(' · ');
    }
  } catch { /* 普通文本 */ }
  return v;
}

export default PreAdmitTab;
