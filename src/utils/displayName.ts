/**
 * 姓名列的兜底显示：真实姓名 → 登录名 → 「未填姓名(#id)」。
 * 裸的「用户#355」会被当成姓名读出来，核对名单时认不出是谁；
 * 兜底文案必须一眼看出「这人没填姓名」，id 只是定位线索。
 */
export function displayName(
  name?: string | null,
  username?: string | null,
  userId?: number | null,
): string {
  if (name) return name;
  if (username) return username;
  return userId != null ? `未填姓名(#${userId})` : '未填姓名';
}
