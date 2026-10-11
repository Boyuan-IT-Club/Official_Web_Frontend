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
//
// 镜像的排版必须时刻与 textarea 一致，不能只在挂载时拷一份：同一个评语框的
// 内边距、边框、字号会随外层样式变化（进出评价舞台时是 0 ↔ 7px 10px、
// 0 ↔ 1px、13px ↔ 13.5px），而切换舞台不会重新挂载。只拷一次的话，镜像里的
// 文字从左上角起排、真身却缩进了一圈，同事光标整体往左上偏（实测偏 24px/7.5px，
// 字号差还会沿行累积、长评语折行错位）。见 issue #267。
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

/**
 * 决定排版的属性，逐项从 textarea 的计算样式拷到镜像上。
 * 一律用长写：getComputedStyle 的 padding / borderWidth 简写在部分浏览器里会返回空串，
 * 拷过去等于没拷，文字又会从左上角起排。
 */
const MIRRORED_PROPS = [
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
  'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent', 'textTransform', 'tabSize',
] as const;

type MirroredProp = typeof MIRRORED_PROPS[number];

/** 从 textarea 真身上量出镜像此刻应有的排版样式 */
export function readMirrorStyle(textarea: HTMLTextAreaElement): Record<MirroredProp, string> {
  const cs = window.getComputedStyle(textarea);
  const style = {} as Record<MirroredProp, string>;
  MIRRORED_PROPS.forEach((prop) => { style[prop] = cs[prop] as string; });
  // 非覆盖式滚动条（Windows，或 macOS 设了「始终显示」）会吃掉内容区宽度；
  // 镜像没有滚动条，得把这块宽度补进右内边距，否则两边折行的位置不同
  const borderX = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  const scrollbar = Math.max(0, textarea.offsetWidth - textarea.clientWidth - borderX);
  if (scrollbar > 0) {
    style.paddingRight = `${(parseFloat(cs.paddingRight) || 0) + scrollbar}px`;
  }
  return style;
}

const CollabTextArea: React.FC<CollabTextAreaProps> = ({
  board, scheduleId, field, onChange, onBlur, onFocus, onClick, onKeyUp, onSelect, onScroll,
  ...rest
}) => {
  const taRef = useRef<TextAreaRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<number, HTMLSpanElement>());
  const mirrorRefs = useRef(new Map<number, HTMLDivElement>());
  const focusedRef = useRef(false);

  // 只用来触发重量：textarea 滚动、过渡结束、尺寸变化都不经过 React，
  // 得靠自增一下让下面的测量 effect 再跑一遍
  const [, setLayoutTick] = useState(0);
  const bumpLayout = useCallback(() => setLayoutTick((n) => n + 1), []);
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

  // 每次渲染后：先把镜像的排版与滚动对齐到真身，再量各个零宽 span 的落点。
  // 文本、光标、宽度、外层样式任何变化都会影响落点，所以刻意不写依赖数组；
  // 下面的相等性守卫保证量出来没变时不触发下一轮渲染。
  //
  // 镜像样式直接写 DOM 而不走 React 的 style：同一轮里写完立刻要量，
  // 走 state 得多渲染一轮，第一轮量到的就是旧排版下的落点。
  //
  // 落点用 getBoundingClientRect 相对容器取：offsetLeft/Top 是相对镜像「内边框」算的，
  // 漏掉镜像自己的边框宽度，光标会再往左上偏一个边框（1px）；
  // 矩形也已经包含了镜像的滚动量，不必再减。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const next: Record<number, { left: number; top: number; height: number }> = {};
    const container = containerRef.current;
    const textarea = taRef.current?.resizableTextArea?.textArea;
    if (container && textarea && mirrorRefs.current.size > 0
        && typeof window.getComputedStyle === 'function') {
      const mirrored = readMirrorStyle(textarea);
      mirrorRefs.current.forEach((el) => {
        Object.assign(el.style, mirrored);
        el.scrollTop = textarea.scrollTop;
        el.scrollLeft = textarea.scrollLeft;
      });
      const origin = container.getBoundingClientRect();
      markerRefs.current.forEach((el, clientId) => {
        const rect = el.getBoundingClientRect();
        next[clientId] = {
          left: rect.left - origin.left - container.clientLeft,
          top: rect.top - origin.top - container.clientTop,
          height: rect.height,
        };
      });
    }
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

  // 不经过 React 的排版变化也要补量一次：
  //  - antd 输入框带 0.2s 的 transition: all，进出舞台时渲染当下量到的是过渡起点，
  //    过渡结束时又不会触发任何渲染，镜像会停在起点的值上；
  //  - 拖分栏、窗口缩放改变宽度会让文字重新折行。
  // 只在格子里确实有同事光标时才触发，免得自己打字时 autoSize 长高也跟着白渲染。
  const hasCaretsRef = useRef(false);
  hasCaretsRef.current = carets.length > 0;
  useEffect(() => {
    const textarea = taRef.current?.resizableTextArea?.textArea;
    if (!textarea) return undefined;
    const onLayoutChange = () => { if (hasCaretsRef.current) bumpLayout(); };
    textarea.addEventListener('transitionend', onLayoutChange);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onLayoutChange) : null;
    observer?.observe(textarea);
    return () => {
      textarea.removeEventListener('transitionend', onLayoutChange);
      observer?.disconnect();
    };
  }, [bumpLayout]);

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
    <div className="collab-ta" ref={containerRef}>
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
          // 镜像的滚动在测量 effect 里直接读真身的 scrollTop 对齐，这里只负责触发重量
          bumpLayout();
          onScroll?.(e);
        }}
      />

      {carets.map((caret) => (
        <div
          key={caret.clientId}
          className="collab-ta__mirror"
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
        const { left, top } = box;
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
