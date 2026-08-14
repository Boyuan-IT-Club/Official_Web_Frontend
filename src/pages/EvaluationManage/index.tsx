import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs,
  Table,
  Select,
  InputNumber,
  Input,
  Button,
  Tag,
  Space,
  Drawer,
  Modal,
  List,
  Empty,
  message,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined, GithubOutlined, TrophyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCandidates, getSubmissions, getSubmissionDetail, claimSubmission } from '@/api/manage/evaluationAdmin';
import type { CandidateRow, Submission, Page } from '@/api/manage/evaluationAdmin';
import ReportDetail from '@/components/ReportDetail';
import { getAllCycles } from '@/api/manage/cycleApis';
import { getValidDept } from '@/api/manage/deptManage';
import { globalSearch } from '@/api/manage/userApis';
import './index.scss';

const { Text } = Typography;

interface Filters {
  cycleId?: number;
  deptId?: number;
  minScore?: number;
  maxScore?: number;
  claimed: string;
}

interface SearchUser {
  userId?: number;
  name?: string;
  email?: string;
  [k: string]: unknown;
}

const CLAIMED_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'claimed', label: '已认领' },
  { value: 'unclaimed', label: '未认领' },
];

const EvaluationManage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<Filters>({ claimed: 'all' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState<Page<CandidateRow> | null>(null);
  const [loading, setLoading] = useState(false);

  const [cycles, setCycles] = useState<{ cycleId: number; cycleName: string }[]>([]);
  const [depts, setDepts] = useState<{ deptId: number; deptName: string }[]>([]);

  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  const [claimTarget, setClaimTarget] = useState<Submission | null>(null);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const sortBy = activeTab === 'leaderboard' ? 'maxScore' : 'latest';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCandidates({
        cycleId: filters.cycleId,
        deptId: filters.deptId,
        minScore: filters.minScore,
        maxScore: filters.maxScore,
        claimed: filters.claimed,
        sortBy,
        page,
        size,
      });
      setData((res?.data as Page<CandidateRow>) ?? null);
    } catch (e) {
      message.error((e as { message?: string })?.message ?? '加载评测列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getAllCycles().then((res) => setCycles((res?.data ?? []) as { cycleId: number; cycleName: string }[])).catch(() => undefined);
    void getValidDept()
      .then((res) => {
        const list = Array.isArray(res?.data) ? (res.data as { deptId: number; deptName: string }[]) : [];
        setDepts(list);
      })
      .catch(() => undefined);
  }, []);

  const openDrawer = async (row: CandidateRow) => {
    const key = row.userId != null ? row.userId : row.githubUsername;
    setDrawerKey(String(key));
    setDrawerTitle(row.userName || row.githubUsername);
    setSelectedSubmissionId(null);
    setSubLoading(true);
    try {
      const res = await getSubmissions(key);
      const list = (res?.data ?? []) as Submission[];
      setSubmissions(list);
      if (list.length > 0) setSelectedSubmissionId(list[0].id);
    } catch (e) {
      message.error((e as { message?: string })?.message ?? '加载提交历史失败');
    } finally {
      setSubLoading(false);
    }
  };

  const selectedSubmission = submissions.find((s) => s.id === selectedSubmissionId) ?? null;

  const searchUser = async (keyword: string) => {
    if (!keyword.trim()) return;
    setSearchLoading(true);
    try {
      const res = await globalSearch({ keyword: keyword.trim() });
      const d = res?.data;
      const list = Array.isArray(d) ? d : (d?.content ?? d?.records ?? []);
      setSearchUsers(list as SearchUser[]);
    } catch {
      setSearchUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const doClaim = async (userId?: number) => {
    if (!claimTarget || userId == null) return;
    try {
      await claimSubmission(claimTarget.id, userId);
      message.success('认领成功');
      setClaimTarget(null);
      setSearchUsers([]);
      await load();
      if (drawerKey) {
        const res = await getSubmissions(drawerKey);
        setSubmissions((res?.data ?? []) as Submission[]);
      }
    } catch (e) {
      message.error((e as { message?: string })?.message ?? '认领失败');
    }
  };

  const columns = useMemo(() => {
    const base: TableProps<CandidateRow>['columns'] = [
      ...(activeTab === 'leaderboard'
        ? [
            {
              title: '名次',
              key: 'rank',
              width: 70,
              render: (_: unknown, __: CandidateRow, index: number) => {
                const rank = page * size + index + 1;
                return rank <= 3 ? <span className={`rank rank-${rank}`}>{rank}</span> : <span className="rank">{rank}</span>;
              },
            },
          ]
        : []),
      {
        title: '姓名',
        dataIndex: 'userName',
        key: 'userName',
        render: (_: unknown, row: CandidateRow) =>
          row.userId != null ? (
            <Text>{row.userName || row.githubUsername}</Text>
          ) : (
            <Space size={4}>
              <Text type="secondary">{row.githubUsername}</Text>
              <Tag color="orange">未认领</Tag>
            </Space>
          ),
      },
      { title: '部门', dataIndex: 'deptName', key: 'deptName', render: (v: string) => v || '—' },
      {
        title: 'GitHub',
        key: 'github',
        render: (_: unknown, row: CandidateRow) => (
          <a href={`https://github.com/${row.githubUsername}`} target="_blank" rel="noreferrer">
            <GithubOutlined /> {row.githubUsername}
          </a>
        ),
      },
      ...(activeTab === 'overview'
        ? [{ title: '最新分', dataIndex: 'latestTotalScore', key: 'latestTotalScore', width: 90, sorter: (a: CandidateRow, b: CandidateRow) => (a.latestTotalScore ?? 0) - (b.latestTotalScore ?? 0) }]
        : []),
      { title: '最高分', dataIndex: 'maxTotalScore', key: 'maxTotalScore', width: 90, sorter: (a: CandidateRow, b: CandidateRow) => (a.maxTotalScore ?? 0) - (b.maxTotalScore ?? 0) },
      { title: '提交次数', dataIndex: 'submissionCount', key: 'submissionCount', width: 90 },
      {
        title: '最后提交',
        dataIndex: 'lastEvaluatedAt',
        key: 'lastEvaluatedAt',
        width: 160,
        render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
      },
      {
        title: '操作',
        key: 'action',
        width: 90,
        render: (_: unknown, row: CandidateRow) => (
          <Button type="link" size="small" onClick={() => void openDrawer(row)}>
            查看
          </Button>
        ),
      },
    ];
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, size]);

  return (
    <div className="eval-manage">
      <div className="eval-filter">
        <Space wrap>
          <Select
            allowClear
            placeholder="招募周期"
            style={{ width: 180 }}
            value={filters.cycleId}
            onChange={(v) => {
              setFilters({ ...filters, cycleId: v });
              setPage(0);
            }}
            options={cycles.map((c) => ({ value: c.cycleId, label: c.cycleName }))}
          />
          <Select
            allowClear
            placeholder="部门"
            style={{ width: 140 }}
            value={filters.deptId}
            onChange={(v) => {
              setFilters({ ...filters, deptId: v });
              setPage(0);
            }}
            options={depts.map((d) => ({ value: d.deptId, label: d.deptName }))}
          />
          <Select
            style={{ width: 110 }}
            value={filters.claimed}
            onChange={(v) => {
              setFilters({ ...filters, claimed: v });
              setPage(0);
            }}
            options={CLAIMED_OPTIONS}
          />
          <Space size={4}>
            <InputNumber
              placeholder="最低分"
              min={0}
              max={500}
              value={filters.minScore}
              onChange={(v) => {
                setFilters({ ...filters, minScore: v ?? undefined });
                setPage(0);
              }}
            />
            <Text type="secondary">—</Text>
            <InputNumber
              placeholder="最高分"
              min={0}
              max={500}
              value={filters.maxScore}
              onChange={(v) => {
                setFilters({ ...filters, maxScore: v ?? undefined });
                setPage(0);
              }}
            />
          </Space>
          <Button
            icon={<SearchOutlined />}
            onClick={() => {
              if (filters.minScore != null && filters.maxScore != null && filters.minScore > filters.maxScore) {
                message.warning('最低分不能大于最高分');
                return;
              }
              setPage(0);
            }}
          >
            查询
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          setPage(0);
        }}
        items={[
          { key: 'overview', label: '总览' },
          { key: 'leaderboard', label: '榜单', icon: <TrophyOutlined /> },
        ]}
      />

      <Table<CandidateRow>
        rowKey="githubUsername"
        loading={loading}
        columns={columns}
        dataSource={data?.content ?? []}
        pagination={{
          current: page + 1,
          pageSize: size,
          total: data?.totalElements ?? 0,
          showSizeChanger: true,
          onChange: (p, s) => {
            setPage(p - 1);
            setSize(s);
          },
        }}
      />

      <Drawer
        open={drawerKey != null}
        onClose={() => setDrawerKey(null)}
        width={720}
        title={`${drawerTitle} · 评测历史`}
      >
        <div className="submission-list">
          <List
            loading={subLoading}
            size="small"
            dataSource={submissions}
            renderItem={(s) => (
              <List.Item
                className={s.id === selectedSubmissionId ? 'submission-item active' : 'submission-item'}
                onClick={() => setSelectedSubmissionId(s.id)}
              >
                <Space>
                  <Text strong>{s.totalScore}</Text>
                  <Text type="secondary">{dayjs(s.evaluatedAt).format('YYYY-MM-DD HH:mm')}</Text>
                  {s.userId == null && <Tag color="orange">未认领</Tag>}
                </Space>
                {s.userId == null && (
                  <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); setClaimTarget(s); }}>
                    认领
                  </Button>
                )}
              </List.Item>
            )}
          />
        </div>
        <DividerHr />
        {selectedSubmission ? (
          <ReportDetail submission={selectedSubmission} />
        ) : (
          <Empty description="选择一份提交查看明细" />
        )}
      </Drawer>

      <Modal
        open={claimTarget != null}
        title={`认领提交 #${claimTarget?.id ?? ''}`}
        onCancel={() => { setClaimTarget(null); setSearchUsers([]); }}
        footer={null}
        width={520}
      >
        <Input.Search
          placeholder="按姓名 / 手机 / 邮箱搜索官网用户"
          enterButton="搜索"
          loading={searchLoading}
          onSearch={(v) => void searchUser(v)}
        />
        <List
          style={{ marginTop: 12, maxHeight: 320, overflow: 'auto' }}
          dataSource={searchUsers}
          locale={{ emptyText: '输入关键词搜索用户' }}
          renderItem={(u) => (
            <List.Item
              actions={[
                <Button key="claim" type="primary" size="small" onClick={() => void doClaim(u.userId)}>
                  认领
                </Button>,
              ]}
            >
              <Space direction="vertical" size={0}>
                <Text>{u.name || '未命名'}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {u.email || u.userId}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

function DividerHr() {
  return <div className="divider-hr" />;
}

export default EvaluationManage;