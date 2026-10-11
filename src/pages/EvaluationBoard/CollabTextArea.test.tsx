// 协同文本框的行为守卫。
//
// jsdom 没有真实排版，量不出光标的像素落点，所以这里守的是行为而不是坐标：
//   1. 同一格里有同事光标 → 画出他的名旗（颜色是他的专属色）
//   2. 别的字段/别的候选人的光标不串进来
//   3. 自己点击、输入要广播光标位置，失焦要收回
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import CollabTextArea, { readMirrorStyle } from './CollabTextArea';
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

// issue #267：同事光标往左上偏。
// 镜像层的内边距/边框/字号原先只在挂载时从 textarea 拷一次，而评价舞台进出时
// 同一个评语框的这些样式会变（0 ↔ 7px 10px、0 ↔ 1px、13px ↔ 13.5px），切换又不重新挂载，
// 镜像里的文字就从左上角起排。真实浏览器里实测偏 23.7px / 7.5px。
// jsdom 没有排版量不出像素，这里锁的是「镜像样式始终跟着真身走」这件事本身。
describe('镜像排版跟着 textarea 走（#267）', () => {
  const mirrorOf = (container: HTMLElement) =>
    container.querySelector('.collab-ta__mirror') as HTMLDivElement;
  const textareaOf = (container: HTMLElement) =>
    container.querySelector('textarea') as HTMLTextAreaElement;

  const renderWithCaret = () => {
    const board = makeBoard({ peers: [peer({})] });
    const ui = (v: string) => (
      <CollabTextArea board={board} scheduleId={11} field={COMMENT_COL} value={v} onChange={() => {}} />
    );
    const utils = render(ui('表现不错'));
    return { ...utils, rerenderWith: (v: string) => utils.rerender(ui(v)) };
  };

  it('外层样式改了内边距与字号（进出舞台），重新渲染后镜像跟着变', () => {
    const { container, rerenderWith } = renderWithCaret();
    const ta = textareaOf(container);

    // 普通模式
    Object.assign(ta.style, { paddingTop: '0px', paddingLeft: '0px', fontSize: '13px', borderTopWidth: '0px' });
    rerenderWith('表现不错。');
    expect(mirrorOf(container).style.paddingTop).toBe('0px');

    // 进舞台：不卸载组件，只是外层样式变了
    Object.assign(ta.style, { paddingTop: '7px', paddingLeft: '10px', fontSize: '13.5px', borderTopWidth: '1px' });
    rerenderWith('表现不错。追问也稳');

    const mirror = mirrorOf(container);
    expect(mirror.style.paddingTop).toBe('7px');
    expect(mirror.style.paddingLeft).toBe('10px');
    expect(mirror.style.fontSize).toBe('13.5px');
    expect(mirror.style.borderTopWidth).toBe('1px');
  });

  it('样式经由 CSS 过渡变化、没有触发任何渲染时，过渡结束也会补量', () => {
    // antd 输入框带 0.2s 的 transition: all。渲染当下量到的是过渡起点，
    // 过渡结束时 React 什么也不知道——只靠渲染时重量，镜像会停在起点的值上
    const { container } = renderWithCaret();
    const ta = textareaOf(container);
    Object.assign(ta.style, { paddingTop: '0px' });

    Object.assign(ta.style, { paddingTop: '7px', paddingLeft: '10px' });
    act(() => { ta.dispatchEvent(new Event('transitionend')); });

    expect(mirrorOf(container).style.paddingTop).toBe('7px');
    expect(mirrorOf(container).style.paddingLeft).toBe('10px');
  });

  it('readMirrorStyle 逐项拷长写属性，并把非覆盖式滚动条的宽度补进右内边距', () => {
    const ta = document.createElement('textarea');
    Object.assign(ta.style, {
      paddingTop: '7px', paddingRight: '10px', paddingBottom: '7px', paddingLeft: '10px',
      borderLeftWidth: '1px', borderRightWidth: '1px', borderStyle: 'solid', fontSize: '13.5px',
    });
    document.body.appendChild(ta);
    // Windows 上 15px 的滚动条：offsetWidth = clientWidth + 两侧边框 + 滚动条
    Object.defineProperty(ta, 'offsetWidth', { configurable: true, value: 317 });
    Object.defineProperty(ta, 'clientWidth', { configurable: true, value: 300 });

    const style = readMirrorStyle(ta);
    ta.remove();

    expect(style.paddingTop).toBe('7px');
    expect(style.paddingLeft).toBe('10px');
    expect(style.fontSize).toBe('13.5px');
    expect(style.paddingRight).toBe('25px');
  });

  it('没有滚动条时右内边距原样拷贝', () => {
    const ta = document.createElement('textarea');
    Object.assign(ta.style, { paddingRight: '10px' });
    document.body.appendChild(ta);
    const style = readMirrorStyle(ta);
    ta.remove();
    expect(style.paddingRight).toBe('10px');
  });
});
