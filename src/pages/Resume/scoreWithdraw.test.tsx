// 撤销打分：误触打了分之后，能把「我这一票」撤回，平均分按剩下的人重算。
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import resumeReducer, { resumeActions } from '@/store/modules/resume';
import { updateResumeScore, withdrawResumeScore } from '@/api/manage/resumeEntry';
import ResumeDetail from './ResumeDetail';
import { resetScoreRevealForTest, setRevealAll } from './scoreReveal';

jest.mock('@/api/manage/resumeEntry', () => ({
  updateResumeScore: jest.fn(),
  withdrawResumeScore: jest.fn(),
}));
jest.mock('@/hooks/useResumePhoto', () => ({ useResumePhoto: () => '' }));
jest.mock('@/components/ResumeAttachments', () => () => null);
jest.mock('@/components/ResumeAiEvaluation', () => ({ ResumeAiSummary: () => null }));
// canScore 可切换：默认按只读账号（不走盲评），盲评用例里打开 resume:audit
let mockPerms: string[] = [];
jest.mock('@/utils/jwt', () => ({ hasPermission: (_t: unknown, code: string) => mockPerms.includes(code) }));

const ME = 7;

const makeStore = (resumes: any[]) => configureStore({
  reducer: {
    resume: resumeReducer,
    user: () => ({ userInfo: { userId: ME } }),
  },
  preloadedState: {
    resume: { ...resumeReducer(undefined, { type: '@@init' }), resumes } as any,
  },
});

const resumeWith = (entries: any[], avg: number | null): any => ({
  resumeId: 11,
  status: 2,
  resumeScore: avg,
  scoreEntries: entries,
  simpleFields: [{ fieldLabel: '姓名', fieldValue: '张三' }],
});

const renderDetail = (resume: any) => {
  const store = makeStore([{ ...resume }]);
  render(<Provider store={store}><ResumeDetail resume={resume} /></Provider>);
  return store;
};

const confirmWithdraw = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^undo 撤销$/ }));
  // Popconfirm 的确认键
  fireEvent.click(await screen.findByRole('button', { name: '撤 销' }));
};

describe('撤销我的打分', () => {
  beforeEach(() => { jest.clearAllMocks(); mockPerms = []; });

  it('没打过分时不显示撤销键', () => {
    renderDetail(resumeWith([{ scorerId: 9, scorerName: '乙', score: 80 }], 80));
    expect(screen.queryByRole('button', { name: /^undo 撤销$/ })).not.toBeInTheDocument();
  });

  it('唯一一票撤掉后回到「未评」，列表那条也同步清空', async () => {
    (withdrawResumeScore as jest.Mock).mockResolvedValue({
      data: { resumeId: 11, resumeScore: null, scoredByName: null, scoredAt: null, scoreEntries: [] },
    });
    const store = renderDetail(resumeWith([{ scorerId: ME, scorerName: '我', score: 90 }], 90));

    await confirmWithdraw();

    await waitFor(() => expect(withdrawResumeScore).toHaveBeenCalledWith(11));
    expect(await screen.findByText('未评')).toBeInTheDocument();
    expect(screen.getByText('还没有人打分')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^undo 撤销$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^保\s*存$/ })).toBeInTheDocument();
    const hit: any = (store.getState() as any).resume.resumes[0];
    expect(hit.resumeScore).toBeNull();
    expect(hit.scoreEntries).toEqual([]);
  });

  it('还有别人的票时，平均分换成剩下的人的平均', async () => {
    (withdrawResumeScore as jest.Mock).mockResolvedValue({
      data: { resumeId: 11, resumeScore: 70, scoredByName: '乙', scoreEntries: [{ scorerId: 9, scorerName: '乙', score: 70 }] },
    });
    const store = renderDetail(resumeWith(
      [{ scorerId: ME, scorerName: '我', score: 90 }, { scorerId: 9, scorerName: '乙', score: 70 }], 80,
    ));

    await confirmWithdraw();

    await waitFor(() => expect((store.getState() as any).resume.resumes[0].resumeScore).toBe(70));
    expect(screen.getByText('1 人平均')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^undo 撤销$/ })).not.toBeInTheDocument();
  });

  it('撤销失败时保留原分，撤销键还在', async () => {
    (withdrawResumeScore as jest.Mock).mockRejectedValue(new Error('网络异常'));
    renderDetail(resumeWith([{ scorerId: ME, scorerName: '我', score: 90 }], 90));

    await confirmWithdraw();

    await waitFor(() => expect(withdrawResumeScore).toHaveBeenCalled());
    // 失败后 loading 结束，撤销键恢复成可点的样子
    expect(await screen.findByRole('button', { name: /^undo 撤销$/ })).toBeInTheDocument();
    expect(screen.queryByText('未评')).not.toBeInTheDocument();
  });
});

describe('patchResumeScore 接受 null（撤销后回到未评）', () => {
  it('把列表那条的分数清成 null', () => {
    const state: any = { ...resumeReducer(undefined, { type: '@@init' }), resumes: [{ resumeId: 3, resumeScore: 88 }] };
    const next: any = resumeReducer(state, resumeActions.patchResumeScore({ resumeId: 3, resumeScore: null, scoreEntries: [] }));
    expect(next.resumes[0].resumeScore).toBeNull();
  });
});

describe('盲评：自己打分前看不到别人的分', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerms = ['resume:audit'];
    window.localStorage.clear();
    resetScoreRevealForTest();
  });

  const others = [{ scorerId: 9, scorerName: '乙', score: 70 }, { scorerId: 10, scorerName: '丙', score: 90 }];

  it('我没打过：平均分与逐人明细都藏起来，只显示人数', () => {
    renderDetail(resumeWith(others, 80));
    expect(screen.getByText('待你评')).toBeInTheDocument();
    expect(screen.getByText('已有 2 人打分')).toBeInTheDocument();
    expect(screen.getByText('打分后可见，或点小眼睛查看')).toBeInTheDocument();
    expect(screen.queryByText('80')).toBeNull();
    expect(screen.queryByText(/乙/)).toBeNull();
  });

  it('打完分立刻看到平均分与明细', async () => {
    (updateResumeScore as jest.Mock).mockResolvedValue({
      data: { resumeScore: 70, scoreEntries: [...others, { scorerId: ME, scorerName: '我', score: 50 }] },
    });
    renderDetail(resumeWith(others, 80));
    fireEvent.change(screen.getByRole('spinbutton', { name: '我的打分' }), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
    expect(await screen.findByText('3 人平均')).toBeInTheDocument();
    expect(document.querySelector('.score-badge')?.textContent).toBe('70');
    expect(screen.getByText(/乙/)).toBeInTheDocument();
  });

  it('撤销后重新藏起来', async () => {
    (withdrawResumeScore as jest.Mock).mockResolvedValue({ data: { resumeScore: 80, scoreEntries: others } });
    renderDetail(resumeWith([...others, { scorerId: ME, scorerName: '我', score: 50 }], 70));
    expect(screen.getByText('3 人平均')).toBeInTheDocument();
    await confirmWithdraw();
    expect(await screen.findByText('待你评')).toBeInTheDocument();
    expect(screen.queryByText(/乙/)).toBeNull();
  });

  it('只读账号（不能打分）不走盲评', () => {
    mockPerms = [];
    renderDetail(resumeWith(others, 80));
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('2 人平均')).toBeInTheDocument();
  });
});

describe('小眼睛：盲评下主动查看他人打分', () => {
  const others = [{ scorerId: 9, scorerName: '乙', score: 70 }, { scorerId: 10, scorerName: '丙', score: 90 }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerms = ['resume:audit'];
    window.localStorage.clear();
    resetScoreRevealForTest();
  });

  it('点小眼睛揭开这一份，再点收起', () => {
    renderDetail(resumeWith(others, 80));
    expect(screen.queryByText(/乙/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '查看他人打分' }));
    expect(document.querySelector('.score-badge')?.textContent).toBe('80');
    expect(screen.getByText(/乙/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '收起他人打分' }));
    expect(screen.queryByText(/乙/)).toBeNull();
    expect(screen.getByText('待你评')).toBeInTheDocument();
  });

  it('「显示全部打分」开着时直接可见，单份小眼睛置灰', () => {
    setRevealAll(true);
    renderDetail(resumeWith(others, 80));
    expect(screen.getByText(/乙/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收起他人打分' })).toBeDisabled();
    expect(window.localStorage.getItem('resume.revealAllScores')).toBe('1');
  });

  it('我打过分就不显示小眼睛', () => {
    renderDetail(resumeWith([...others, { scorerId: ME, scorerName: '我', score: 50 }], 70));
    expect(screen.queryByRole('button', { name: /他人打分/ })).toBeNull();
  });
});

describe('保存键不因没填分而变灰', () => {
  beforeEach(() => { jest.clearAllMocks(); mockPerms = ['resume:audit']; window.localStorage.clear(); resetScoreRevealForTest(); });

  it('没填分时保存键可点，点了提示先填分、不发请求', async () => {
    renderDetail(resumeWith([], null));
    const save = screen.getByRole('button', { name: /^保\s*存$/ });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(await screen.findByText('先在左边输入 0–100 的分数')).toBeInTheDocument();
    expect(updateResumeScore).not.toHaveBeenCalled();
  });

  it('分数没改时显示「已保存」并禁用', () => {
    renderDetail(resumeWith([{ scorerId: ME, scorerName: '我', score: 66 }], 66));
    expect(screen.getByRole('button', { name: /已保存/ })).toBeDisabled();
  });
});

