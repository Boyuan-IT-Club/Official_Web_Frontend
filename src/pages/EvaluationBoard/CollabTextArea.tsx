// 带同事光标的协同文本框。
//
// 同一份评语可能有几位面试官同时在写，光标解决「他现在写到哪了」：
// 每位同事的光标画成一根他专属颜色的细竖线，顶着一面写名字的小旗，
// 选中一段文字时那段还会衬上他颜色的浅底——和在线文档的体验一致。
//
// 实现要点：textarea 画不进自定义光标，所以在它上面铺一层「镜像」——
// 字体、内边距与 textarea 逐项拷贝、文字透明的 div，内容与输入框逐字相同，
// 在同事光标所在的字符间隙塞一个零宽 span，量出它的位置后再把竖线和名旗
// 悬浮到那一点上。选区高亮直接由镜像里那段文字的半透明背景呈现，
// 换行、折行都由浏览器排版天然对齐。
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Input } from 'antd';
import type { TextAreaProps, TextAreaRef } from 'antd/es/input/TextArea';
import type { CollabBoard } from './collab';
import './CollabTextArea.scss';

export interface CollabTextAreaProps extends TextAreaProps {
  board: CollabBoard;
  scheduleId: number;
  /** 这块文本对应的协同文档列 id（COMMENT_COL 或 dim:{id}:note） */
  field: string;
}

interface RemoteCaret {
  clientId: number;
  name: string;
  color: string;
  /** 选区两端在当前文本里的下标，收起时相等 */
  start: number;
  end: number;
  /** 光标实际停留的那一端（选区可能是从后往前拉的） */
  head: number;
}

/** 选区衬底用主人的颜色但要淡，别把底下的字盖住 */
function selectionBackground(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}33` : color;
}

/** 名旗至少要有这么高的空间才放得下，放不下就翻到光标下方 */
const FLAG_HEIGHT_PX = 18;

const ZERO_WIDTH_SPACE = '​';

const CollabTextArea: React.FC<CollabTextAreaProps> = ({
  board, scheduleId, field, onChange, onBlur, onFocus, onClick, onKeyUp, onSelect, onScroll,
  ...rest
}) => {
  const taRef = useRef<TextAreaRef>(null);
  const markerRefs = useRef(new Map<number, HTMLSpanElement>());
  const mirrorRefs = useRef(new Map<number, HTMLDivElement>());
  const focusedRef = useRef(false);

  const [mirrorStyle, setMirrorStyle] = useState<React.CSSProperties>({});
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [markerBoxes, setMarkerBoxes] = useState<Record<number, { left: number; top: number; height: number }>>({});

  const value = String(rest.value ?? '');

  // 同事在这一格里的光标。resolveCursor 把广播来的相对位置解回下标，
  // 解不出（对方的位置已失效）就不画，宁缺毋滥。
  const carets = useMemo<RemoteCaret[]>(() => {
    const list: RemoteCaret[] = [];
    board.peers.forEach((peer) => {
      const cursor = peer.cursor;
      if (!cursor || cursor.scheduleId !== scheduleId || cursor.field !== field) return;
      const pos = board.resolveCursor(peer);
      if (!pos) return;
      // 本地 value 与文档偶有一拍之差（自己正在敲字），夹紧防越界
      const clamp = (n: number) => Math.max(0, Math.min(n, value.length));
      const anchor = clamp(pos.anchor);
      const head = clamp(pos.head);
      list.push({
        clientId: peer.clientId,
        name: peer.name,
        color: peer.color,
        start: Math.min(anchor, head),
        end: Math.max(anchor, head),
        head,
      });
    });
    return list;
    // board.version：同事没动光标但文本变了，相对位置解出的下标也会变
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.peers, board.version, scheduleId, field, value]);

  // 镜像要和 textarea 排版逐项一致，字体与内边距从真实节点上拷
  useLayoutEffect(() => {
    const textarea = taRef.current?.resizableTextArea?.textArea;
    if (!textarea || typeof window.getComputedStyle !== 'function') return;
    const cs = window.getComputedStyle(textarea);
    setMirrorStyle({
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight as React.CSSProperties['fontWeight'],
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      padding: cs.padding,
      borderWidth: cs.borderWidth,
    });
  }, []);

  // 每次渲染后量一遍各个零宽 span 的落点——文本、光标、宽度任何变化都会影响落点，
  // 所以刻意不写依赖数组；下面的相等性守卫保证量出来没变时不触发下一轮渲染。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const next: Record<number, { left: number; top: number; height: number }> = {};
    markerRefs.current.forEach((el, clientId) => {
      next[clientId] = { left: el.offsetLeft, top: el.offsetTop, height: el.offsetHeight };
    });
    setMarkerBoxes((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const same = prevKeys.length === nextKeys.length
        && nextKeys.every((key) => {
          const a = prev[Number(key)];
          const b = next[Number(key)];
          return a && a.left === b.left && a.top === b.top && a.height === b.height;
        });
      return same ? prev : next;
    });
  });

  // textarea 滚动时镜像跟着滚，悬浮的竖线则靠减去滚动量对齐
  useLayoutEffect(() => {
    mirrorRefs.current.forEach((el) => {
      el.scrollTop = scroll.top;
      el.scrollLeft = scroll.left;
    });
  }, [scroll, carets]);

  const broadcastCursor = useCallback((target: HTMLTextAreaElement) => {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? start;
    // 从后往前拉选区时，光标停在前端而不是后端
    const backward = target.selectionDirection === 'backward';
    board.setCursor(scheduleId, field, backward ? end : start, backward ? start : end);
  }, [board, scheduleId, field]);

  // 卸载时只收自己的光标：若焦点已挪去别的字段，那边的广播不该被这里清掉
  useLayoutEffect(() => () => {
    if (focusedRef.current) board.clearCursor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMarkerRef = useCallback((clientId: number) => (el: HTMLSpanElement | null) => {
    if (el) markerRefs.current.set(clientId, el);
    else markerRefs.current.delete(clientId);
  }, []);

  return (
    <div className="collab-ta">
      <Input.TextArea
        {...rest}
        ref={taRef}
        onChange={(e) => {
          onChange?.(e);
          board.setTyping(field);
          // 先让 onChange 把新文本写进文档，再按新下标编码光标
          broadcastCursor(e.target);
        }}
        onFocus={(e) => {
          focusedRef.current = true;
          broadcastCursor(e.target);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          board.setTyping(null);
          board.clearCursor();
          onBlur?.(e);
        }}
        onClick={(e) => {
          broadcastCursor(e.currentTarget);
          onClick?.(e);
        }}
        onKeyUp={(e) => {
          broadcastCursor(e.currentTarget);
          onKeyUp?.(e);
        }}
        onSelect={(e) => {
          broadcastCursor(e.currentTarget as HTMLTextAreaElement);
          onSelect?.(e);
        }}
        onScroll={(e) => {
          setScroll({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft });
          onScroll?.(e);
        }}
      />

      {carets.map((caret) => (
        <div
          key={caret.clientId}
          className="collab-ta__mirror"
          style={mirrorStyle}
          aria-hidden
          ref={(el) => {
            if (el) mirrorRefs.current.set(caret.clientId, el);
            else mirrorRefs.current.delete(caret.clientId);
          }}
        >
          {value.slice(0, caret.start)}
          {caret.head <= caret.start && (
            <span className="collab-ta__marker" ref={setMarkerRef(caret.clientId)}>{ZERO_WIDTH_SPACE}</span>
          )}
          {caret.end > caret.start && (
            <span
              className="collab-ta__selection"
              style={{ backgroundColor: selectionBackground(caret.color) }}
            >
              {value.slice(caret.start, caret.end)}
            </span>
          )}
          {caret.head > caret.start && (
            <span className="collab-ta__marker" ref={setMarkerRef(caret.clientId)}>{ZERO_WIDTH_SPACE}</span>
          )}
          {value.slice(caret.end)}
          {/* 结尾垫一个零宽字符，让最后一行始终有行盒，光标停在末尾时量得到高度 */}
          {ZERO_WIDTH_SPACE}
        </div>
      ))}

      {carets.map((caret) => {
        const box = markerBoxes[caret.clientId];
        if (!box) return null;
        const left = box.left - scroll.left;
        const top = box.top - scroll.top;
        return (
          <div
            key={caret.clientId}
            className="collab-ta__caret"
            style={{ left, top, height: box.height || undefined, backgroundColor: caret.color }}
          >
            <span
              className={`collab-ta__flag${top < FLAG_HEIGHT_PX ? ' collab-ta__flag--below' : ''}`}
              style={{ backgroundColor: caret.color }}
            >
              {caret.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CollabTextArea;
