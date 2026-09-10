import { clampRatio, gridColumns, nextFold } from './stageLayout';

describe('评价舞台分栏布局', () => {
  it('比例夹取在 25%–75%，非法值回默认', () => {
    expect(clampRatio(0.1)).toBe(0.25);
    expect(clampRatio(0.9)).toBe(0.75);
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(NaN)).toBe(0.45);
  });

  it('折叠状态机：同侧再按恢复，异侧直接切换，不存在双收起', () => {
    expect(nextFold('none', 'left')).toBe('left');
    expect(nextFold('left', 'left')).toBe('none');
    expect(nextFold('left', 'right')).toBe('right');
    expect(nextFold('right', 'restore')).toBe('none');
  });

  it('Grid 模板：折叠侧 28px 细轨，正常侧按比例', () => {
    expect(gridColumns(0.45, 'none')).toBe('0.45fr 14px 0.55fr');
    expect(gridColumns(0.45, 'left')).toBe('28px 14px 1fr');
    expect(gridColumns(0.45, 'right')).toBe('1fr 14px 28px');
  });
});
