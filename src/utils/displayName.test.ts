import { displayName } from './displayName';

/**
 * 姓名兜底锁的是名单核对场景：一列「用户#355」读不出是谁，
 * 兜底文案必须让人看出「这人没填姓名」，id 只是定位线索。
 */
describe('姓名兜底显示', () => {
  it('有真实姓名用真实姓名', () => {
    expect(displayName('张三', '10245101480', 355)).toBe('张三');
  });

  it('姓名缺失退回登录名', () => {
    expect(displayName(undefined, '10245101480', 355)).toBe('10245101480');
  });

  it('都缺失时标明未填姓名并保留 id，不能让裸 id 被当成姓名', () => {
    expect(displayName(undefined, undefined, 355)).toBe('未填姓名(#355)');
  });

  it('空串姓名按缺失处理，不渲染空白', () => {
    expect(displayName('', null, 355)).toBe('未填姓名(#355)');
  });

  it('连 id 都没有时至少说未填姓名', () => {
    expect(displayName(undefined, undefined, null)).toBe('未填姓名');
  });
});
