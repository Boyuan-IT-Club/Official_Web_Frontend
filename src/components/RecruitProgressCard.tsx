import React, { useEffect, useState } from 'react';
import { Card, Steps, Button, Spin, Typography, Space, Tag } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getMyPreference, getMySchedule, getMyResult, MySchedule, MyResult } from '@/api/interviewPreference';

const { Text } = Typography;

interface Props {
  cycleId: number;
  /** 简历状态：1草稿 2已提交 3评审中 4通过 5未通过；null=尚无简历 */
  resumeStatus: number | null;
}

/**
 * 招新进度卡（方案三）：完善简历 → 提交 → 面试意向 → 等待分配 → 查看安排。
 * 中途离开的用户回到首页即可知道自己进行到哪一步、下一步做什么。
 */
const RecruitProgressCard: React.FC<Props> = ({ cycleId, resumeStatus }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasPreference, setHasPreference] = useState(false);
  const [schedule, setSchedule] = useState<MySchedule | null>(null);
  const [result, setResult] = useState<MyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, s, r]: any[] = await Promise.all([
          getMyPreference(cycleId).catch(() => null),
          getMySchedule(cycleId).catch(() => null),
          getMyResult(cycleId).catch(() => null),
        ]);
        if (!cancelled) {
          setHasPreference(!!p?.data);
          setSchedule(s?.data ?? null);
          setResult(r?.data ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cycleId]);

  if (loading) {
    return (
      <Card size="small" title={<><RocketOutlined /> 我的招新进度</>}>
        <div style={{ textAlign: 'center', padding: 12 }}><Spin /></div>
      </Card>
    );
  }

  const submitted = (resumeStatus ?? 0) >= 2;
  const scheduled = !!schedule?.interviewTime;
  const decided = !!result;

  // 当前进行到第几步（0起）
  let current = 0;
  if (resumeStatus != null) current = 1;          // 有草稿 → 该提交了
  if (submitted) current = 2;                      // 已提交 → 该填意向（若未填）
  if (submitted && hasPreference) current = 3;     // 意向已填 → 等待分配
  if (scheduled) current = 4;                      // 已分配 → 查看安排/等结果
  if (decided) current = 5;                        // 结果已出

  const steps = [
    { title: '完善简历', description: resumeStatus == null ? '还未开始填写' : '草稿已保存' },
    { title: '提交简历', description: submitted ? '已提交' : '完成后记得提交' },
    { title: '面试意向', description: hasPreference ? '志愿已提交' : '选志愿部门与可面试时间' },
    {
      title: '面试安排',
      description: scheduled
        ? `${String(schedule!.interviewTime).replace('T', ' ').slice(0, 16)} · ${schedule!.deptName ?? ''}`
        : (hasPreference ? '管理员安排中' : ''),
    },
    {
      title: '面试结果',
      status: decided && result!.decision === 2 ? ('error' as const) : undefined,
      description: decided
        ? (result!.decision === 1 ? `🎉 已录取${result!.assignedDeptName ? ` · ${result!.assignedDeptName}` : ''}` : '未录取，感谢参与')
        : '出结果后可在此查看',
    },
  ];

  return (
    <Card
      size="small"
      title={<><RocketOutlined /> 我的招新进度</>}
      extra={
        decided ? (
          <Button type="primary" size="small" onClick={() => navigate('/main/interview-appointment')}>
            查看结果
          </Button>
        ) : scheduled ? (
          <Button size="small" onClick={() => navigate('/main/interview-appointment')}>
            我的申请
          </Button>
        ) : (
          <Button type="primary" size="small" onClick={() => navigate('/main/publish')}>
            {resumeStatus == null ? '开始填写简历' : submitted && !hasPreference ? '补填面试意向' : submitted ? '查看我的简历' : '继续填写简历'}
          </Button>
        )
      }
    >
      <Steps size="small" current={current} items={steps} responsive />
      {scheduled && (
        <Space style={{ marginTop: 12 }}>
          <Text type="secondary">请准时到场：</Text>
          <Text strong>
            {String(schedule!.interviewTime).replace('T', ' ').slice(0, 16)}
            {schedule!.deptName ? ` · ${schedule!.deptName}` : ''}
            {schedule!.location ? ` · ${schedule!.location}` : ''}
          </Text>
        </Space>
      )}
    </Card>
  );
};

export default RecruitProgressCard;
