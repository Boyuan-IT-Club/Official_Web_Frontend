// 胶片条：舞台底部的横向候选人小卡。终审按总分排序、评价舞台按时间排序，
// 内容差异全部通过 items 字段表达，组件本身不懂业务。
//
// 下方附一条游动标尺（打分 / 预录取 / 面试评价三个舞台共用）：
// 每人一根刻度、颜色即状态；蓝框是胶片条当前看得到的那一段；
// 拖动或点击刻度跳到那一位，拖动时浮出「第几位 · 名字 · 状态」。
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTicks, ChipTone, indexAtRatio, visibleWindow } from './filmRuler';
import './stage.scss';

export interface FilmChip {
  key: string | number;
  name: string;
  /** 名字上方的小字（排名分数 / 时间） */
  sub?: string;
  /** 名字下方的状态字 */
  tag?: string;
  tagTone?: ChipTone;
  /** 额外一行（如「乙 也在评」） */
  extra?: string;
  selected?: boolean;
}

const FilmStrip: React.FC<{ items: FilmChip[]; onSelect: (key: FilmChip['key']) => void }> = ({ items, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  // 选中项变化时滚进视野——键盘翻人时胶片条要跟着走
  useEffect(() => {
    // jsdom 没有 scrollIntoView，测试环境下静默跳过
    const el = ref.current?.querySelector('.is-selected') as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [items]);

  // ---- 标尺 ----
  const ticks = useMemo(() => buildTicks(items), [items]);
  const count = items.length;

  // 蓝框：跟着胶片条的滚动位置走
  const [win, setWin] = useState({ left: 0, width: 100 });
  const syncWindow = useCallback(() => {
    const el = ref.current;
    if (el) setWin(visibleWindow(el.scrollLeft, el.clientWidth, el.scrollWidth));
  }, []);
  useEffect(() => {
    syncWindow();
    window.addEventListener('resize', syncWindow);
    return () => window.removeEventListener('resize', syncWindow);
  }, [syncWindow, items]);

  // 浮出的气泡：null 表示不显示
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null);
  const dragging = useRef(false);

  /** 指针位置 → 第几个人（精确到人，合并显示只是画法） */
  const indexAt = (clientX: number): { index: number; x: number } => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return { index: -1, x: 0 };
    const x = clientX - rect.left;
    // 气泡居中挂在指针上方，靠边时会半截出屏 —— 显示位置收进两侧 72px 内；
    // 算「是谁」用的是真实位置，不受这个影响
    const shown = rect.width > 144 ? Math.min(rect.width - 72, Math.max(72, x)) : rect.width / 2;
    return { index: indexAtRatio(x / rect.width, count), x: shown };
  };

  /** 拖动中只预览：把胶片条滚到那一位，但不切换 —— 真正切人留到松手 */
  const preview = (index: number) => {
    const strip = ref.current;
    const chip = strip?.children[index] as HTMLElement | undefined;
    if (chip && strip) {
      strip.scrollLeft = chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2;
    }
  };

  /*
    为什么拖动时不一路调用 onSelect：评价工作台的 onSelect 是整页路由跳转、
    还会重连协同文档，拖过二十个人就是二十次跳转。所以拖动只做预览，
    松手才提交一次；点一下（按下即松开）也走同一条路。
  */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const hit = indexAt(e.clientX);
    if (hit.index < 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setHover(hit);
    preview(hit.index);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const hit = indexAt(e.clientX);
    if (hit.index < 0) return;
    setHover(hit);
    if (dragging.current) preview(hit.index);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const hit = indexAt(e.clientX);
    setHover(null);
    if (hit.index >= 0 && items[hit.index]) onSelect(items[hit.index].key);
  };

  // 被系统打断（来电、切标签页）就作废这次拖动，不替用户做选择
  const onPointerCancel = () => {
    dragging.current = false;
    setHover(null);
  };

  const onPointerLeave = () => {
    if (!dragging.current) setHover(null);
  };

  const hovered = hover ? items[hover.index] : undefined;

  return (
    <div className="film">
      <div className="film-strip" ref={ref} onScroll={syncWindow}>
        {items.map((it) => (
          <button
            type="button"
            key={it.key}
            className={`film-strip__chip${it.selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(it.key)}
          >
            {it.sub && <span className="film-strip__sub">{it.sub}</span>}
            <span className="film-strip__name">{it.name}</span>
            {it.tag && <span className={`film-strip__tag tone-${it.tagTone ?? 'muted'}`}>{it.tag}</span>}
            {it.extra && <span className="film-strip__extra">{it.extra}</span>}
          </button>
        ))}
      </div>

      {/*
        一个人就没什么可导航的，不画。
        aria-hidden：它只是指针的快捷通道，键盘用户走上面的卡片按钮（每张都可聚焦），
        不需要再听一遍几十根刻度。
      */}
      {count > 1 && (
        <div
          className="film-ruler"
          ref={rulerRef}
          aria-hidden="true"
          data-testid="film-ruler"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
        >
          <div
            className="film-ruler__window"
            style={{ left: `${win.left}%`, width: `${win.width}%` }}
          />
          {ticks.map((t) => (
            <div
              key={t.start}
              className={[
                'film-ruler__tick',
                `tone-${t.tone}`,
                t.end > t.start ? 'is-bucket' : '',
                t.selected ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              style={{
                left: `${(t.start / count) * 100}%`,
                width: `${((t.end - t.start + 1) / count) * 100}%`,
              }}
            />
          ))}
          {hovered && hover && (
            <div className="film-ruler__bubble" style={{ left: hover.x }}>
              {`${hover.index + 1} / ${count} · ${hovered.name}${hovered.tag ? ` · ${hovered.tag}` : ''}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilmStrip;
