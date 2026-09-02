// 「返回」的统一做法。
//
// 起因是活动页的死循环（稳定复现）：
//   详情页返回用 navigate('/Activities') —— push，新压一条历史
//   列表页返回用 navigate(-1)            —— pop，回退一条
// 列表 → 详情 → 返回(push 列表) 之后历史是 [列表, 详情, 列表]，
// 这时在列表点返回(-1) 就回到了详情，再点返回又压一条列表…来回打转。
//
// 正确语义是「回到我来的地方」：有本站历史就 pop，没有（比如别人分享链接
// 直接打开详情）才用 replace 落到兜底路由 —— 用 replace 而不是 push，
// 免得又制造出一条可以往回走的历史。
import type { NavigateFunction } from 'react-router-dom';

/**
 * react-router 会在 history.state 里维护 idx（当前条目在会话历史中的位置）。
 * idx > 0 表示本站内还有上一页可回。直接读 window.history.length 不行：
 * 它算上了打开本站之前的所有历史，从新标签页进来也可能大于 1。
 */
export function hasInAppHistory(): boolean {
  try {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    return typeof idx === 'number' && idx > 0;
  } catch {
    return false;   // 某些嵌入环境读 history.state 会抛
  }
}

/** 回到来处；没有来处则 replace 到 fallback */
export function safeBack(navigate: NavigateFunction, fallback: string): void {
  if (hasInAppHistory()) {
    navigate(-1);
    return;
  }
  navigate(fallback, { replace: true });
}
