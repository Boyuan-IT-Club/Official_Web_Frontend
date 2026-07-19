//封装和token的相关方法 存 取 删
const TOKEN_KEY = "token";

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get token from localStorage:", error);
    return null;
  }
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
