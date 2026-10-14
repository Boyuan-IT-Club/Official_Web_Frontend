// 预录取 · 终审：三段一体。
//   矩阵  全场总览（默认）——候选人 × 维度的着色矩阵，悬浮看评语
//   舞台  逐人审——Hero 面板 + 部门胶囊 + 键盘流
//   名单  草稿名单管理与「按名单最终录取」
//
// 「全屏」是独立于视图模式的一层状态，不再和「舞台」绑死：
// 原先点「进入终审舞台」全屏，一切到矩阵或名单就被踢回普通页面，
// 而终审恰恰要在矩阵和舞台之间来回跳。现在三种视图都能在全屏里看，
// 退出全屏只由顶栏的退出键（或 Esc）决定。
// 数据一次拉齐几个现有接口，前端关联（finalReview.ts）；部门人数读服务端的录取统计。
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Button, Drawer, Empty, Modal, Popconfirm, Segmented, Select, Space, Spin, Table, Tag, Tooltip,
  Typography, message,
} from 'antd';
import { ReloadOutlined, RocketOutlined, FullscreenOutlined } from '@ant-design/icons';
import { request } from '@/utils';
import {
  PreAdmissionDeptStat, PreAdmissionDraftItem, RESULT_ERROR, ResultSummary,
  finalizePreAdmission, getResultSummary, listPreAdmission, listAllResults, listSchedulesRoster,
  removePreAdmission, savePreAdmission,
} from '@/api/manage/interviewAdmin';
import {
  EvaluationDimension, RECOMMENDATION_OPTIONS, getEvaluationSummary,
} from '@/api/manage/interviewEvaluation';
import { ONLINE_LOCATION } from '../EvaluationBoard/collab';
import ResumeAttachments from '@/components/ResumeAttachments';
import StageShell from '@/components/stage/StageShell';
import FilmStrip, { FilmChip } from '@/components/stage/FilmStrip';
import FinalStage from './FinalStage';
import FinalMatrix from './FinalMatrix';
import {
  FinalCandidate, assembleCandidates, clampIndex, countPendingOutside, decisionText, isConflict,
  rankCandidates, stageKeyAction,
} from './finalReview';
import { isDecided } from './resultBatch';

const { Text } = Typography;

type Mode = 'matrix' | 'stage' | 'list';

const PreAdmitTab: React.FC<{
  cycleId: number;
  depts?: Array<{ deptId: number; deptName: string }>;
  refreshToken?: number;
  /**
   * 本面板是否正显示。antd Tabs 会保留切走的面板，舞台的键盘监听若不看这个，
   * 在别的页签里按数字键也会把人预录取进部门。
   */
  active?: boolean;
  /** 跳到同页的其他页签（转正后去「录取结果」处理剩余待定） */
  onNavigate?: (tab: string) => void;
}> = ({ cycleId, depts = [], refreshToken, active = true, onNavigate }) => {
  const [mode, setMode] = useState<Mode>('matrix');
  // 全屏沉浸：与 mode 正交，三种视图都能全屏看
  const [immersive, setImmersive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<FinalCandidate[]>([]);
  const [dimensions, setDimensions] = useState<EvaluationDimension[]>([]);
  const [stats, setStats] = useState<PreAdmissionDeptStat[]>([]);
  // 各部门「预录取 / 已录取」人数：服务端统计。转正后草稿清空，已录取的人数照样看得到
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [draftTotal, setDraftTotal] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [locationFilter, setLocationFilter] = useState<string | undefined>();
  const [choiceFilter, setChoiceFilter] = useState<string | undefined>();
  const [recommendFilter, setRecommendFilter] = useState<number | undefined>();
  const [preAdmitFilter, setPreAdmitFilter] = useState<'in' | 'out' | undefined>();
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  // 简历速览抽屉
  const [peek, setPeek] = useState<{ name: string; fields: any[]; resumeId?: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, evalRes, pre, roster, sum]: any[] = await Promise.all([
        listAllResults(cycleId),
        getEvaluationSummary(cycleId).catch(() => null),
        listPreAdmission({ cycleId, page: 1, size: 500 }),
        listSchedulesRoster(cycleId).catch(() => null),
        getResultSummary(cycleId).catch(() => null),
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
      setSummary(sum?.data ?? null);
      setStageIndex((i) => clampIndex(i, rows.length));
    } catch (e: any) {
      message.error(e?.message || '加载终审数据失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load, refreshToken]);

  /** 加入/移出后静默对一下人数，避免整页闪 */
  const refreshCounts = useCallback(() => {
    listPreAdmission({ cycleId, page: 1, size: 1 }).then((r: any) => {
      setStats(r?.data?.departmentStats ?? []);
      setDraftTotal(Number(r?.data?.total ?? 0));
    }).catch(() => undefined);
    getResultSummary(cycleId).then((r: any) => setSummary(r?.data ?? null)).catch(() => undefined);
  }, [cycleId]);

  /** 单人加入 / 换部门。局部更新后台再静默刷新，避免整页闪 */
  const assign = useCallback(async (c: FinalCandidate, deptId: number) => {
    if (isDecided(c.decision)) {
      message.warning(`${c.name} 已经${decisionText(c.decision)}，不能再预录取；如需改动请到「录取结果」更正`);
      return;
    }
    try {
      const res: any = await savePreAdmission({ cycleId, resultIds: [c.resultId], assignedDeptId: deptId });
      if ((res?.data?.skipped?.length ?? 0) > 0) {
        message.warning('这位同学刚被定了结果，不能再预录取，已刷新');
        load();
        return;
      }
      const deptName = depts.find((d) => d.deptId === deptId)?.deptName ?? `#${deptId}`;
      message.success(`${c.name} → ${deptName}`);
      setCandidates((prev) => prev.map((x) => (x.resultId === c.resultId
        ? { ...x, preDeptId: deptId, preDeptName: deptName } : x)));
      refreshCounts();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  }, [cycleId, depts, load, refreshCounts]);

  const remove = useCallback(async (c: FinalCandidate) => {
    try {
      await removePreAdmission({ cycleId, resultIds: [c.resultId] });
      message.success(`已把 ${c.name} 移出名单`);
      setCandidates((prev) => prev.map((x) => (x.resultId === c.resultId
        ? { ...x, preDeptId: null, preDeptName: null } : x)));
      refreshCounts();
    } catch (e: any) {
      message.error(e?.message || '移出失败');
    }
  }, [cycleId, refreshCounts]);

  // ── 舞台键盘流 ──
  // 这里要跟着「筛选后」的名单走，否则筛完 ←→ 还在翻没筛掉的人。
  // ref 在此声明、在 visible 算出来之后赋值（见下方 stageRef.current = ...）
  const stageRef = useRef<{ list: FinalCandidate[]; stageIndex: number; depts: typeof depts }>(
    { list: candidates, stageIndex, depts });
  useEffect(() => {
    if (mode !== 'stage' || !active) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const { list, stageIndex: idx, depts: ds } = stageRef.current;
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
  }, [mode, active, assign, remove]);

  const openPeek = useCallback(async (c: FinalCandidate) => {
    try {
      const res: any = await request({ url: `/api/resumes/admin/${c.userId}/${cycleId}`, method: 'get' });
      setPeek({ name: c.name, fields: res?.data?.simpleFields ?? [], resumeId: res?.data?.resumeId });
    } catch (e: any) {
      message.error(e?.message || '读取简历失败');
    }
  }, [cycleId]);

  // 挂在已定结果上的草稿：转正发布不了他们，先在弹窗里点名
  const conflicts = useMemo(() => candidates.filter(isConflict), [candidates]);
  const pendingOutside = useMemo(() => countPendingOutside(candidates), [candidates]);

  const doFinalize = async () => {
    setFinalizing(true);
    // 转正前记下名单外的待定人数：转正不动他们，成功后提示去处理
    const leftover = pendingOutside;
    try {
      const res: any = await finalizePreAdmission({ cycleId });
      const published = res?.data?.published ?? 0;
      setFinalizeOpen(false);
      load();
      if (leftover > 0 && onNavigate) {
        Modal.confirm({
          title: `已正式录取 ${published} 人`,
          content: `还有 ${leftover} 位待定的同学没进名单，仍是待定。可以到「录取结果」一键标为未通过；录取邮件到「通知」页发送。`,
          okText: '去处理剩余待定',
          cancelText: '稍后',
          onOk: () => onNavigate('results'),
        });
      } else {
        message.success(`已正式录取 ${published} 人，去「通知」页发送录取邮件`);
      }
    } catch (e: any) {
      if (e?.code === RESULT_ERROR.CONFLICT) {
        // 服务端会列出冲突的人名，原样给出来，并刷新让冲突标记显示出来
        Modal.error({ title: '没有转正，名单一个都没发布', content: e?.message });
        setFinalizeOpen(false);
        load();
      } else {
        message.error(e?.message || '转正失败');
      }
    } finally {
      setFinalizing(false);
    }
  };

  /*
   * 三个视图（矩阵 / 舞台 / 名单）共用同一份筛选结果 —— 在矩阵里筛出「技术部志愿
   * 且倾向通过」的人，切到舞台就是逐个翻这批，翻完就是翻完，不会又冒出没筛的人。
   * 排名编号仍沿用全局名次（rankCandidates 已排好），筛选只是隐藏行。
   */
  const visible = useMemo(() => {
    let list = candidates;
    if (locationFilter) {
      list = list.filter((c) => (c.location ?? ONLINE_LOCATION) === locationFilter);
    }
    if (choiceFilter) {
      list = list.filter((c) => c.firstDeptName === choiceFilter || c.secondDeptName === choiceFilter);
    }
    if (recommendFilter != null) list = list.filter((c) => c.recommendation === recommendFilter);
    if (preAdmitFilter === 'in') list = list.filter((c) => c.preDeptId != null);
    if (preAdmitFilter === 'out') list = list.filter((c) => c.preDeptId == null);
    return list;
  }, [candidates, locationFilter, choiceFilter, recommendFilter, preAdmitFilter]);

  // 筛完之后原来的游标可能越界，把舞台拉回范围内
  useEffect(() => {
    setStageIndex((i) => clampIndex(i, visible.length));
  }, [visible.length]);

  stageRef.current = { list: visible, stageIndex, depts };

  const optionsOf = (pick: (c: FinalCandidate) => (string | null | undefined)[]) => {
    const names = new Set<string>();
    candidates.forEach((c) => pick(c).forEach((n) => { if (n) names.add(n); }));
    return Array.from(names)
      .sort((a, b) => {
        if (a === ONLINE_LOCATION) return 1;
        if (b === ONLINE_LOCATION) return -1;
        return a.localeCompare(b, 'zh-CN');
      })
      .map((n) => ({ value: n, label: n }));
  };
  const locationOptions = useMemo(
    () => optionsOf((c) => [c.location ?? ONLINE_LOCATION]), [candidates]);   // eslint-disable-line react-hooks/exhaustive-deps
  const choiceOptions = useMemo(
    () => optionsOf((c) => [c.firstDeptName, c.secondDeptName]), [candidates]);   // eslint-disable-line react-hooks/exhaustive-deps

  const filterBar = (
    <Space wrap size={6}>
      <Select allowClear size="small" placeholder="面试地点" style={{ width: 150 }}
              value={locationFilter} options={locationOptions} onChange={setLocationFilter} />
      <Select allowClear size="small" placeholder="志愿部门" style={{ width: 120 }}
              value={choiceFilter} options={choiceOptions} onChange={setChoiceFilter} />
      <Select allowClear size="small" placeholder="结论" style={{ width: 110 }}
              value={recommendFilter} options={[...RECOMMENDATION_OPTIONS]} onChange={setRecommendFilter} />
      <Select allowClear size="small" placeholder="预录取" style={{ width: 110 }}
              value={preAdmitFilter} onChange={setPreAdmitFilter}
              options={[{ value: 'in', label: '已入名单' }, { value: 'out', label: '未入名单' }]} />
      {visible.length !== candidates.length && (
        <Text type="secondary">筛选后 {visible.length} / {candidates.length} 人</Text>
      )}
    </Space>
  );

  const filmItems: FilmChip[] = useMemo(() => visible.map((c, i) => ({
    key: c.resultId,
    name: c.name,
    sub: c.evalTotal != null ? `#${i + 1} · ${Number(c.evalTotal).toFixed(1)}` : `#${i + 1} · —`,
    tag: c.scheduleId == null ? '无面试' : (c.preDeptName ?? '未入名单'),
    tagTone: c.preDeptName ? 'good' : c.scheduleId == null ? 'warn' : 'muted',
    selected: i === stageIndex,
  })), [visible, stageIndex]);

  // 部门「预录取 a / 已录取 b」：转正后草稿清空，靠「已录取」还能看出各部门最后录了几个
  const deptRows = summary
    ? summary.departments
      .filter((d) => d.preAdmitted > 0 || d.admitted > 0)
      .map((d) => ({ deptId: d.deptId, deptName: d.deptName, pre: d.preAdmitted, admitted: d.admitted }))
    : stats.map((s) => ({ deptId: s.deptId, deptName: s.departmentName, pre: s.candidateCount, admitted: undefined }));
  const deptPills = (
    <Space wrap size={6}>
      {deptRows.map((d) => (
        <Tag color="blue" key={d.deptId}>
          {d.deptName} · 预录取 {d.pre}{d.admitted != null ? ` / 已录取 ${d.admitted}` : ''}
        </Tag>
      ))}
      <Tooltip title="还没决定、也没进预录取名单的人。转正不会动他们">
        <Tag>待定未入名单 {pendingOutside}</Tag>
      </Tooltip>
      {conflicts.length > 0 && (
        <Tooltip title="已经有正式结果却还在名单里，转正前要先移出">
          <Tag color="red">冲突 {conflicts.length}</Tag>
        </Tooltip>
      )}
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

  const current = visible[clampIndex(stageIndex, Math.max(1, visible.length))];

  /** 三种视图的正文；全屏与否都渲染同一份，避免两套分支各写一遍 */
  const body = (
    <>
      {mode === 'matrix' && (
        loading && candidates.length === 0
          ? <Spin style={{ display: 'block', margin: '48px auto' }} />
          : (
            <FinalMatrix
              candidates={visible}
              dimensions={dimensions}
              depts={depts}
              onAssign={assign}
              onRemove={remove}
              onOpenStage={(resultId) => {
                // 舞台翻的是筛选后的名单，游标要在 visible 里找；原先在全量里找，筛选后会打开别人
                const i = visible.findIndex((c) => c.resultId === resultId);
                if (i >= 0) setStageIndex(i);
                setMode('stage');
                // 从矩阵点进某个人就是要逐人细看，顺势进全屏
                setImmersive(true);
              }}
            />
          )
      )}

      {mode === 'list' && (
        <ListSection
          candidates={visible.filter((c) => c.preDeptId != null)}
          onRemove={remove}
        />
      )}

      {mode === 'stage' && (current
        ? (
          <FinalStage
            candidate={current}
            rank={stageIndex + 1}
            total={visible.length}
            dimensions={dimensions}
            depts={depts}
            onAssign={(deptId) => assign(current, deptId)}
            onRemove={() => remove(current)}
            onViewResume={() => openPeek(current)}
          />
        )
        : <Empty description="本周期还没有候选人" style={{ padding: 48 }} />)}
    </>
  );

  const toolbar = (
    <Space wrap style={{ marginBottom: 12 }} align="center">
      {modeSeg}
      {deptPills}
      <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
      {/* 全屏与视图模式无关：矩阵、舞台、名单都能全屏看 */}
      <Tooltip title="全屏">
        <Button icon={<FullscreenOutlined />} disabled={candidates.length === 0}
                onClick={() => setImmersive(true)} aria-label="全屏" />
      </Tooltip>
      <Button type="primary" icon={<RocketOutlined />} disabled={!draftTotal} loading={finalizing}
              onClick={() => setFinalizeOpen(true)}>
        按名单最终录取（{draftTotal} 人）
      </Button>
    </Space>
  );

  return (
    <>
      {immersive ? (
        <StageShell
          title={`终审舞台 · 周期 #${cycleId}`}
          meta={mode === 'stage'
            ? (visible.length === candidates.length
                ? `${candidates.length} 位候选人`
                : `筛选后 ${visible.length} / ${candidates.length} 位候选人`)
            : undefined}
          topExtra={(
            <Space wrap>
              {deptPills}
              {filterBar}
              {modeSeg}
              <Button size="small" icon={<RocketOutlined />} disabled={!draftTotal} loading={finalizing}
                      onClick={() => setFinalizeOpen(true)}>
                最终录取（{draftTotal}）
              </Button>
            </Space>
          )}
          onExit={() => setImmersive(false)}
          /* 胶片条是逐人翻看用的，矩阵/名单视图下没有「当前这一位」，不渲染 */
          film={mode === 'stage'
            ? <FilmStrip items={filmItems} onSelect={(key) => {
                const i = visible.findIndex((c) => c.resultId === Number(key));
                if (i >= 0) setStageIndex(i);
              }} />
            : undefined}
        >
          {body}
        </StageShell>
      ) : (
        <>
          {toolbar}
          {/* 筛选独立一行：工具栏那行已经有模式切换、部门统计与两个主操作，再塞四个下拉会挤成一团 */}
          <div style={{ marginBottom: 12 }}>{filterBar}</div>
          {body}
        </>
      )}

      <Modal
        title="按名单最终录取？"
        open={finalizeOpen}
        confirmLoading={finalizing}
        okText="确认录取"
        okButtonProps={{ disabled: conflicts.length > 0 }}
        onOk={doFinalize}
        onCancel={() => setFinalizeOpen(false)}
      >
        {conflicts.length > 0 ? (
          <Alert
            type="error"
            showIcon
            message={`名单里有 ${conflicts.length} 人已经有正式结果，转正不了`}
            description={(
              <>
                <div style={{ marginBottom: 8 }}>
                  {conflicts.map((c) => `${c.name}（${decisionText(c.decision)}）`).join('、')}
                </div>
                请先在矩阵或名单里把他们移出，再转正。转正是整批的：有一个人发布不了，就一个都不发布。
              </>
            )}
          />
        ) : (
          <>
            <p style={{ marginBottom: 8 }}>将把名单里的 {draftTotal} 人正式录取到各自部门：</p>
            {deptRows.filter((d) => d.pre > 0).map((d) => <div key={d.deptId}>{d.deptName} · {d.pre} 人</div>)}
            <ul style={{ marginTop: 8, paddingLeft: 18, color: '#666' }}>
              <li>写入正式结果后，学生刷新页面就能看到「已录取」。</li>
              <li>不会发邮件，录取邮件要到「通知」页发送。</li>
              <li>转正后再改，只能在「录取结果」里逐个更正并填写原因。</li>
              {pendingOutside > 0 && (
                <li>名单外还有 {pendingOutside} 位待定的同学，转正后仍是待定，可以到「录取结果」一键标为未通过。</li>
              )}
            </ul>
          </>
        )}
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

/** 名单段：草稿成员表（终审动作在舞台/矩阵，这里只管看与移出）。跟着筛选走 */
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
      { title: '拟录取部门', dataIndex: 'preDeptName', width: 180,
        render: (v: string, r: FinalCandidate) => (
          <>
            <Tag color="blue">{v}</Tag>
            {isConflict(r) && (
              <Tooltip title={`已经${decisionText(r.decision)}，转正前要先移出`}>
                <Tag color="red">冲突</Tag>
              </Tooltip>
            )}
          </>
        ) },
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
