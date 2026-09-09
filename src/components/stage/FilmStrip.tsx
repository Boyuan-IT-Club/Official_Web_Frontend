// 胶片条：舞台底部的横向候选人小卡。终审按总分排序、评价舞台按时间排序，
// 内容差异全部通过 items 字段表达，组件本身不懂业务。
import React, { useEffect, useRef } from 'react';
import './stage.scss';

export interface FilmChip {
  key: string | number;
  name: string;
  /** 名字上方的小字（排名分数 / 时间） */
  sub?: string;
  /** 名字下方的状态字 */
  tag?: string;
  tagTone?: 'good' | 'now' | 'warn' | 'muted';
  /** 额外一行（如「乙 也在评」） */
  extra?: string;
  selected?: boolean;
}

const FilmStrip: React.FC<{ items: FilmChip[]; onSelect: (key: FilmChip['key']) => void }> = ({ items, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);
  // 选中项变化时滚进视野——键盘翻人时胶片条要跟着走
  useEffect(() => {
    // jsdom 没有 scrollIntoView，测试环境下静默跳过
    const el = ref.current?.querySelector('.is-selected') as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [items]);

  return (
    <div className="film-strip" ref={ref}>
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
  );
};

export default FilmStrip;
