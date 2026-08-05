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

/** 是否持有任一管理类权限（管理端准入判断） */
export function hasAnyManagePermission(token: string | null): boolean {
  return getJwtPermissionCodes(token).length > 0;
}

/** 是否持有指定权限码 */
export function hasPermission(token: string | null, code: string): boolean {
  return getJwtPermissionCodes(token).includes(code);
}
