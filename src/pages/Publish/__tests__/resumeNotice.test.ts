import { resolveResumeNotice, statusLabelOf, ResumeStatus } from '../resumeNotice';
import { CyclePhase } from '../cyclePhase';

const notice = (cyclePhase: CyclePhase, status: ResumeStatus, canEdit = false) =>
  resolveResumeNotice({ cyclePhase, status, canEdit });

describe('简历状态提示的判定', () => {
  it('周期状态优先于简历状态', () => {
    // 周期没开放时，简历是评审中还是已通过都不影响「现在动不了」，
    // 而原因是周期不是简历——说「已进入审核阶段所以不能改」是错的归因
    (['upcoming', 'ended'] as const).forEach((phase) => {
      ([1, 2, 3, 4, 5] as const).forEach((st) => {
        const n = notice(phase, st);
        expect(n.title).toMatch(/本周期/);
      });
    });
  });

  it('周期未开始与已结束说的是不同的话', () => {
    expect(notice('upcoming', 2).title).toBe('本周期尚未开始');
    expect(notice('ended', 2).title).toBe('本周期已停止投递');
  });

  it('周期开着时，按简历自身状态给结论', () => {
    expect(notice('open', 1).title).toBe('简历尚未提交');
    expect(notice('open', 2, true).title).toBe('简历已提交');
    expect(notice('open', 3).title).toBe('简历正在评审');
    expect(notice('open', 4).title).toBe('简历已通过');
    expect(notice('open', 5).title).toBe('简历未通过');
  });

  it('语气与结论匹配：通过是 success，未通过不用 error 吓人', () => {
    expect(notice('open', 4).tone).toBe('success');
    // 未通过用 muted 而不是 error：这是个结果，不是用户操作出错
    expect(notice('open', 5).tone).toBe('muted');
    expect(notice('open', 3).tone).toBe('warning');
  });

  it('chip 反映真实可编辑性，而不是写死在状态标签里', () => {
    expect(notice('open', 2, true).badge).toBe('已提交（可修改）');
    expect(notice('open', 2, false).badge).toBe('已提交（不可修改）');
    // 周期关了，即便简历状态是「已提交」也不可改
    expect(notice('ended', 2, false).badge).toBe('已提交（不可修改）');
  });

  it('每种组合都给得出结论，没有空文案', () => {
    const phases: CyclePhase[] = ['open', 'upcoming', 'ended'];
    const statuses: ResumeStatus[] = [1, 2, 3, 4, 5, null, undefined];
    phases.forEach((p) => statuses.forEach((s) => {
      const n = notice(p, s);
      expect(n.title.length).toBeGreaterThan(0);
      expect(n.description.length).toBeGreaterThan(0);
      expect(n.badge).toBeTruthy();
    }));
  });

  it('状态为空按草稿处理，不显示空标签', () => {
    expect(statusLabelOf(null)).toBe('草稿');
    expect(statusLabelOf(undefined)).toBe('草稿');
    expect(notice('open', null).title).toBe('简历尚未提交');
  });

  it('草稿会明说「不提交就不进评审」', () => {
    // 线上真有人填完就走，以为保存草稿等于投了
    expect(notice('open', 1, true).description).toMatch(/提交简历/);
  });
});
