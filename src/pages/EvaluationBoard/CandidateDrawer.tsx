// 候选人抽屉：面试时的主要工作面——左手简历、右手打分。
// 同场次的面试官共用这一份评价，谁改都是改在同一处，改动实时可见。
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Avatar, Button, Descriptions, Divider, Drawer, Input, InputNumber,
  Radio, Space, Spin, Statistic, Tabs, Tag, Tooltip, Typography, message,
} from 'antd';
import ResumeQuickView from '@/components/ResumeQuickView';
import {
  CandidateResume, EVALUATION_STATUS, RECOMMENDATION_OPTIONS, getCandidateResume,
} from '@/api/manage/interviewEvaluation';
import {
  BoardRow, CollabBoard, COMMENT_COL, RECOMMENDATION_COL, STATUS_COL,
  useSharedText, weightedTotal,
} from './collab';

const { Text } = Typography;

const fmtDateTime = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—');

export interface CandidateDrawerProps {
  open: boolean;
  onClose: () => void;
  cycleId: number;
  row: BoardRow | null;
  board: CollabBoard;
  currentUserId: number;
}

const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  open, onClose, cycleId, row, board, currentUserId,
}) => {
  const [resume, setResume] = useState<CandidateResume | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const scheduleId = row?.scheduleId;
  const editable = row ? board.canEdit(row) : false;
  const scoreColumns = board.columns.filter((c) => c.type === 'score');

  // 简历按需拉取：名单可能有几百人，没必要在列表阶段就把简历全取回来
  useEffect(() => {
    if (!open || !scheduleId) return;
    let cancelled = false;
    setResume(null);
    setResumeError(null);
    setResumeLoading(true);
    getCandidateResume(cycleId, scheduleId)
      .then((res) => { if (!cancelled) setResume(res?.data ?? null); })
      .catch((e: any) => { if (!cancelled) setResumeError(e?.message || '简历加载失败'); })
      .finally(() => { if (!cancelled) setResumeLoading(false); });
    return () => { cancelled = true; };
  }, [open, cycleId, scheduleId]);

  const readComment = useCallback(
    () => (scheduleId ? board.readCell(scheduleId, COMMENT_COL) : ''),
    [board, scheduleId],
  );
  const writeComment = useCallback(
    (text: string) => { if (scheduleId) board.writeComment(scheduleId, text); },
    [board, scheduleId],
  );
  const [comment, setComment] = useSharedText(readComment, writeComment, board.version);

  if (!row || !scheduleId) {
    return <Drawer open={open} onClose={onClose} width={720} />;
  }

  const scores: Record<string, number> = {};
  scoreColumns.forEach((column) => {
    const raw = board.readCell(scheduleId, column.id);
    if (raw !== '') scores[column.id] = Number(raw);
  });
  const total = weightedTotal(scores, board.columns);
  const recommendation = board.readCell(scheduleId, RECOMMENDATION_COL);
  const submitted = Number(board.readCell(scheduleId, STATUS_COL)) === EVALUATION_STATUS.SUBMITTED;

  const nameOf = (userId: number) =>
    (userId === currentUserId ? '我' : board.interviewerNames[userId]) || `面试官 #${userId}`;

  // 同时打开这位候选人的同事，编辑时可据此知道「现在还有谁在这一页上」
  const peersHere = board.peers.filter((p) => p.activeScheduleId === scheduleId);

  const notEditableReason = () => {
    if (board.locked) return '评价表已锁定，当前为只读状态。';
    if (board.status !== 'connected') return '尚未连上协同服务，暂时无法编辑。';
    if (row.removed) return '该候选人已被移出名单，历史评价保留但不可再修改。';
    if (!row.interviewerUserIds.includes(currentUserId)) {
      return '你不是该场次的面试官，只能查看。如需评价请让管理员在「场次」里绑定你。';
    }
    return null;
  };
  const blockedReason = notEditableReason();

  const evaluationTab = (
    <>
      {blockedReason && <Alert type="info" showIcon message={blockedReason} style={{ marginBottom: 16 }} />}

      {peersHere.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Space size={4} wrap>
              {peersHere.map((peer) => (
                <Tooltip key={peer.clientId} title={peer.name}>
                  <Avatar size={18} style={{ backgroundColor: peer.color, fontSize: 10 }}>
                    {peer.name.slice(0, 1)}
                  </Avatar>
                </Tooltip>
              ))}
              <span>也在这位候选人的评价上，你们的改动会实时合并到同一份记录里</span>
            </Space>
          }
        />
      )}

      <Space size={24} wrap align="start" style={{ marginBottom: 8 }}>
        {scoreColumns.map((column) => (
          <div key={column.id}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
              {column.label}
              <Text type="secondary" style={{ marginLeft: 4 }}>/ {column.maxScore}</Text>
            </div>
            <InputNumber
              min={0}
              max={column.maxScore}
              step={1}
              disabled={!editable}
              style={{ width: 120 }}
              value={scores[column.id] ?? null}
              onChange={(value) => board.writeScore(scheduleId, column.id, value === null ? null : Number(value))}
            />
          </div>
        ))}
        <Statistic title="加权总分" value={total ?? '—'} precision={total === null ? undefined : 2} />
      </Space>

      <Divider orientation="left" plain>推荐意见</Divider>
      <Radio.Group
        disabled={!editable}
        value={recommendation === '' ? null : Number(recommendation)}
        onChange={(e) => board.writeRecommendation(scheduleId, e.target.value)}
      >
        {RECOMMENDATION_OPTIONS.map((option) => (
          <Radio.Button key={option.value} value={option.value}>{option.label}</Radio.Button>
        ))}
      </Radio.Group>
      {recommendation !== '' && editable && (
        <Button type="link" onClick={() => board.writeRecommendation(scheduleId, null)}>清除</Button>
      )}

      <Divider orientation="left" plain>面试记录与评语</Divider>
      <Input.TextArea
        rows={8}
        disabled={!editable}
        placeholder="本场面试官共同记录候选人的表现、亮点与顾虑，输入即同步"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <Divider />
      <Space>
        <Button
          type={submitted ? 'default' : 'primary'}
          disabled={!editable}
          onClick={() => {
            board.writeStatus(scheduleId, submitted ? EVALUATION_STATUS.DRAFT : EVALUATION_STATUS.SUBMITTED);
            message.success(submitted ? '已改回进行中' : '已定稿');
          }}
        >
          {submitted ? '撤回定稿' : '标记为定稿'}
        </Button>
        <Text type="secondary">
          {submitted
            ? '已定稿，管理员可在汇总里看到；本场任一面试官都可以撤回'
            : '内容随时实时保存，定稿只是给管理员一个「本场评完了」的信号'}
        </Text>
      </Space>
    </>
  );

  const resumeTab = (() => {
    if (resumeLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
    if (resumeError) return <Alert type="error" showIcon message={resumeError} />;
    return <ResumeQuickView resume={resume} emptyText="该候选人这一周期的简历没有填写内容" />;
  })();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
      title={
        <Space wrap>
          <span>{row.candidateName || `候选人 #${row.scheduleId}`}</span>
          {row.deptName && <Tag color="blue">{row.deptName}</Tag>}
          {row.removed && <Tag color="red">已移出名单</Tag>}
        </Space>
      }
    >
      <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="面试时间">{fmtDateTime(row.interviewTime)}</Descriptions.Item>
        <Descriptions.Item label="账号">{row.account || '—'}</Descriptions.Item>
        <Descriptions.Item label="本场面试官" span={2}>
          <Space size={4} wrap>
            {row.interviewerUserIds.length === 0
              ? <Text type="secondary">尚未绑定</Text>
              : row.interviewerUserIds.map((id) => (
                <Tag key={id} color={id === currentUserId ? 'blue' : undefined}>{nameOf(id)}</Tag>
              ))}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        items={[
          { key: 'evaluation', label: '评价', children: evaluationTab },
          { key: 'resume', label: '简历', children: resumeTab },
        ]}
      />
    </Drawer>
  );
};

export default CandidateDrawer;
