// 简历打分舞台：沉浸式批改工作台。
//
// 与「面试评价舞台」同族：复用 StageShell（全屏壳 + Esc 退出）与
// FilmStrip（底部队列胶片条），视觉语言一致。
//
// 三条设计原则来自实际批改动线：
//   ① 简历独占整幅宽度——批改时眼睛九成时间在简历上，评分只是一个数字；
//   ② 评分条横置在底部、紧邻胶片队列——「打分」与「跳下一位」两个动作
//      在同一区域，手不用来回跑，也永远不会遮住正文（旧版吸顶条的毛病）；
//   ③ 打分状态全部以 resumeId 为 key 派生，切人即重建——
//      「上一位分数残留」那类 bug 从结构上绝迹。
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input, InputNumber, Button, Popconfirm, Select, Tooltip, message } from 'antd';
import { CommentOutlined, DownOutlined, EyeInvisibleOutlined, EyeOutlined, HolderOutlined, QuestionCircleOutlined, UndoOutlined } from '@ant-design/icons';
import StageShell from '@/components/stage/StageShell';
import FilmStrip, { FilmChip } from '@/components/stage/FilmStrip';
import ResumeDetail from '../ResumeDetail';
import { updateResumeScore, withdrawResumeScore } from '@/api/manage/resumeEntry';
import { COMMENT_MAX, myCommentOf, myScoreOf, othersHidden, scorerLabel, ScoreEntry } from '../scorePanel';
import { isRevealed, setRevealAll, toggleRevealOne, useScoreReveal } from '../scoreReveal';
import { getToken } from '@/utils';
import { hasPermission } from '@/utils/jwt';
import {
  QueueItem, filterByDept, landingAfterDeptChange, neighborOf, nextUngradedOf, progressOf,
} from './useScoringQueue';
import { clampToViewport, defaultPosition, loadPosition, savePosition } from './dockPosition';
import './scoringStage.scss';

const DEPTS = ['技术部', '项目部', '媒体部', '综合部'];

const KEYS: Array<[string, string]> = [
  ['0-9', '直接输入分数'],
  ['Enter', '保存并跳到我未打分的下一位'],
  ['⌘/Ctrl + ← →', '上一位 / 下一位（不保存）'],
  ['U', '跳过，去我未打分的下一位'],
  ['Esc', '退出舞台'],
];

export interface ScoringStageProps {
  /**
   * 符合列表筛选条件的全部简历，舞台队列由它派生。
   * 进舞台时先是当前页，全量取回后再换成全部（见 Resume/index.tsx）。
   */
  resumes: any[];
  /** 正在取全部筛选结果：此时队列只是当前页，顶栏要说清楚，免得总数突然跳变 */
  loadingAll?: boolean;
  /** 进入舞台时选中的那一位 */
  initialResumeId: number;
  cycleName?: string;
  myUserId?: number | string;
  onExit: () => void;
  /** 保存成功后回写列表 store */
  onScored: (resumeId: number, avg: number | null, entries: ScoreEntry[]) => void;
}

const nameOf = (r: any): string =>
  r?.simpleFields?.find((f: any) => f.fieldKey === 'name')?.fieldValue
  || r?.userName || `简历 #${r?.resumeId}`;

// 字段可能只带 fieldLabel（后端两种都可能给），键名与标签双路匹配——
// 只认 fieldKey 会导致部门筛选静默失效（实测踩到）
const DEPT_FIELDS = ['first_choice', 'second_choice', 'expected_departments'];
const DEPT_LABELS = ['第一志愿', '第二志愿', '期望部门'];

const deptsOf = (r: any): string[] => {
  const vals = (r?.simpleFields ?? [])
    .filter((f: any) => DEPT_FIELDS.includes(f.fieldKey) || DEPT_LABELS.includes(f.fieldLabel))
    .map((f: any) => String(f.fieldValue ?? ''));
  // expected_departments 存的是 JSON 数组，志愿字段是纯文本，两种都摊平成部门名
  const flat: string[] = [];
  vals.forEach((v: string) => {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) { parsed.forEach((x) => flat.push(String(x))); return; }
    } catch { /* 非 JSON，按纯文本处理 */ }
    if (v) flat.push(v);
  });
  return DEPTS.filter((d) => flat.some((v) => v.includes(d)));
};

const ScoringStage: React.FC<ScoringStageProps> = ({
  resumes, loadingAll, initialResumeId, cycleName, myUserId, onExit, onScored,
}) => {
  const [dept, setDept] = useState<string | undefined>();
  const [currentId, setCurrentId] = useState<number>(initialResumeId);
  const [saving, setSaving] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  // 两处折叠偏好记在本地：批改是重复劳动，收起过就该一直收着
  const [dockFolded, setDockFolded] = useState<boolean>(() => {
    try { return localStorage.getItem('boyuan.stage.dockFolded') === '1'; } catch { return false; }
  });
  const toggleDock = useCallback(() => {
    setDockFolded((v) => {
      const next = !v;
      try { localStorage.setItem('boyuan.stage.dockFolded', next ? '1' : '0'); } catch { /* 隐私模式忽略 */ }
      return next;
    });
  }, []);
  // ── 悬浮岛拖拽 ──
  // 用 pointer 事件（鼠标/触控板/触屏一套代码），拖动中直接写 style.left/top
  // 不走 React state：拖一次要跑几十帧，setState 会明显掉帧；松手时才落状态与存档。
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockPos, setDockPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  // 首次挂载与窗口尺寸变化时，把位置夹回视口（换了屏幕/缩了窗口不至于飞出去）
  useEffect(() => {
    const place = () => {
      const el = dockRef.current;
      if (!el) return;
      const size = { w: el.offsetWidth, h: el.offsetHeight };
      const vp = { w: window.innerWidth, h: window.innerHeight };
      const saved = loadPosition();
      setDockPos(saved ? clampToViewport(saved, size, vp) : defaultPosition(size, vp));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [dockFolded]);

  // 拖拽用 window 上的 mousemove/mouseup 兜住整个过程：
  // 只在元素上监听时，指针移出元素（快速拖动必然发生）就丢事件。
  const onDragStart = useCallback((e: React.MouseEvent) => {
    const el = dockRef.current;
    if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.style.transition = 'none';

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !dockRef.current) return;
      const node = dockRef.current;
      const size = { w: node.offsetWidth, h: node.offsetHeight };
      const vp = { w: window.innerWidth, h: window.innerHeight };
      const p = clampToViewport({ x: ev.clientX - d.dx, y: ev.clientY - d.dy }, size, vp);
      node.style.left = `${p.x}px`;
      node.style.top = `${p.y}px`;
      node.style.right = 'auto';
      node.style.bottom = 'auto';
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const node = dockRef.current;
      dragRef.current = null;
      if (!node) return;
      node.style.transition = '';
      const rect = node.getBoundingClientRect();
      const p = { x: Math.round(rect.left), y: Math.round(rect.top) };
      setDockPos(p);
      savePosition(p);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const dockStyle: React.CSSProperties = dockPos
    ? { left: dockPos.x, top: dockPos.y, right: 'auto', bottom: 'auto' }
    : {};

  const inputRef = useRef<any>(null);

  /** 队列：列表所见即队列，再按部门快切过滤 */
  const allItems: QueueItem[] = useMemo(() => (resumes ?? []).map((r: any) => ({
    resumeId: Number(r.resumeId),
    name: nameOf(r),
    score: r.resumeScore == null ? null : Number(r.resumeScore),
    mine: myScoreOf(r.scoreEntries, myUserId) ?? null,
    depts: deptsOf(r),
  })), [resumes, myUserId]);

  const items = useMemo(() => filterByDept(allItems, dept), [allItems, dept]);

  // 切部门后的落点：当前这位还在范围里就不打断，否则落到第一位未打分的
  useEffect(() => {
    const landing = landingAfterDeptChange(items, currentId);
    if (landing && landing.resumeId !== currentId) setCurrentId(landing.resumeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept]);

  const current = useMemo(
    () => (resumes ?? []).find((r: any) => Number(r.resumeId) === currentId),
    [resumes, currentId],
  );

  const entries: ScoreEntry[] = (current as any)?.scoreEntries ?? [];
  const avg: number | null = (current as any)?.resumeScore ?? null;
  /** 我已经存下的那一票；有才显示「撤销」 */
  const mySaved = myScoreOf(entries, myUserId);
  // 盲评：我还没打这一位时，打分卡上不露平均分与逐人明细
  const canScore = hasPermission(getToken(), 'resume:audit');
  const reveal = useScoreReveal();
  const peeked = isRevealed(reveal, currentId);
  const blindByDefault = othersHidden(entries, myUserId, canScore);
  const blind = othersHidden(entries, myUserId, canScore, peeked);

  // 我的打分：以 currentId 为 key 重建，切人自动清空（不会残留上一位的分）
  const [score, setScore] = useState<number | undefined>(undefined);
  // 我的评语：同样随人切换重建；评语框开合状态跨人保留（习惯写评语的人一直开着）
  const [comment, setComment] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  useEffect(() => {
    setScore(myScoreOf(entries, myUserId));
    setComment(myCommentOf(entries, myUserId));
    // 进入新的一位时聚焦并全选，直接敲数字即覆盖
    const t = setTimeout(() => inputRef.current?.focus?.({ cursor: 'all' }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, myUserId]);

  const go = useCallback((item: QueueItem | null) => {
    if (item) setCurrentId(item.resumeId);
  }, []);

  const save = useCallback(async (thenNext: boolean) => {
    if (saving) return;
    if (score == null) {
      message.info('先输入 0–100 的分数');
      inputRef.current?.focus?.({ cursor: 'all' });
      return;
    }
    setSaving(true);
    try {
      // 评语总是一起提交（初值就是我原来的评语，没动过等于原样写回；空串即清空）
      const res: any = await updateResumeScore(currentId, score, comment.trim());
      const nextAvg = res?.data?.resumeScore ?? score;
      const nextEntries: ScoreEntry[] = res?.data?.scoreEntries ?? [];
      onScored(currentId, nextAvg, nextEntries);
      if (thenNext) {
        // 本地先把这位标记成已打分，避免「下一位未打分」绕回自己
        const marked = items.map((it) => (it.resumeId === currentId ? { ...it, score: nextAvg, mine: score } : it));
        const next = nextUngradedOf(marked, currentId);
        if (next) { go(next); } else { message.success(`已打分 ${score}，这一批你都打完了`); }
      } else {
        message.success(`已打分 ${score}`);
      }
    } catch (e: any) {
      message.error(e?.message || '打分失败');
    } finally {
      setSaving(false);
    }
  }, [score, comment, saving, currentId, items, onScored, go]);

  // 误触打分后反悔：只撤我这一票。不自动跳人——撤完通常是要当场重打
  const [withdrawing, setWithdrawing] = useState(false);
  const withdraw = useCallback(async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      const res: any = await withdrawResumeScore(currentId);
      const nextAvg: number | null = res?.data?.resumeScore ?? null;
      const nextEntries: ScoreEntry[] = res?.data?.scoreEntries ?? [];
      onScored(currentId, nextAvg, nextEntries);
      setScore(undefined);
      setComment('');
      // 撤完回到盲评，提示里不带剩余平均分
      message.success('已撤销你的打分');
      setTimeout(() => inputRef.current?.focus?.({ cursor: 'all' }), 60);
    } catch (e: any) {
      message.error(e?.message || '撤销打分失败');
    } finally {
      setWithdrawing(false);
    }
  }, [withdrawing, currentId, onScored]);

  // 键盘流：Enter 由输入框的 onPressEnter 接（antd InputNumber 会吞掉冒泡，
  // 挂 window 收不到）；其余键位是全局的，挂 window。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 焦点在下拉/搜索框等控件里时，把键盘完全交还给该控件——
      // 否则回车会被舞台抢走，antd Select 的选项提交不了（实测踩到）
      const t = e.target as HTMLElement | null;
      // 撤销确认气泡也一样：在「撤销」键上回车不能顺手把分又存了一遍
      if (t?.closest?.('.ant-select, .ant-picker, .ant-popover, textarea')) return;
      // Enter 双保险：输入框的 onPressEnter 已接一次，这里兜住焦点不在框内
      // 的情形（点过胶片条/部门下拉之后）。saving 期间忽略，避免重复提交。
      if (e.key === 'Enter' && !e.isComposing) {
        const inInput = (e.target as HTMLElement)?.tagName === 'INPUT';
        if (!inInput) { e.preventDefault(); void save(true); }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); go(neighborOf(items, currentId, 1)); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') { e.preventDefault(); go(neighborOf(items, currentId, -1)); return; }
      // U 跳过：仅在没在输入数字时触发（输入框里 u 不是合法字符，这里仍防一手）
      if ((e.key === 'u' || e.key === 'U') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const next = nextUngradedOf(items, currentId);
        if (next) go(next); else message.info('这一批你都打完了');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, currentId, save, go]);

  const prog = progressOf(items, currentId);

  const chips: FilmChip[] = items.map((it) => ({
    key: it.resumeId,
    name: it.name,
    // 三态：我打过（绿，显示平均分）/ 别人打过、我还没打（橙，待我评）/ 没人打过。
    // 第二态默认不露分；点了小眼睛（单份或全部）就带上平均分
    tag: it.mine != null
      ? `${it.score ?? it.mine}`
      : it.score != null
        ? (isRevealed(reveal, it.resumeId) ? `待我评 · ${it.score}` : '待我评')
        : '未评',
    tagTone: it.mine != null ? 'good' : it.score != null ? 'warn' : 'muted',
    selected: it.resumeId === currentId,
  }));

  return (
    <StageShell
      title="简历打分舞台"
      meta={
        <>
          {cycleName && <span className="scoring-stage__cycle">{cycleName}</span>}
          <span>第 <b>{prog.index}</b> / {prog.total} 位</span>
          <span>我未打分 <b>{prog.ungraded}</b></span>
          {loadingAll && <span className="scoring-stage__loading">正在载入全部筛选结果…</span>}
        </>
      }
      topExtra={
        <>
          {/* 全部的小眼睛：与列表页「显示全部打分」是同一个开关 */}
          {canScore && (
            <Tooltip
              title={reveal.revealAll
                ? '点击恢复盲评：没打过分的简历隐藏他人打分'
                : '显示所有简历的他人打分（底部人员条也带上分数）'}
            >
              <Button
                size="small"
                className={`reveal-all-btn${reveal.revealAll ? ' is-on' : ''}`}
                icon={reveal.revealAll ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={() => setRevealAll(!reveal.revealAll)}
              >
                {reveal.revealAll ? '已显示全部打分' : '显示全部打分'}
              </Button>
            </Tooltip>
          )}
          <Select
            size="small"
            allowClear
            placeholder="全部志愿部门"
            style={{ width: 148 }}
            value={dept}
            onChange={(v) => setDept(v)}
            options={DEPTS.map((d) => ({ value: d, label: d }))}
          />
        </>
      }
      onExit={onExit}
      film={<FilmStrip items={chips} onSelect={(k) => setCurrentId(Number(k))} />}
    >
      <div className="scoring-stage">
        <div className="scoring-stage__paper">
          {current
            ? <ResumeDetail resume={current} backText="" />
            : <div className="scoring-stage__empty">这一批里没有简历，换个部门试试</div>}
        </div>

        {/* 悬浮打分卡：右下角一枚小卡，只放输入框与打分人，可收成圆钮 */}
        {dockFolded ? (
          <div
            className="scoring-stage__dock is-folded"
            ref={dockRef}
            style={dockStyle}
            onMouseDown={onDragStart}
          >
            <Tooltip title="展开打分">
              <Button
                type="primary"
                shape="circle"
                size="large"
                onClick={toggleDock}
                aria-label="展开打分"
              >
                {avg == null ? '评' : avg}
              </Button>
            </Tooltip>
          </div>
        ) : (
          <div className="scoring-stage__dock" ref={dockRef} style={dockStyle}>
            {/* 拖拽手柄：只有这一小块能拖，避免拖动时误触输入框 */}
            <Tooltip title="拖动我，可放到屏幕任意位置">
              <span
                className="scoring-stage__grip"
                onMouseDown={onDragStart}
                aria-label="拖动打分卡"
              >
                <HolderOutlined />
              </span>
            </Tooltip>
            <span className={`scoring-stage__avg${avg == null || blind ? ' is-empty' : ''}`}>
              {avg == null ? '未评' : blind ? '待评' : avg}
            </span>
            <InputNumber
              ref={inputRef}
              min={0}
              max={100}
              value={score}
              onChange={(v) => setScore(v == null ? undefined : Number(v))}
              placeholder="0~100"
              className="scoring-stage__input"
              controls={false}
              onPressEnter={() => void save(true)}
            />
            {/* 不因没填分而禁用：灰键像坏了。没填时点了会提示并聚焦输入框 */}
            <Button type="primary" loading={saving} onClick={() => save(true)}>
              保存 ⏎
            </Button>
            {mySaved != null && (
              <Popconfirm
                title="撤销你的打分？"
                description={`将删除你打的 ${mySaved} 分${myCommentOf(entries, myUserId) ? '和评语' : ''}，其他人的不受影响`}
                okText="撤销"
                cancelText="取消"
                placement="top"
                onConfirm={withdraw}
              >
                <Button
                  type="text"
                  className="scoring-stage__withdraw"
                  icon={<UndoOutlined />}
                  loading={withdrawing}
                  disabled={saving}
                >
                  撤销
                </Button>
              </Popconfirm>
            )}
            {/* 评语：点开在打分卡上方弹出编辑框，随「保存」一起提交 */}
            <Tooltip title={commentOpen ? '收起评语' : comment.trim() ? '编辑我的评语' : '写评语'}>
              <Button
                type="text"
                className={`scoring-stage__comment-btn${comment.trim() ? ' has-comment' : ''}${commentOpen ? ' is-open' : ''}`}
                icon={<CommentOutlined />}
                aria-label="我的评语"
                onClick={() => setCommentOpen((o) => !o)}
              />
            </Tooltip>
            {commentOpen && (
              <div
                className={`scoring-stage__comment-pop${dockPos && dockPos.y < 260 ? ' is-below' : ''}`}
              >
                <div className="scoring-stage__comment-head">
                  <span>我的评语</span>
                  <span className="scoring-stage__comment-hint">随「保存」一起提交 · ⌘/Ctrl + Enter 保存</span>
                </div>
                <Input.TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="亮点、顾虑、面试想追问什么……（可选）"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  maxLength={COMMENT_MAX}
                  showCount
                  autoFocus
                  aria-label="评语内容"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(true); }
                  }}
                />
              </div>
            )}
            <Tooltip
              title={
                entries.length === 0 ? '还没有人打分'
                  : blind ? '打分后可见，或点小眼睛查看'
                    : entries.map((e) => `${scorerLabel(e)} ${e.score}`).join(' · ')
              }
            >
              <span className="scoring-stage__scorers">
                {entries.length === 0
                  ? '还没有人打分'
                  : `${entries.length} 人已打分`}
              </span>
            </Tooltip>
            {/* 单份小眼睛：盲评下查看/收起这一位的他人打分 */}
            {blindByDefault && entries.length > 0 && (
              <Tooltip title={reveal.revealAll ? '已在列表开启「显示全部打分」' : peeked ? '收起他人打分' : '查看他人打分'}>
                <Button
                  type="text"
                  size="small"
                  className="scoring-stage__eye"
                  aria-label={peeked ? '收起他人打分' : '查看他人打分'}
                  icon={peeked ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  disabled={reveal.revealAll}
                  onClick={() => toggleRevealOne(currentId)}
                />
              </Tooltip>
            )}
            <Tooltip
              open={tipOpen}
              onOpenChange={setTipOpen}
              trigger="click"
              placement="topRight"
              title={
                <div className="scoring-stage__keys">
                  {KEYS.map(([k, v]) => (
                    <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
                  ))}
                </div>
              }
            >
              <Button type="text" size="small" icon={<QuestionCircleOutlined />} aria-label="快捷键" />
            </Tooltip>
            <Tooltip title="收起（只留一颗圆钮）">
              <Button
                type="text"
                size="small"
                icon={<DownOutlined />}
                onClick={toggleDock}
                className="scoring-stage__foldbtn"
                aria-label="收起打分"
              />
            </Tooltip>
          </div>
        )}
      </div>
    </StageShell>
  );
};

export default ScoringStage;
