// src/pages/Dashboard/index.js
import React, { useEffect, useState } from 'react';
import {
  UserOutlined,
  FileTextOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMyResumeReadonly, fetchActiveCycle } from '@/store/modules/resume';
import RecruitProgressCard from '@/components/RecruitProgressCard';
import InterviewReminderCard from '@/components/InterviewReminderCard';
import ActivitiesPreviewCard from '@/components/ActivitiesPreviewCard';
import DepartmentPicker from '@/components/DepartmentPicker';
import './index.scss';


const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const resumeState = useSelector((state) => state.resume);
  const [hasInterview, setHasInterview] = useState(false);

  // 进入首页：解析活跃周期（动态化，不再硬编码），再拉取简历状态驱动进度卡
  useEffect(() => {
    (async () => {
      let cid = 2;
      try {
        const active = await dispatch(fetchActiveCycle()).unwrap();
        if (active != null) cid = active;
      } catch (e) { /* 回退默认周期 */ }
      dispatch(fetchMyResumeReadonly(cid));
    })();
  }, [dispatch]);

  // 简历投递
  const handleGoToResume = () => {
    navigate('/main/publish');
  };

  return (
    <div className="dashboard-page">
      {/*
        Bento 网格（方向 4）：首屏摆的模块本来就有六七个，纵向堆叠会把关键信息推到折叠线以下。
        改成大小不一的网格后，"我的申请"占主位，面试时间/倒计时等小卡环绕，一屏内看完。
      */}
      <div className="dash-wrap">
        <div className="bento">
          <div className="bento-hero">
            <RecruitProgressCard
              cycleId={resumeState?.cycleId ?? 2}
              resumeStatus={resumeState?.resume?.status ?? null}
            />
          </div>

          {hasInterview && (
            <div className="bento-side">
              <InterviewReminderCard
                cycleId={resumeState?.cycleId ?? 2}
                onVisibleChange={setHasInterview}
              />
            </div>
          )}
          {/* 无面试安排时提醒卡不占位，但仍需挂载以便它回报状态 */}
          {!hasInterview && (
            <div style={{ display: 'none' }}>
              <InterviewReminderCard
                cycleId={resumeState?.cycleId ?? 2}
                onVisibleChange={setHasInterview}
              />
            </div>
          )}

          <div className={hasInterview ? 'bento-wide' : 'bento-full'}>
            <ActivitiesPreviewCard />
          </div>

          <div className="bento-full">
            <DepartmentPicker />
          </div>

          <button type="button" className="bento-action" onClick={handleGoToResume}>
            <FileTextOutlined className="action-icon" />
            <span className="action-title">简历投递</span>
            <span className="action-desc">填写或修改</span>
          </button>
          <button
            type="button"
            className="bento-action"
            onClick={() => navigate('/main/interview-appointment')}
          >
            <ScheduleOutlined className="action-icon" />
            <span className="action-title">申请进度</span>
            <span className="action-desc">时间线与结果</span>
          </button>
          <button
            type="button"
            className="bento-action"
            onClick={() => navigate('/main/person')}
          >
            <UserOutlined className="action-icon" />
            <span className="action-title">个人主页</span>
            <span className="action-desc">资料 · 历届申请</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;