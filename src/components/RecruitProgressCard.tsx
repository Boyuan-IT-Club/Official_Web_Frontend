import React, { useEffect, useState } from 'react';
import { Card, Steps, Button, Spin, Typography, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getMyPreference, getMySchedule, getMyResult, MySchedule, MyResult } from '@/api/interviewPreference';

const { Text } = Typography;

interface Props {
  cycleId: number;
  /** 简历状态：1草稿 2已提交 3评审中 4通过 5未通过；null=尚无简历 */
  resumeStatus: number | null;
  /**
   * 本人是否能参加线下面试。false 时整条进度走线上路线：
   * 这类同学不会被排进线下场次，第 4 步给他们看「线下面试时间地点」
   * 只会白等一个不会来的通知。null=未知（还没填面试意向），按线下文案走。
   */
  canAttendOffline?: boolean | null;
  /**
   * 本周期是否仍接收投递。false = 管理员已「停止投递」但周期时间未过：
   * 投过的照常看进度；没投过的不再给「开始填写简历」——那页现在不能新建。
   */
  intakeOpen?: boolean;
}

/**
 * 招新进度卡（方案三）：完善简历 → 提交 → 面试意向 → 等待分配 → 查看安排。
 * 中途离开的用户回到首页即可知道自己进行到哪一步、下一步做什么。
 */
const RecruitProgressCard: React.FC<Props> = ({
  cycleId, resumeStatus, canAttendOffline = null, intakeOpen = true,
}) => {
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

  // 已停止投递、本人又没有这届的简历：五步进度对他没有意义，
  // 还会用「开始填写简历」把人引到一个不能新建的页面
  if (!intakeOpen && resumeStatus == null) {
    return (
      <Card size="small" title={<><RocketOutlined /> 我的招新进度</>}>
        <Text type="secondary">本周期已停止投递，不再接收新的简历。</Text>
      </Card>
    );
  }

  const submitted = (resumeStatus ?? 0) >= 2;
  const scheduled = !!schedule?.interviewTime;
  const decided = !!result;
  // 简历状态 4=通过初筛 5=未通过初筛（后端 V43 起启用）
  const screenPassed = resumeStatus === 4;
  const screenRejected = resumeStatus === 5;
  const screened = screenPassed || screenRejected;

  /*
   * 当前进行到第几步（0起）：完善→提交→面试意向→简历初筛→面试安排→面试结果。
   *
   * 意向排在初筛之前是因为学生填简历时就顺手填了志愿与时间窗——
   * 把初筛插在前面会出现「意向已提交」却排在「评审中」之后的矛盾画面。
   */
  let current = 0;
  if (resumeStatus != null) current = 1;          // 有草稿 → 该提交了
  if (submitted) current = 2;                      // 已提交 → 该填/补意向
  if (hasPreference) current = 3;                  // 意向已填 → 等初筛结果
  if (screenPassed) current = 4;                   // 通过初筛 → 等待分配
  if (scheduled) current = 5;                      // 已分配 → 查看安排/等结果
  // 线上路线没有 schedule 数据，光靠 scheduled 判断会永远卡在上一步，
  // 让人以为流程停了；通过初筛且填了意向就推进到「线上面试」
  if (canAttendOffline === false && screenPassed && hasPreference) current = 5;
  if (decided) current = 6;                        // 结果已出
  // 初筛未通过：流程到此为止，停在初筛这一步（后面几步都不会发生）
  if (screenRejected) current = 3;

  // 不能参加线下面试的同学不进线下排期，走线上面试
  const online = canAttendOffline === false;

  const steps = [
    // 说明文字必须短：六步平分卡片宽度，每步只有约 120px，
    // 「填写中，记得提交」这类长句会被挤成「记得提3」或错行。
    // 一律控制在 6 字以内，长的语气交给标题与页面其他位置承担。
    { title: '完善简历', description: resumeStatus == null ? '未开始' : (resumeStatus >= 2 ? '已完成' : '填写中') },
    { title: '提交简历', description: submitted ? '已提交' : '待提交' },
    {
      title: '面试意向',
      description: hasPreference ? '已提交' : '待选择',
    },
    {
      title: '简历初筛',
      /*
       * 未通过初筛不用 error 红。红色是「出错了、要你处理」的语气，
       * 而这只是一个结果，且是别人做的决定——一整条红叉挂在人家首页上太重了。
       * 用 finish + 中性文案收尾：进度到此为止的信息照样传达到，语气收住。
       */
      status: screenRejected ? ('finish' as const) : undefined,
      description: screenRejected
        ? '未进入面试'
        : screenPassed
          ? '已通过'
          : (submitted ? '评审中' : '待提交'),
    },
    online
      ? {
          title: '线上面试',
          // 线上场次由管理员一对一约，站内没有排期数据可显示，
          // 所以这一步给的是「等谁联系你」而不是时间地点
          description: hasPreference ? '待约时间' : '',
        }
      : {
          title: '面试安排',
          description: scheduled
            ? `${String(schedule!.interviewTime).replace('T', ' ').slice(5, 16)}`
            : (hasPreference ? '安排中' : ''),
        },
    {
      title: '面试结果',
      status: decided && result!.decision === 2 ? ('error' as const) : undefined,
      description: decided
        ? (result!.decision === 1 ? `已录取${result!.assignedDeptName ? ` · ${result!.assignedDeptName}` : ''}` : '未录取')
        : '待公布',
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
            {!intakeOpen ? '查看我的简历' : resumeStatus == null ? '开始填写简历' : submitted && !hasPreference ? '补填面试意向' : submitted ? '查看我的简历' : '继续填写简历'}
          </Button>
        )
      }
    >
      {/* 未通过初筛的同学后面几步都不会发生，进度条到初筛为止——
          继续显示「管理员安排中」只会让人一直等不会来的面试通知 */}
      <Steps
        className="recruit-steps"
        size="small"
        current={current}
        items={screenRejected ? steps.slice(0, 4) : steps}
        responsive
      />
      {/*
        初筛没过就不再显示面试时间。线上撞到过：进度条已经写着「未通过初筛」，
        下面却还挂着「请准时到场 09-11 09:05」和倒计时——安排是初筛之前排的，
        排期数据还在，两句话直接打架，学生不知道该信哪个。
      */}
      {scheduled && !screenRejected && (
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
