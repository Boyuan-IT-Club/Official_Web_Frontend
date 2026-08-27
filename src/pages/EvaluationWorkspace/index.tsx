// 面试评价工作台（独立页面）：左手简历、右手逐维度评价。
//
// 为什么单独做一页而不是继续用抽屉：
//   - 原先抽屉里「评价」「简历」是两个 Tab，面试时想看简历就得离开评价面板，来回点
//   - 抽屉最宽 720px，塞不下左右分栏
//   - 独立页面有自己的 URL，可以直接把链接发给同场的另一位面试官
//
// 评价按维度拆分：每个维度一张卡（分数 + 独立文字框 + 作者署名），
// 而不是"几个分数 + 一个总评语框"。署名来自服务端的单元格级写入记录。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Button, Empty, InputNumber, List, Result, Select, Space, Spin, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { getToken } from '@/utils';
import { parseJwtPayload } from '@/utils/jwt';
import ResumeQuickView from '@/components/ResumeQuickView';
import { getCandidateResume, getCandidateProfileDetail, getEvaluationSummary, type CandidateProfileDetailForWorkspace, type CandidateAward, type CandidateSubmission } from '@/api/manage/interviewEvaluation';
import CollabTextArea from '../EvaluationBoard/CollabTextArea';
import {
  COMMENT_COL,
  dimensionColId,
  dimensionNoteColId,
  peerColor,
  useCollabBoard,
  useSharedText,
  weightedTotal,
  type BoardColumn,
  type BoardRow,
} from '../EvaluationBoard/collab';
import './index.scss';

const RECOMMENDATION_OPTIONS = [
  { value: 1, label: '倾向通过' },
  { value: 2, label: '待定' },
  { value: 3, label: '不倾向' },
];

/** 一个维度的评价卡：分数 + 独立评语 + 这一项是谁评的 */
const DimensionCard: React.FC<{
  column: BoardColumn;
  scheduleId: number;
  board: ReturnType<typeof useCollabBoard>;
  disabled: boolean;
  writerName?: string;
}> = ({ column, scheduleId, board, disabled, writerName }) => {
  const dimensionId = column.dimensionId as number;
  const score = board.readCell(scheduleId, dimensionColId(dimensionId));

  const [note, setNote] = useSharedText(
    () => board.readCell(scheduleId, dimensionNoteColId(dimensionId)),
    (text) => board.writeDimensionNote(scheduleId, dimensionId, text),
    board.version,
  );

  const filled = score !== '' || note.trim() !== '';

  return (
    <div className={`dim-card${filled ? '' : ' dim-card-empty'}`}>
      <div className="dim-card-head">
        <span className="dim-name">{column.label}</span>
        <span className="dim-score">
          <InputNumber
            size="small"
            min={0}
            max={column.maxScore ?? 10}
            value={score === '' ? null : Number(score)}
            disabled={disabled}
            placeholder="—"
            controls={false}
            onChange={(v) =>
              board.writeScore(scheduleId, dimensionColId(dimensionId), v === null ? null : Number(v))
            }
            style={{ width: 52 }}
          />
          <span className="dim-max">/ {column.maxScore ?? 10}</span>
        </span>
        {writerName && (
          <Tooltip title="这一项的评价由该面试官写入，取自服务端记录">
            <span className="dim-writer">{writerName}</span>
          </Tooltip>
        )}
      </div>
      <CollabTextArea
        board={board}
        scheduleId={scheduleId}
        field={dimensionNoteColId(dimensionId)}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={disabled}
        autoSize={{ minRows: 2, maxRows: 6 }}
        placeholder={`${column.label}的具体表现…`}
        variant="borderless"
        className="dim-note"
      />
    </div>
  );
};

const EvaluationWorkspace: React.FC = () => {
  const { cycleId: cycleIdParam, scheduleId: scheduleIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cycleId = Number(cycleIdParam ?? searchParams.get('cycleId'));
  const scheduleId = Number(scheduleIdParam);
  const token = getToken();
  const { userInfo } = useSelector((state: any) => state.user);
  const jwt = useMemo(() => (token ? parseJwtPayload(token) : null), [token]);
  // 与评价表页保持同一取法：userInfo 优先，未加载时退回 JWT
  const userId = Number(userInfo?.userId ?? jwt?.userId ?? 0);
  const userName = String(userInfo?.name || userInfo?.username || jwt?.sub || '我');

  const board = useCollabBoard({
    docName: Number.isFinite(cycleId) ? `eval-board:${cycleId}` : '',
    token,
    userId,
    userName,
  });

  const row: BoardRow | undefined = useMemo(
    () => board.rows.find((r) => r.scheduleId === scheduleId),
    [board.rows, scheduleId],
  );

  // 广播「我在这位候选人上」：评价表页的行内头像、抽屉里的同伴提示都靠它。
  // 原先只有抽屉会广播，从工作台进来的人对同事是隐身的。
  const { setActiveRow } = board;
  useEffect(() => {
    if (!board.synced || !Number.isFinite(scheduleId)) return undefined;
    setActiveRow(scheduleId);
    return () => setActiveRow(null);
  }, [board.synced, setActiveRow, scheduleId]);

  const dimensionColumns = useMemo(
    () => board.columns.filter((c) => c.type === 'score' && c.dimensionId != null),
    [board.columns],
  );

  // 简历：按需拉取，评价表名单可能几百人，不该在列表阶段就全取回来
  const [resume, setResume] = useState<any>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  useEffect(() => {
    if (!Number.isFinite(cycleId) || !Number.isFinite(scheduleId)) return;
    let cancelled = false;
    getCandidateResume(cycleId, scheduleId)
      .then((res: any) => { if (!cancelled) setResume(res?.data ?? null); })
      .catch((e: any) => { if (!cancelled) setResumeError(e?.message || '简历加载失败'); });
    return () => { cancelled = true; };
  }, [cycleId, scheduleId]);

  // 候选人的获奖经历 + Autograding 成绩（全部周期汇总），供面试官打分时参考。
  // 取 row.userId（候选人），绝不能用当前用户的 userId（那是面试官自己）。
  // 拉取失败静默——不影响打分本身。
  const [candidateDetail, setCandidateDetail] = useState<CandidateProfileDetailForWorkspace | null>(null);
  useEffect(() => {
    const candidateUserId = Number(row?.userId);
    if (!Number.isFinite(candidateUserId) || candidateUserId <= 0) {
      setCandidateDetail(null);
      return;
    }
    let cancelled = false;
    setCandidateDetail(null); // 切候选人先清空，避免残留上一位的数据
    getCandidateProfileDetail(candidateUserId)
      .then((res) => { if (!cancelled) setCandidateDetail(res?.data ?? null); })
      .catch(() => { /* 获奖/成绩拿不到不阻塞打分，静默 */ });
    return () => { cancelled = true; };
  }, [row?.userId]);

  // 维度署名：来自物化后的汇总接口（协同文档里不存作者，那是服务端旁路记录的）。
  // 因此署名会滞后于正在输入的内容，最多一个物化防抖周期（30s）；
  // 「谁正在编辑」由下面的在线成员实时体现，两者互补。
  const [writers, setWriters] = useState<Record<number, string>>({});
  const [lastEditedByName, setLastEditedByName] = useState<string | null>(null);
  const loadWriters = useCallback(() => {
    if (!Number.isFinite(cycleId)) return;
    getEvaluationSummary(cycleId)
      .then((res: any) => {
        const me = (res?.data?.candidates ?? []).find((c: any) => c.scheduleId === scheduleId);
        const map: Record<number, string> = {};
        Object.entries(me?.dimensionWriters ?? {}).forEach(([dimId, w]: [string, any]) => {
          if (w?.name) map[Number(dimId)] = w.name;
        });
        setWriters(map);
        setLastEditedByName(me?.lastEditedByName ?? null);
      })
      .catch(() => { /* 署名拿不到不影响评价本身，静默 */ });
  }, [cycleId, scheduleId]);
  useEffect(() => { loadWriters(); }, [loadWriters]);

  const [overallComment, setOverallComment] = useSharedText(
    () => board.readCell(scheduleId, 'comment'),
    (text) => board.writeComment(scheduleId, text),
    board.version,
  );

  if (!Number.isFinite(cycleId) || !Number.isFinite(scheduleId)) {
    return <Result status="404" title="链接不完整" subTitle="缺少周期或候选人参数" />;
  }
  if (!board.synced) {
    return (
      <div className="eval-ws-loading">
        <Spin tip={board.errorMessage ?? '正在连接协同服务…'} />
        {board.errorMessage && (
          <Alert type="error" showIcon style={{ marginTop: 16 }} message={board.errorMessage} />
        )}
      </div>
    );
  }
  if (!row) {
    return (
      <Result
        status="warning"
        title="这位候选人不在本周期的评价表里"
        extra={<Button onClick={() => navigate('/evaluation')}>返回评价表</Button>}
      />
    );
  }

  const evaluation = board.readEvaluation(scheduleId);
  const editable = board.canEdit(row) && !board.readOnly && !board.locked;
  const total = weightedTotal(evaluation.scores, board.columns);
  const submitted = Number(board.readCell(scheduleId, 'status')) === 2;

  return (
    <div className="eval-ws">
      <div className="eval-ws-bar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/evaluation')}>
          评价表
        </Button>
        <span className="ws-name">{row.candidateName || `候选人 #${row.scheduleId}`}</span>
        {row.deptName && <Tag color="processing">{row.deptName}</Tag>}
        <span className="ws-meta">
          {row.account || '—'} · {row.interviewTime ? String(row.interviewTime).replace('T', ' ').slice(5, 16) : '时间未定'}
        </span>
        <span className="ws-total">加权总分 {total ?? '—'}</span>

        <Space size={4} style={{ marginLeft: 'auto' }}>
          {board.peers.map((p) => (
            <Tooltip key={p.clientId} title={`${p.name} 在线`}>
              <Avatar size={22} style={{ background: peerColor(p.userId), fontSize: 11 }}>
                {p.name.slice(0, 1)}
              </Avatar>
            </Tooltip>
          ))}
          {board.locked && <Tag icon={<LockOutlined />}>已锁定</Tag>}
          {submitted ? (
            <Button size="small" disabled={!editable} onClick={() => board.writeStatus(scheduleId, 1)}>
              撤回定稿
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={!editable}
              onClick={() => {
                board.writeStatus(scheduleId, 2);
                message.success('已定稿，可随时撤回修改');
              }}
            >
              定稿
            </Button>
          )}
        </Space>
      </div>

      {!editable && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            board.locked
              ? '评价表已锁定，当前为只读'
              : '你没有被排在这场面试上，因此只能查看'
          }
        />
      )}

      <div className="eval-ws-split">
        <section className="ws-pane ws-resume">
          <div className="ws-pane-title">简历</div>
          {resumeError
            ? <Alert type="error" showIcon message={resumeError} />
            : <ResumeQuickView resume={resume} emptyText="该候选人这一周期的简历没有填写内容" />}

          {candidateDetail && (
            <>
              <div className="ws-pane-title" style={{ marginTop: 20 }}>Autograding 评测成绩</div>
              {candidateDetail.submissions?.length ? (
                <Table<CandidateSubmission>
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={candidateDetail.submissions}
                  columns={[
                    { title: 'GitHub', dataIndex: 'githubUsername', key: 'github' },
                    { title: '提交时间', dataIndex: 'evaluatedAt', key: 'time' },
                    {
                      title: '得分',
                      key: 'score',
                      render: (_: unknown, s: CandidateSubmission) =>
                        s.maxScore ? `${s.totalScore ?? 0}/${s.maxScore}` : (String(s.totalScore ?? '—')),
                    },
                  ]}
                />
              ) : (
                <Typography.Text type="secondary">暂无评测提交</Typography.Text>
              )}

              <div className="ws-pane-title" style={{ marginTop: 20 }}>获奖经历</div>
              <List
                size="small"
                dataSource={candidateDetail.awards}
                locale={{ emptyText: <Typography.Text type="secondary">暂无获奖记录</Typography.Text> }}
                renderItem={(a: CandidateAward) => (
                  <List.Item
                    actions={a.awardTime ? [<Typography.Text type="secondary" key="t">{a.awardTime}</Typography.Text>] : undefined}
                  >
                    <List.Item.Meta
                      title={a.awardName}
                      description={a.description || undefined}
                    />
                  </List.Item>
                )}
              />
            </>
          )}
        </section>

        <section className="ws-pane ws-eval">
          <div className="ws-pane-title">
            评价
            <span className="ws-pane-hint">每个维度独立记录</span>
          </div>

          {dimensionColumns.length === 0 ? (
            <Empty description="本周期还没有配置评分维度" />
          ) : (
            dimensionColumns.map((column) => (
              <DimensionCard
                key={column.id}
                column={column}
                scheduleId={scheduleId}
                board={board}
                disabled={!editable}
                writerName={writers[column.dimensionId as number]}
              />
            ))
          )}

          <div className="ws-conclusion">
            <div className="ws-conclusion-row">
              <span className="ws-label">共同结论</span>
              <Select
                size="small"
                style={{ width: 130 }}
                placeholder="未填"
                allowClear
                disabled={!editable}
                value={evaluation.recommendation ?? undefined}
                options={RECOMMENDATION_OPTIONS}
                onChange={(v) => board.writeRecommendation(scheduleId, v ?? null)}
              />
              {lastEditedByName && (
                <span className="ws-last-edit">最后修改：{lastEditedByName}</span>
              )}
            </div>
            <CollabTextArea
              board={board}
              scheduleId={scheduleId}
              field={COMMENT_COL}
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              disabled={!editable}
              autoSize={{ minRows: 2, maxRows: 5 }}
              placeholder="总体结论（可选，维度评价之外的补充）"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default EvaluationWorkspace;
