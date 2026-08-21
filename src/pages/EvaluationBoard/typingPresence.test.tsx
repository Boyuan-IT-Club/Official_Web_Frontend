// 「正在输入」提示的行为守卫。
//
// 三条容易错的：
//   1. 只显示同一位候选人上的打字状态 —— 别人在别的候选人上打字与这一页无关
//   2. 自己输入时要广播（否则别人看不到）
//   3. 离开字段/关闭抽屉要收回（否则留下一个永远亮着的「正在输入」）
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CandidateDrawer from './CandidateDrawer';
import { COMMENT_COL, BoardPeer, CollabBoard, BoardRow } from './collab';

// 简历内容与本用例无关，直接给一个已完成的 Promise；
// 注意工厂里不能引用外部变量（jest 会把 mock 提升到文件顶部）
jest.mock('./resumeCache', () => ({
  loadCandidateResume: () => Promise.resolve(null),
  prefetchCandidateResume: () => {},
}));

const ROW: BoardRow = {
  scheduleId: 11,
  resumeId: 1,
  userId: 5,
  candidateName: '张三',
  account: 'a1',
  deptId: 1,
  deptName: '技术部',
  sessionId: 3,
  interviewTime: '2026-08-22T09:00:00',
  interviewerUserIds: [9],
  removed: false,
} as BoardRow;

const peer = (over: Partial<BoardPeer>): BoardPeer => ({
  clientId: 1, userId: 7, name: '高兴昊', color: '#f50',
  activeScheduleId: 11, typingField: null, ...over,
});

const makeBoard = (over: Partial<CollabBoard> = {}): CollabBoard => ({
  status: 'connected', synced: true, readOnly: false, locked: false,
  errorMessage: null,
  columns: [{ id: 'c1', label: '技术能力', type: 'score', maxScore: 10, weight: 1 } as any],
  rows: [ROW], peers: [], interviewerNames: { 9: '我' }, version: 1,
  canEdit: () => true,
  readCell: () => '',
  readEvaluation: () => ({} as any),
  writeScore: jest.fn(),
  writeComment: jest.fn(),
  writeDimensionNote: jest.fn(),
  writeRecommendation: jest.fn(),
  writeStatus: jest.fn(),
  setActiveRow: jest.fn(),
  setTyping: jest.fn(),
  ...over,
} as CollabBoard);

const setup = (board: CollabBoard) => render(
  <CandidateDrawer
    open
    onClose={() => {}}
    cycleId={2}
    row={ROW}
    board={board}
    currentUserId={9}
  />,
);

describe('评价表的「正在输入」提示', () => {
  it('同一位候选人上有人在写评语 → 显示他的名字', async () => {
    setup(makeBoard({ peers: [peer({ typingField: COMMENT_COL })] }));
    expect(await screen.findByText(/高兴昊 正在输入/)).toBeInTheDocument();
  });

  it('别人只是打开着看（没在打字）→ 不显示「正在输入」', () => {
    setup(makeBoard({ peers: [peer({ typingField: null })] }));
    expect(screen.queryByText(/正在输入/)).not.toBeInTheDocument();
  });

  it('别人在另一位候选人上打字 → 本页不显示（否则会误导）', () => {
    setup(makeBoard({ peers: [peer({ activeScheduleId: 99, typingField: COMMENT_COL })] }));
    expect(screen.queryByText(/正在输入/)).not.toBeInTheDocument();
  });

  it('分数列的打字状态挂在对应那一列上，不串到评语', () => {
    setup(makeBoard({ peers: [peer({ typingField: 'c1' })] }));
    // 只出现一次：在「技术能力」标题旁，不在评语那栏
    expect(screen.getAllByText(/高兴昊 正在输入/)).toHaveLength(1);
  });

  it('多人同时输入同一字段 → 名字并列显示', async () => {
    setup(makeBoard({
      peers: [
        peer({ clientId: 1, name: '高兴昊', typingField: COMMENT_COL }),
        peer({ clientId: 2, userId: 8, name: '谭雨萱', typingField: COMMENT_COL }),
      ],
    }));
    // 断言 textContent 而不是用 findByText 匹配整串：提示里有一个脉动小点的
    // 子元素，RTL 的默认文本匹配会因为文本被子元素打断而匹配不到
    const tag = await screen.findByText(/正在输入/);
    expect(tag.textContent).toBe('高兴昊、谭雨萱 正在输入…');
  });

  it('自己在评语里打字 → 广播该字段；失焦 → 收回', async () => {
    const board = makeBoard();
    setup(board);

    const box = await screen.findByPlaceholderText(/本场面试官共同记录/);
    fireEvent.change(box, { target: { value: '表现不错' } });
    await waitFor(() => expect(board.setTyping).toHaveBeenCalledWith(COMMENT_COL));

    fireEvent.blur(box);
    expect(board.setTyping).toHaveBeenCalledWith(null);
  });
});
