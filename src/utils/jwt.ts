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
  const roles = payload?.roles;
  if (!Array.isArray(roles)) return [];
  return roles.map(String).map((r) => r.trim()).filter(Boolean);
}

export function hasEffectiveJwtRoles(token: string | null): boolean {
  return getJwtRoles(token).length > 0;
}
