// src/pages/Profiles/index.tsx —— 候选档案列表
import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar, Button, Card, Empty, Select, Space, Table, Tag, message, Typography,
} from 'antd';
import { ProfileOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  CandidateProfileListRow,
  getCandidateProfiles,
} from '@/api/manage/profiles';
import { RecruitmentCycle, getAllCycles } from '@/api/manage/cycleApis';

const { Text } = Typography;

const Profiles: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CandidateProfileListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<RecruitmentCycle[]>([]);
  const [cycleId, setCycleId] = useState<number | undefined>(undefined);

  const fetchCycles = useCallback(async () => {
    try {
      const res: any = await getAllCycles();
      setCycles((res?.data ?? []).filter((c: any) => c.isActive));
    } catch (e) {
      console.error(e);
      message.error('加载招募周期失败');
    }
  }, []);

  const fetchRows = useCallback(async (cid: number | undefined) => {
    setLoading(true);
    try {
      const res: any = await getCandidateProfiles(cid);
      setRows((res?.data ?? []) as CandidateProfileListRow[]);
    } catch (e) {
      console.error(e);
      message.error('加载候选档案失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  useEffect(() => {
    fetchRows(cycleId);
  }, [fetchRows, cycleId]);

  const columns = [
    {
      title: '候选人',
      key: 'candidate',
      render: (_: unknown, r: CandidateProfileListRow) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar icon={<ProfileOutlined />} style={{ backgroundColor: '#4da6ff', flexShrink: 0 }} />
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontWeight: 500 }}>{r.name || r.username || '未知'}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '部门',
      dataIndex: 'deptName',
      key: 'dept',
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : <Tag>未分配</Tag>,
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
      render: (v: string | null) => v || '-',
    },
    {
      title: '周期',
      dataIndex: 'cycleName',
      key: 'cycle',
      render: (v: string) => v || '-',
    },
    {
      title: '最近面试时间',
      dataIndex: 'latestInterviewTime',
      key: 'time',
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : <Tag>未安排</Tag>),
    },
    {
      title: '面试地点',
      dataIndex: 'interviewLocation',
      key: 'location',
      render: (v: string | null) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: CandidateProfileListRow) => (
        <Button type="link" size="small" onClick={() => navigate(`/profiles/${r.userId}`)}>
          查看档案
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="候选档案"
        extra={(
          <Space>
            <Text type="secondary">按面试时间排序 · 未安排面试者置底</Text>
            <Select
              allowClear
              placeholder="全部周期"
              style={{ width: 180 }}
              value={cycleId}
              onChange={(v) => setCycleId(v)}
              options={cycles.map((c) => ({ value: c.cycleId, label: c.cycleName }))}
            />
          </Space>
        )}
      >
        <Table<CandidateProfileListRow>
          rowKey="userId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: <Empty description="暂无有面试安排的候选人" /> }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>
    </div>
  );
};

export default Profiles;