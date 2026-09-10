// 招新流程指引条。
//
// 管理端的功能是平铺的（周期、简历、面试的一堆标签页），谁先谁后全靠口口相传，
// 于是出现过「先从面试安排生成结果名单、再去分配面试时间」这种倒着做的操作。
// 这条指引把顺序显式画出来，并按实际数据标出每步做没做、当前该做哪一步。
//
// 只指路，不拦人：招新现场常有补录、临时单约，硬拦会逼人绕过系统操作。
import React, { useCallback, useEffect, useState } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getFlowProgress, RecruitFlowProgress } from '@/api/manage/interviewAdmin';
import { buildStages, currentStageIndex, FlowStage } from './flowStages';
import './index.scss';

export interface RecruitFlowGuideProps {
  cycleId?: number;
  /** 页面内已经处在哪一步（如面试管理页切到「预录取」标签）；给了它就高亮这一步 */
  highlightKey?: string;
  /**
   * 同页内跳转。返回 true 表示已自行处理（比如切标签页），
   * 否则组件走路由跳转。
   */
  onJump?: (stage: FlowStage) => boolean | void;
  /** 外部数据变化后要求重新拉取 */
  refreshToken?: number;
}

const RecruitFlowGuide: React.FC<RecruitFlowGuideProps> = ({
  cycleId, highlightKey, onJump, refreshToken,
}) => {
  const navigate = useNavigate();
  const [stages, setStages] = useState<FlowStage[] | null>(null);

  useEffect(() => {
    if (!cycleId) { setStages(null); return; }
    let alive = true;
    (async () => {
      try {
        const res: any = await getFlowProgress(cycleId);
        const p: RecruitFlowProgress = res?.data ?? {};
        if (!alive) return;
        setStages(buildStages({
          hasFields: (p.fieldCount ?? 0) > 0,
          submittedResumes: p.submittedResumes ?? 0,
          screenedResumes: p.screenedResumes ?? 0,
          schedules: p.schedules ?? 0,
          finalizedEvaluations: p.finalizedEvaluations ?? 0,
          decided: p.decided ?? 0,
          notified: p.notified ?? 0,
        }));
      } catch {
        // 指引是锦上添花，拉不到就整条不显示，不要弹错误打断正在做的事
        if (alive) setStages(null);
      }
    })();
    return () => { alive = false; };
  }, [cycleId, refreshToken]);

  const jump = useCallback((stage: FlowStage) => {
    if (onJump?.(stage) === true) return;
    navigate(stage.target.path);
  }, [navigate, onJump]);

  if (!stages) return null;

  const currentIdx = currentStageIndex(stages);
  const current = stages[currentIdx];

  return (
    <div className="flow-guide">
      <ol className="flow-guide__track">
        {stages.map((s, i) => {
          const highlighted = highlightKey ? s.key === highlightKey : s.state === 'active';
          return (
            <li
              key={s.key}
              className={[
                'flow-guide__step',
                `is-${s.state}`,
                highlighted ? 'is-here' : '',
              ].filter(Boolean).join(' ')}
            >
              <button type="button" className="flow-guide__btn" onClick={() => jump(s)} title={s.hint}>
                <span className="flow-guide__no">
                  {s.state === 'done' ? <CheckOutlined /> : i + 1}
                </span>
                <span className="flow-guide__title">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="flow-guide__now">
        {current.state === 'done'
          ? '各环节都已有产出；按需回到任一步继续处理。'
          : <>当前该做：<b>{current.title}</b> —— {current.hint}。前面的步骤没做完也能操作，只是容易漏人。</>}
      </p>
    </div>
  );
};

export default RecruitFlowGuide;
