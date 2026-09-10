import { FlowFacts, buildStages, currentStageIndex } from './flowStages';

const base: FlowFacts = {
  hasFields: false, submittedResumes: 0, screenedResumes: 0,
  schedules: 0, finalizedEvaluations: 0, decided: 0, notified: 0,
};

describe('招新流程阶段判定', () => {
  it('全空：当前是周期配置，其余待办', () => {
    const st = buildStages(base);
    expect(st[0].state).toBe('active');
    expect(st.slice(1).every((s) => s.state === 'todo')).toBe(true);
    expect(currentStageIndex(st)).toBe(0);
  });

  it('配好字段且简历筛过：当前该排面试', () => {
    const st = buildStages({ ...base, hasFields: true, submittedResumes: 8, screenedResumes: 8 });
    expect(st[0].state).toBe('done');
    expect(st[1].state).toBe('done');
    expect(st[2].state).toBe('active');
    expect(st[2].title).toBe('面试排期');
  });

  it('乱序也如实反映：排了面试却没初筛，当前仍指向初筛', () => {
    // 招新现场确实会先建场次；引导只指路不拦人，但要指对地方
    const st = buildStages({ ...base, hasFields: true, schedules: 5 });
    expect(st[1].state).toBe('active');
    expect(st[2].state).toBe('done');
  });

  it('全流程走完：没有 active，当前指向最后一步', () => {
    const st = buildStages({
      hasFields: true, submittedResumes: 8, screenedResumes: 8,
      schedules: 6, finalizedEvaluations: 6, decided: 8, notified: 8,
    });
    expect(st.every((s) => s.state === 'done')).toBe(true);
    expect(currentStageIndex(st)).toBe(st.length - 1);
  });
});
