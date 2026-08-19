/** 解析 JWT payload（仅用于前端展示/校验，不做签名校验） */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getJwtRoles(token: string | null): string[] {
  if (!token) return [];
  const payload = parseJwtPayload(token);
  // 后端实际写入的声明是 roleNames（见 JwtTokenUtil.generateToken）；roles 仅作旧 Token 兼容
  const roles = payload?.roleNames ?? payload?.roles;
  if (!Array.isArray(roles)) return [];
  return roles.map(String).map((r) => r.trim()).filter(Boolean);
}

export function hasEffectiveJwtRoles(token: string | null): boolean {
  return getJwtRoles(token).length > 0;
}

/** 从 JWT 读取权限码（后端签发时写入 permissionCodes，如 admin:manage / resume:audit） */
export function getJwtPermissionCodes(token: string | null): string[] {
  if (!token) return [];
  const payload = parseJwtPayload(token);
  const codes = payload?.permissionCodes;
  if (!Array.isArray(codes)) return [];
  return codes.map(String).map((c) => c.trim()).filter(Boolean);
}

/** 管理端准入的正式门票（后端 V23 起播种） */
const CONSOLE_PERMISSION = 'console:access';

/**
 * 过渡期兼容：console:access 是权限拆分阶段一才新增的，此前签发的 JWT 里没有它。
 * 若只认这一个码，当前在线的管理员会被直接挡在门外，且看到的是
 * 「该账号没有管理权限」——完全误导。
 *
 * 这里保留一组明确的管理类权限作为兼容，而不是沿用原来的「有任意权限码即可」：
 * 后者会把只持有 resume:view 的角色也放进来（那正是社员曾经能登进后台的原因）。
 * resume:view 刻意不在这个列表里。
 *
 * 全员重新登录后（旧令牌过期即可），这个列表可以整块删掉，只留 CONSOLE_PERMISSION。
 */
const LEGACY_CONSOLE_PERMISSIONS = [
  'admin:manage', 'user:view', 'user:manage', 'admin:grant', 'system:ops',
  'resume:audit', 'cycle:manage', 'dept:manage', 'activity:manage',
  'interview:evaluate', 'interview:schedule', 'interview:result',
  'interview:board:manage', 'feishu:sync', 'evaluation:view',
  'role:assign', 'permission:manage',
];

/** 能否进入管理端 */
export function hasConsoleAccess(token: string | null): boolean {
  const codes = getJwtPermissionCodes(token);
  if (codes.includes(CONSOLE_PERMISSION)) return true;
  return codes.some((c) => LEGACY_CONSOLE_PERMISSIONS.includes(c));
}

/** 是否持有指定权限码 */
export function hasPermission(token: string | null, code: string): boolean {
  return getJwtPermissionCodes(token).includes(code);
}
