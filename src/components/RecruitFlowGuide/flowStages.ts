// 招新流程的阶段定义与完成度判定（纯逻辑，可测）。
//
// 管理端各页原本是平铺的，新人不知道先做哪一步——例如先「从面试安排生成名单」
// 再去排面试，顺序反了自己却看不出来。这里把顺序显式化：
// 周期配置 → 简历初筛 → 面试排期 → 面试评价 → 预录取/录取 → 结果通知。

export interface FlowFacts {
  /** 本周期是否配好了简历字段（没有字段学生没法投） */
  hasFields: boolean;
  /** 已提交的简历份数 */
  submittedResumes: number;
  /** 已出初筛结论（通过或未通过）的份数 */
  screenedResumes: number;
  /** 已生效的面试安排数 */
  schedules: number;
  /** 已定稿的评价数 */
  finalizedEvaluations: number;
  /** 已录入决定（通过/未通过）的结果数 */
  decided: number;
  /** 已发出结果通知的人数 */
  notified: number;
}

export type StageState = 'done' | 'active' | 'todo';

export interface FlowStage {
  key: string;
  title: string;
  /** 该做什么 */
  hint: string;
  state: StageState;
  /** 点击跳转目标 */
  target: { path: string; tab?: string };
}

/**
 * 判定各阶段状态。
 *
 * 规则：一个阶段「有产出」就算 done，第一个没产出的是 active，其余 todo。
 * 刻意不做硬性拦截——招新现场常有例外（补录、线上单约、先建场次再筛简历），
 * 拦死了反而逼人绕过系统操作；这里只指路。
 */
export function buildStages(f: FlowFacts): FlowStage[] {
  const raw: Array<Omit<FlowStage, 'state'> & { done: boolean }> = [
    { key: 'cycle', title: '周期配置', hint: '建周期、配简历字段与入群二维码',
      done: f.hasFields, target: { path: '/cycles' } },
    { key: 'screening', title: '简历打分与初筛', hint: '打分后标记通过/未通过，并给未通过的发通知',
      done: f.screenedResumes > 0, target: { path: '/resumes' } },
    { key: 'schedule', title: '面试排期', hint: '先配时间段与场次，再一键分配',
      done: f.schedules > 0, target: { path: '/interviews', tab: 'assign' } },
    { key: 'evaluation', title: '面试评价', hint: '面试官逐人打分并定稿',
      done: f.finalizedEvaluations > 0, target: { path: '/evaluation' } },
    { key: 'admission', title: '预录取与录取', hint: '圈定预录取名单后一键录取',
      done: f.decided > 0, target: { path: '/interviews', tab: 'preadmit' } },
    { key: 'notify', title: '结果通知', hint: '核对名单后发送录取/感谢邮件',
      done: f.notified > 0, target: { path: '/interviews', tab: 'results' } },
  ];

  const firstTodo = raw.findIndex((r) => !r.done);
  return raw.map((r, i) => ({
    key: r.key,
    title: r.title,
    hint: r.hint,
    target: r.target,
    state: r.done ? 'done' : (i === firstTodo ? 'active' : 'todo'),
  }));
}

/** 当前阶段序号（0起）；全部完成时指向最后一个 */
export function currentStageIndex(stages: FlowStage[]): number {
  const i = stages.findIndex((s) => s.state === 'active');
  return i >= 0 ? i : Math.max(0, stages.length - 1);
}
