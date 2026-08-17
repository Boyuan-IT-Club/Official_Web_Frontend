// 在线协同面试评价表：同场次的面试官共同维护每位候选人的那一份评价，
// 改动经 CRDT 实时合并，无需保存按钮。单元格内容不走 REST，而是直连协同服务的 WebSocket，见 ./collab.ts。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Badge, Button, Card, Checkbox, Empty, Input, InputNumber, Popconfirm,
  Result, Select, Space, Spin, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import { LockOutlined, SettingOutlined, UnlockOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { getToken, parseJwtPayload } from '@/utils';
import { hasPermission } from '@/utils/jwt';
import { RecruitmentCycle, getAllCycles } from '@/api/manage/cycleApis';
import {
  EVALUATION_STATUS, EvaluationBoard as EvaluationBoardState, RECOMMENDATION_OPTIONS,
  getBoard, openBoard, setBoardLocked,
} from '@/api/manage/interviewEvaluation';
import CandidateDrawer from './CandidateDrawer';
import DimensionSettings from './DimensionSettings';
import { BoardRow, RowEvaluation, useCollabBoard } from './collab';
import './index.scss';

const { Text } = Typography;

const fmtDateTime = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—');

const RECOMMENDATION_COLOR: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' };

const STATUS_TEXT: Record<string, { color: string; text: string }> = {
  connecting: { color: 'processing', text: '连接中' },
  connected: { color: 'success', text: '已连接' },
  disconnected: { color: 'warning', text: '已断开，正在重连' },
  error: { color: 'error', text: '连接失败' },
};

/** 一行的派生数据：把文档里散落的单元格算成表格要显示的样子 */
interface DerivedRow extends BoardRow {
  evaluation: RowEvaluation;
  submitted: boolean;
}

const EvaluationBoardPage: React.FC = () => {
  const token = getToken();
  const { userInfo } = useSelector((state: any) => state.user);
  const jwt = useMemo(() => (token ? parseJwtPayload(token) : null), [token]);

  const currentUserId = Number(userInfo?.userId ?? jwt?.userId ?? 0);
  const currentUserName = String(userInfo?.name || userInfo?.username || jwt?.sub || '我');
  const isAdmin = hasPermission(token, 'resume:audit');

  const [cycles, setCycles] = useState<RecruitmentCycle[]>([]);
  const [cycleId, setCycleId] = useState<number | undefined>();
  const [initializing, setInitializing] = useState(true);

  const [boardState, setBoardState] = useState<EvaluationBoardState | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [opening, setOpening] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [activeRow, setActiveRow] = useState<BoardRow | null>(null);
  const [dimensionOpen, setDimensionOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAllCycles();
        const list: RecruitmentCycle[] = (res as any)?.data ?? [];
        setCycles(list);
        const active = list.find((c) => c.isActive === 1);
        setCycleId(active?.cycleId ?? list[list.length - 1]?.cycleId);
      } catch (e: any) {
        message.error(e?.message || '加载招募周期失败');
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const loadBoard = useCallback(async (id: number) => {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const res = await getBoard(id);
      setBoardState(res?.data ?? null);
    } catch (e: any) {
      setBoardState(null);
      setBoardError(e?.message || '评价表尚未开启');
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cycleId) loadBoard(cycleId);
  }, [cycleId, loadBoard]);

  const board = useCollabBoard({
    docName: boardState?.docName,
    token,
    userId: currentUserId,
    userName: currentUserName,
  });

  const scoreColumns = board.columns.filter((c) => c.type === 'score');

  // 文档每变一次就整体重算：单元格散落在 Y.Map 里，逐格现算会让每列渲染都遍历一遍整行
  const derivedRows = useMemo<DerivedRow[]>(() => board.rows.map((row) => {
    const evaluation = board.readEvaluation(row.scheduleId);
    return {
      ...row,
      evaluation,
      submitted: evaluation.status === EVALUATION_STATUS.SUBMITTED,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [board.version, board.rows, board.columns]);

  const visibleRows = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return derivedRows.filter((row) => {
      if (onlyMine && !row.interviewerUserIds.includes(currentUserId)) return false;
      if (onlyPending && row.submitted) return false;
      if (!text) return true;
      return `${row.candidateName}${row.account ?? ''}${row.deptName ?? ''}`.toLowerCase().includes(text);
    });
  }, [derivedRows, keyword, onlyMine, onlyPending, currentUserId]);

  const myPendingCount = useMemo(
    () => derivedRows.filter((row) => row.interviewerUserIds.includes(currentUserId) && !row.submitted).length,
    [derivedRows, currentUserId],
  );

  const handleOpenBoard = async () => {
    if (!cycleId) return;
    setOpening(true);
    try {
      const res = await openBoard(cycleId);
      setBoardState(res?.data ?? null);
      setBoardError(null);
      message.success('评价表已开启');
    } catch (e: any) {
      message.error(e?.message || '开启失败');
    } finally {
      setOpening(false);
    }
  };

  const handleToggleLock = async () => {
    if (!cycleId || !boardState) return;
    try {
      const res = await setBoardLocked(cycleId, !boardState.locked);
      setBoardState(res?.data ?? null);
      message.success(boardState.locked ? '已解锁，面试官可以继续填写' : '已锁定，全员转为只读');
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const peersOnRow = useCallback(
    (scheduleId: number) => board.peers.filter((p) => p.activeScheduleId === scheduleId),
    [board.peers],
  );

  const cycleOptions = cycles.map((c) => ({ value: c.cycleId, label: `${c.cycleName}（#${c.cycleId}）` }));

  // 打开详情的同时广播「我在看谁」，其他人的表格里会在该行出现我的头像
  const openRow = (row: BoardRow) => {
    setActiveRow(row);
    board.setActiveRow(row.scheduleId);
  };

  const closeRow = () => {
    setActiveRow(null);
    board.setActiveRow(null);
  };

  const columns: any[] = [
    {
      title: '候选人',
      dataIndex: 'candidateName',
      fixed: 'left',
      width: 180,
      render: (name: string, row: DerivedRow) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <span style={{ fontWeight: 500 }}>{name || `#${row.scheduleId}`}</span>
            {row.removed && <Tag color="red">已移出</Tag>}
            {peersOnRow(row.scheduleId).map((peer) => (
              <Tooltip key={peer.clientId} title={`${peer.name} 正在查看`}>
                <Avatar size={18} style={{ backgroundColor: peer.color, fontSize: 10 }}>
                  {peer.name.slice(0, 1)}
                </Avatar>
              </Tooltip>
            ))}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.deptName || '—'}</Text>
        </Space>
      ),
    },
    {
      title: '面试时间',
      dataIndex: 'interviewTime',
      width: 140,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{fmtDateTime(v)}</Text>,
    },
    ...scoreColumns.map((column) => ({
      title: (
        <Tooltip title={`满分 ${column.maxScore}，权重 ${column.weight}`}>
          <span>{column.label}</span>
        </Tooltip>
      ),
      key: column.id,
      width: 110,
      render: (_v: unknown, row: DerivedRow) => {
        const score = row.evaluation.scores[column.id];
        if (board.canEdit(row)) {
          return (
            <InputNumber
              size="small"
              min={0}
              max={column.maxScore}
              style={{ width: 76 }}
              value={score ?? null}
              onChange={(value) => board.writeScore(row.scheduleId, column.id, value === null ? null : Number(value))}
            />
          );
        }
        return score === undefined ? <Text type="secondary">—</Text> : <span>{score}</span>;
      },
    })),
    {
      title: '加权总分',
      key: 'total',
      width: 100,
      render: (_v: unknown, row: DerivedRow) => (row.evaluation.totalScore === null
        ? <Text type="secondary">—</Text>
        : <Text strong>{row.evaluation.totalScore}</Text>),
    },
    {
      title: '推荐意见',
      key: 'recommendation',
      width: 130,
      render: (_v: unknown, row: DerivedRow) => {
        const value = row.evaluation.recommendation;
        if (!board.canEdit(row)) {
          return value
            ? <Tag color={RECOMMENDATION_COLOR[value]}>
              {RECOMMENDATION_OPTIONS.find((o) => o.value === value)?.label}
            </Tag>
            : <Text type="secondary">—</Text>;
        }
        return (
          <Select
            size="small"
            allowClear
            style={{ width: 110 }}
            placeholder="选择"
            value={value ?? undefined}
            options={RECOMMENDATION_OPTIONS as any}
            onChange={(next) => board.writeRecommendation(row.scheduleId, next ?? null)}
          />
        );
      },
    },
    {
      title: '状态',
      key: 'progress',
      width: 110,
      render: (_v: unknown, row: DerivedRow) => (row.submitted
        ? <Badge status="success" text="已定稿" />
        : <Badge status={row.evaluation.empty ? 'default' : 'processing'} text={row.evaluation.empty ? '未开始' : '进行中'} />),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_v: unknown, row: DerivedRow) => (
        <Button type="link" size="small" onClick={() => openRow(row)}>详情</Button>
      ),
    },
  ];

  if (initializing) {
    return <div className="evaluation-board__loading"><Spin size="large" /></div>;
  }

  if (!cycleId) {
    return <Alert type="warning" showIcon message="请先在「招募周期」页创建周期" />;
  }

  const statusTag = STATUS_TEXT[board.status] ?? STATUS_TEXT.connecting;

  return (
    <Card
      className="evaluation-board"
      title={
        <Space wrap>
          <span>面试评价表</span>
          <Select
            style={{ minWidth: 220 }}
            value={cycleId}
            onChange={setCycleId}
            options={cycleOptions}
            placeholder="选择周期"
          />
        </Space>
      }
      extra={
        <Space wrap>
          {boardState && <Badge status={statusTag.color as any} text={statusTag.text} />}
          {board.locked && <Tag icon={<LockOutlined />} color="red">已锁定</Tag>}
          {board.peers.length > 0 && (
            <Avatar.Group max={{ count: 5 }} size="small">
              {board.peers.map((peer) => (
                <Tooltip key={peer.clientId} title={peer.name}>
                  <Avatar style={{ backgroundColor: peer.color }}>{peer.name.slice(0, 1)}</Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          )}
          {isAdmin && boardState && (
            <>
              <Button icon={<SettingOutlined />} onClick={() => setDimensionOpen(true)}>评分维度</Button>
              <Popconfirm
                title={boardState.locked ? '解锁评价表？' : '锁定评价表？'}
                description={boardState.locked
                  ? '解锁后面试官可以继续填写。'
                  : '锁定后全员转为只读，在线的人会被断开并以只读身份重连。'}
                onConfirm={handleToggleLock}
              >
                <Button icon={boardState.locked ? <UnlockOutlined /> : <LockOutlined />}>
                  {boardState.locked ? '解锁' : '锁定'}
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      }
    >
      {boardLoading && <div className="evaluation-board__loading"><Spin /></div>}

      {!boardLoading && !boardState && (
        <Result
          status="info"
          title="该周期的评价表还没有开启"
          subTitle={isAdmin
            ? `${boardError ?? ''} 开启后会按已分配的面试名单生成表格，面试官即可开始填写。`
            : `${boardError ?? ''} 请联系管理员开启。`}
          extra={isAdmin && (
            <Button type="primary" loading={opening} onClick={handleOpenBoard}>开启评价表</Button>
          )}
        />
      )}

      {!boardLoading && boardState && (
        <>
          {board.status === 'error' && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message="协同服务连接失败"
              description={board.errorMessage}
            />
          )}

          <Space wrap style={{ marginBottom: 16 }}>
            <Input.Search
              allowClear
              placeholder="搜索姓名 / 账号 / 部门"
              style={{ width: 240 }}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Checkbox checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)}>
              只看我负责的
            </Checkbox>
            <Checkbox checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)}>
              只看未定稿的
            </Checkbox>
            {myPendingCount > 0 && (
              <Text type="secondary">我负责的候选人里还有 {myPendingCount} 位未定稿</Text>
            )}
          </Space>

          <Table
            rowKey="scheduleId"
            size="small"
            columns={columns}
            dataSource={visibleRows}
            scroll={{ x: 'max-content' }}
            pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 人` }}
            rowClassName={(row: DerivedRow) => (row.removed ? 'evaluation-board__row--removed' : '')}
            onRow={(row: DerivedRow) => ({ onDoubleClick: () => openRow(row) })}
            locale={{
              emptyText: board.synced
                ? <Empty description="没有符合条件的候选人" />
                : <Spin tip="正在同步评价表…"><div style={{ padding: 24 }} /></Spin>,
            }}
          />
        </>
      )}

      <CandidateDrawer
        open={activeRow !== null}
        onClose={closeRow}
        cycleId={cycleId}
        row={activeRow}
        board={board}
        currentUserId={currentUserId}
      />

      {isAdmin && (
        <DimensionSettings
          open={dimensionOpen}
          cycleId={cycleId}
          onClose={() => setDimensionOpen(false)}
          onSaved={() => loadBoard(cycleId)}
        />
      )}
    </Card>
  );
};

export default EvaluationBoardPage;
