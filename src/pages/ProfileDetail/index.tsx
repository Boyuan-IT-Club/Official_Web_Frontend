// src/pages/ProfileDetail/index.tsx —— 候选档案详情（个人主页）
import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Descriptions, Empty, List, Row, Space, Spin, Table, Tag, Typography, message,
} from 'antd';
import type { TableProps } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getCandidateProfileDetail } from '@/api/manage/profiles';

const { Title, Text } = Typography;

interface ScheduleSection {
  schedule: {
    scheduleId: number;
    cycleId: number;
    interviewTime: string | null;
    status?: number;
    location?: string | null;
    [key: string]: unknown;
  };
  location: string | null;
  cycleName: string | null;
  deptName: string | null;
}

type InterviewSection = ScheduleSection;

interface Submission {
  id: number;
  githubUsername: string;
  author: string;
  evaluatedAt: string;
  totalScore: number;
  maxScore?: number;
  task1Score?: number | null;
  task2Score?: number | null;
  task3Score?: number | null;
  task4Score?: number | null;
  task5Score?: number | null;
  repository?: string | null;
  [key: string]: unknown;
}

interface Award {
  awardId: number;
  awardName: string;
  awardTime: string;
  description?: string | null;
}

interface ResumeRow {
  resumeId: number;
  cycleId: number;
  status?: number;
  resumeScore?: number;
  submittedAt?: string | null;
  [key: string]: unknown;
}

interface ProfileDetail {
  userId: number;
  name: string | null;
  username: string;
  major: string | null;
  email: string | null;
  phone: string | null;
  github: string | null;
  deptName: string | null;
  interviews: ScheduleSection[];
  submissions: Submission[];
  awards: Award[];
  resumes: ResumeRow[];
}

const INTERVIEW_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '未安排', color: 'default' },
  1: { text: '已安排', color: 'green' },
  2: { text: '已取消', color: 'red' },
};

const RESUME_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '草稿', color: 'default' },
  2: { text: '已提交', color: 'blue' },
  3: { text: '评审中', color: 'gold' },
  4: { text: '通过', color: 'green' },
  5: { text: '未通过', color: 'red' },
};

const ProfileDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res: any = await getCandidateProfileDetail(Number(userId));
      setDetail((res?.data ?? null) as ProfileDetail | null);
    } catch (e) {
      console.error(e);
      message.error('加载档案详情失败');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (!detail) {
    return (
      <div style={{ padding: 24 }}>
        <Card loading={loading}>
          {!loading && <Empty description="未找到该候选人的档案" />}
        </Card>
      </div>
    );
  }

  const interviewColumns = [
    { title: '周期', key: 'cycle', render: (_: unknown, r: InterviewSection) => r.cycleName || '-' },
    {
      title: '面试时间',
      dataIndex: ['schedule', 'interviewTime'],
      key: 'time',
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : <Tag>未安排</Tag>),
    },
    { title: '地点', key: 'loc', render: (_: unknown, r: InterviewSection) => r.location || '-' },
    { title: '部门', key: 'dept', render: (_: unknown, r: InterviewSection) => r.deptName || '-' },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, r: InterviewSection) => {
        const s = INTERVIEW_STATUS[r.schedule.status ?? 0];
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
  ] satisfies TableProps<InterviewSection>['columns'];

  const submissionColumns = [
    { title: 'GitHub', dataIndex: 'githubUsername', key: 'github' },
    { title: '提交时间', dataIndex: 'evaluatedAt', key: 'time' },
    {
      title: '得分',
      key: 'score',
      render: (_: unknown, r: Submission) => (
        <b>{r.totalScore}</b>
      ),
    },
    { title: '满分', dataIndex: 'maxScore', key: 'max', render: (v?: number) => v ?? 400 },
    {
      title: '任务分',
      key: 'tasks',
      render: (_: unknown, r: Submission) => {
        const tasks = [r.task1Score, r.task2Score, r.task3Score, r.task4Score, r.task5Score]
          .filter((v): v is number => typeof v === 'number');
        return tasks.length ? tasks.join(' / ') : '-';
      },
    },
  ] satisfies TableProps<Submission>['columns'];

  return (
    <div style={{ padding: 24 }}>
      <Card
        loading={loading}
        title={
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/profiles')} />
            <span>候选档案：{detail.name || detail.username}</span>
          </Space>
        }
      >
        <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="用户名/学号">{detail.username}</Descriptions.Item>
          <Descriptions.Item label="部门">{detail.deptName || '未分配'}</Descriptions.Item>
          <Descriptions.Item label="专业">{detail.major || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{detail.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{detail.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="GitHub">{detail.github || '-'}</Descriptions.Item>
        </Descriptions>

        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card title="面试安排" size="small">
              {detail.interviews.length ? (
                <Table<InterviewSection>
                  rowKey={(r) => String(r.schedule.scheduleId)}
                  columns={interviewColumns}
                  dataSource={detail.interviews}
                  pagination={false}
                  size="small"
                />
              ) : (
                <Text type="secondary">暂无面试安排</Text>
              )}
            </Card>
          </Col>
          <Col span={24}>
            <Card title="Autograding 评测成绩" size="small">
              {detail.submissions.length ? (
                <Table<Submission>
                  rowKey="id"
                  columns={submissionColumns}
                  dataSource={detail.submissions}
                  pagination={false}
                  size="small"
                />
              ) : (
                <Text type="secondary">暂无评测提交</Text>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="获奖经历" size="small">
              <List
                dataSource={detail.awards}
                locale={{ emptyText: <Text type="secondary">暂无获奖记录</Text> }}
                renderItem={(a: Award) => (
                  <List.Item>
                    <List.Item.Meta
                      title={a.awardName}
                      description={a.description || undefined}
                    />
                    <Text type="secondary">{a.awardTime}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="简历" size="small">
              <List
                dataSource={detail.resumes}
                locale={{ emptyText: <Text type="secondary">暂无简历</Text> }}
                renderItem={(r: ResumeRow) => {
                  const st = RESUME_STATUS[r.status ?? 1];
                  return (
                    <List.Item>
                      <List.Item.Meta
                        title={`周期 #${r.cycleId}`}
                        description={`得分：${r.resumeScore ?? 0}`}
                      />
                      <Tag color={st.color}>{st.text}</Tag>
                    </List.Item>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ProfileDetail;