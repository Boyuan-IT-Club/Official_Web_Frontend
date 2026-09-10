// 全屏舞台容器：终审舞台与评价舞台共用。
// fixed 全视口盖住管理端外壳，Esc 退出；顶栏/主体/胶片条三段插槽。
import React, { useEffect } from 'react';
import { Button } from 'antd';
import './stage.scss';

export interface StageShellProps {
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** 顶栏右侧的自定义区（模式切换等），退出键之前 */
  topExtra?: React.ReactNode;
  onExit: () => void;
  /** 底部胶片条（FilmStrip），不传则不渲染该段 */
  film?: React.ReactNode;
  children: React.ReactNode;
}

const StageShell: React.FC<StageShellProps> = ({ title, meta, topExtra, onExit, film, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', onKey);
    // 全屏期间锁住背景滚动，退出时恢复
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onExit]);

  return (
    <div className="stage-shell" role="dialog" aria-modal="true">
      <div className="stage-shell__top">
        <span className="stage-shell__title">{title}</span>
        {meta && <span className="stage-shell__meta">{meta}</span>}
        <span className="stage-shell__spacer" />
        {topExtra}
        <Button size="small" onClick={onExit}>退出（Esc）</Button>
      </div>
      <div className="stage-shell__body">{children}</div>
      {film && <div className="stage-shell__film">{film}</div>}
    </div>
  );
};

export default StageShell;
