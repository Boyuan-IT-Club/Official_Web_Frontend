import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Progress, Tag, Space, Table, Alert, Button, Empty, Typography, message } from 'antd';
import { GithubOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ScoreTrendChart from '@/components/ScoreTrendChart';
import ReportDetail from '@/components/ReportDetail';
import { fetchMySubmissions, fetchLatestSubmission, fetchTrend } from '@/api/evaluations';
import type { Submission, Report, TrendPoint, Page } from '@/api/evaluations';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import './index.scss';

const { Text, Title } = Typography;

const TASK_LABELS: Record<string, string> = {
  task1: '环境',
  task2: 'Docker',
  task3: 'Linux',
  task4: 'Makefile',
  task5: 'Node/SSH',
};

const Evaluations: React.FC = () => {
  const navigate = useNavigate();
  const userInfo = useSelector((s: RootState) => s.user.userInfo as { github?: string } | undefined);
  const unbound = !userInfo?.github;

  const [latest, setLatest] = useState<Submission | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [history, setHistory] = useState<Page<Submission> | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [latestRes, trendRes, historyRes] = await Promise.all([
        fetchLatestSubmission(),
        fetchTrend(),
        fetchMySubmissions(historyPage, 10),
      ]);
      setLatest((latestRes?.data as Submission) ?? null);
      setTrend((trendRes?.data ?? []) as TrendPoint[]);
      setHistory((historyRes?.data as Page<Submission>) ?? null);
    } catch (e) {
      message.error((e as { message?: string })?.message ?? '加载评测数据失败');
    } finally {
      setLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const latestReport = useMemo<Report | null>(() => {
    if (!latest?.reportJson) return null;
    try {
      return JSON.parse(latest.reportJson) as Report;
    } catch {
      return null;
    }
  }, [latest?.reportJson]);

  const maxTotal = latestReport
    ? Object.values(latestReport.tasks).reduce((sum, t) => sum + (t.max_score ?? 0), 0)
    : 500;

  return (
    <div className="eval-center">
      <Title level={4} className="page-title">autograding 评测</Title>

      {unbound && (
        <Alert
          className="bind-guide"
          type="info"
          showIcon
          message="绑定 GitHub 账号后,你的 Autograder 评测会自动出现在这里"
          action={
            <Button size="small" type="primary" onClick={() => navigate('/main/person')}>
              去绑定
            </Button>
          }
        />
      )}

      {loading && !latest && !history ? (
        <Card loading />
      ) : latest ? (
        <Card className="latest-card">
          <div className="latest-header">
            <div className="latest-score">
              <Text type="secondary">最新总分</Text>
              <div className="score-num">{latest.totalScore}</div>
              <Progress
                percent={Math.round(((latest.totalScore || 0) / maxTotal) * 100)}
                format={() => `${latest.totalScore} / ${maxTotal}`}
              />
            </div>
            <div className="latest-tasks">
              {['task1', 'task2', 'task3', 'task4', 'task5'].map((id) => (
                <Tag key={id} color={latestReport?.tasks?.[id] ? 'blue' : 'default'}>
                  {TASK_LABELS[id]}: {latestReport?.tasks?.[id]?.score ?? '—'}
                </Tag>
              ))}
            </div>
          </div>
          <div className="latest-meta">
            <Text type="secondary">{dayjs(latest.evaluatedAt).format('YYYY-MM-DD HH:mm')}</Text>
            {latest.repository && (
              <a href={latest.repository} target="_blank" rel="noreferrer">
                <GithubOutlined /> 查看仓库
              </a>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Empty description="还没有评测记录,完成招新考核后自动同步" />
        </Card>
      )}

      <Card title="得分趋势" className="trend-card">
        <ScoreTrendChart points={trend} />
      </Card>

      <Card title="提交历史" className="history-card">
        <Table<Submission>
          rowKey="id"
          loading={loading}
          dataSource={history?.content ?? []}
          pagination={{
            current: historyPage + 1,
            pageSize: 10,
            total: history?.totalElements ?? 0,
            showSizeChanger: false,
            onChange: (p) => setHistoryPage(p - 1),
          }}
          expandable={{
            expandedRowRender: (record) => <ReportDetail submission={record} showTotal={false} taskLabels={TASK_LABELS} />,
          }}
          columns={[
            {
              title: '提交时间',
              dataIndex: 'evaluatedAt',
              render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
            },
            {
              title: '总分',
              dataIndex: 'totalScore',
              render: (v: number) => <Text strong>{v}</Text>,
            },
            {
              title: '5 task 摘要',
              key: 'tasks',
              render: (_: unknown, r: Submission) =>
                [r.task1Score, r.task2Score, r.task3Score, r.task4Score, r.task5Score]
                  .map((s) => s ?? '—')
                  .join(' / '),
            },
            {
              title: '',
              key: 'repo',
              width: 90,
              render: (_: unknown, r: Submission) =>
                r.repository ? (
                  <a href={r.repository} target="_blank" rel="noreferrer">
                    <LinkOutlined />
                  </a>
                ) : null,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Evaluations;