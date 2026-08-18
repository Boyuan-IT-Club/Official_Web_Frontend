import React from 'react';
import { CalendarOutlined, CheckCircleFilled, WarningOutlined } from '@ant-design/icons';
import type { OpenCycle } from '@/api/manage/cycleApis';
import './index.scss';

export interface CycleSwitcherProps {
  /** 当前开放投递的周期（后端 /api/cycles/open 已按 start_date 倒序） */
  cycles: OpenCycle[];
  value: number;
  onChange: (cycleId: number) => void;
  /** 首页用的紧凑排版：去掉标题与说明，只留可点的周期块 */
  compact?: boolean;
  /** 每个周期的附加状态文字，如「已提交」，key 为 cycleId */
  statusOf?: (cycleId: number) => string | undefined;
}

/**
 * 多周期切换器。
 *
 * 不用「Alert 里塞一个 Select」的写法：下拉会把另一个周期藏起来，而用户最初的问题
 * 恰恰就是「看不到另一个招募活动的入口」—— 藏进下拉等于没解决。这里把每个开放周期
 * 摊成并排的可点块，一眼能看到有几个在招、当前在哪个。
 *
 * 只有一个开放周期时返回 null：那种情况下没有任何可切的，多一个控件只是噪音。
 */
const CycleSwitcher: React.FC<CycleSwitcherProps> = ({
  cycles, value, onChange, compact = false, statusOf,
}) => {
  if (!cycles || cycles.length < 2) return null;

  return (
    <div className={`cycle-switcher${compact ? ' is-compact' : ''}`}>
      {!compact && (
        <div className="cycle-switcher__head">
          <span className="cycle-switcher__title">
            同时有 <b>{cycles.length}</b> 个招募活动正在进行
          </span>
          <span className="cycle-switcher__hint">每个周期各投一份，互不影响</span>
        </div>
      )}

      <div className="cycle-switcher__list" role="tablist">
        {cycles.map((c) => {
          const id = Number(c.cycleId);
          const active = id === Number(value);
          const unconfigured = c.fieldCount === 0;
          const status = statusOf?.(id);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`cycle-card${active ? ' is-active' : ''}`}
              onClick={() => !active && onChange(id)}
            >
              <span className="cycle-card__top">
                <span className="cycle-card__name">{c.cycleName}</span>
                {active && <CheckCircleFilled className="cycle-card__tick" />}
              </span>

              <span className="cycle-card__date">
                <CalendarOutlined /> {c.startDate} ~ {c.endDate}
              </span>

              <span className="cycle-card__tags">
                {status && <span className="cycle-tag is-done">{status}</span>}
                {unconfigured && (
                  <span className="cycle-tag is-warn">
                    <WarningOutlined /> 表单未配置
                  </span>
                )}
                {!status && !unconfigured && (
                  <span className="cycle-tag">{active ? '当前查看' : '点击切换'}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CycleSwitcher;
