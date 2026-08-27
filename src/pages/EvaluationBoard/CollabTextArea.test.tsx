// 协同文本框的行为守卫。
//
// jsdom 没有真实排版，量不出光标的像素落点，所以这里守的是行为而不是坐标：
//   1. 同一格里有同事光标 → 画出他的名旗（颜色是他的专属色）
//   2. 别的字段/别的候选人的光标不串进来
//   3. 自己点击、输入要广播光标位置，失焦要收回
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CollabTextArea from './CollabTextArea';
import { BoardPeer, CollabBoard, COMMENT_COL } from './collab';

const peer = (over: Partial<BoardPeer>): BoardPeer => ({
  clientId: 1, userId: 7, name: '高兴昊', color: '#f50000',
  activeScheduleId: 11, typingField: null,
  cursor: { scheduleId: 11, field: COMMENT_COL, anchor: null, head: null },
  ...over,
});

const makeBoard = (over: Partial<CollabBoard> = {}): CollabBoard => ({
  status: 'connected', synced: true, readOnly: false, locked: false,
  errorMessage: null, columns: [], rows: [], peers: [],
  interviewerNames: {}, version: 1,
  canEdit: () => true, readCell: () => '', readEvaluation: () => ({} as any),
  writeScore: jest.fn(), writeComment: jest.fn(), writeDimensionNote: jest.fn(),
  writeRecommendation: jest.fn(), writeStatus: jest.fn(),
  setActiveRow: jest.fn(), setTyping: jest.fn(),
  setCursor: jest.fn(), clearCursor: jest.fn(),
  resolveCursor: () => ({ anchor: 2, head: 2 }),
  ...over,
} as CollabBoard);

const setup = (board: CollabBoard) => render(
  <CollabTextArea
    board={board}
    scheduleId={11}
    field={COMMENT_COL}
    value="表现不错"
    placeholder="评语"
    onChange={() => {}}
  />,
);

describe('协同文本框的同事光标', () => {
  it('同一格里有同事的光标 → 画出他的名旗', () => {
    setup(makeBoard({ peers: [peer({})] }));
    expect(screen.getByText('高兴昊')).toBeInTheDocument();
  });

  it('光标在别的字段上 → 这格不画', () => {
    setup(makeBoard({
      peers: [peer({ cursor: { scheduleId: 11, field: 'dim:1:note', anchor: null, head: null } })],
    }));
    expect(screen.queryByText('高兴昊')).not.toBeInTheDocument();
  });

  it('光标在另一位候选人的同名字段上 → 这格不画', () => {
    setup(makeBoard({
      peers: [peer({ cursor: { scheduleId: 99, field: COMMENT_COL, anchor: null, head: null } })],
    }));
    expect(screen.queryByText('高兴昊')).not.toBeInTheDocument();
  });

  it('位置解不出来（已失效）→ 不画，宁缺毋滥', () => {
    setup(makeBoard({ peers: [peer({})], resolveCursor: () => null }));
    expect(screen.queryByText('高兴昊')).not.toBeInTheDocument();
  });

  it('自己点进输入框并输入 → 广播光标；失焦 → 收回', () => {
    const board = makeBoard();
    setup(board);
    const box = screen.getByPlaceholderText('评语') as HTMLTextAreaElement;

    fireEvent.click(box);
    expect(board.setCursor).toHaveBeenCalledWith(11, COMMENT_COL, expect.any(Number), expect.any(Number));

    fireEvent.change(box, { target: { value: '表现不错，追问也稳' } });
    expect(board.setTyping).toHaveBeenCalledWith(COMMENT_COL);

    fireEvent.blur(box);
    expect(board.setTyping).toHaveBeenCalledWith(null);
    expect(board.clearCursor).toHaveBeenCalled();
  });
});
