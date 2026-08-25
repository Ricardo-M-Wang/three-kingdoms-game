const NGROK_URL = 'https://rotten-iodize-borrower.ngrok-free.dev';
const LOCAL_URL = 'http://localhost:3001';
// 联机模式：将 FORCE_REMOTE 设为 true 或访问 ngrok URL 时自动切换
const BASE_URL = (window.location.hostname !== 'localhost' || (window as any).__FORCE_REMOTE__)
  ? `${NGROK_URL}/api`
  : `${LOCAL_URL}/api`;
const SOCKET_URL = (window.location.hostname !== 'localhost' || (window as any).__FORCE_REMOTE__)
  ? NGROK_URL
  : LOCAL_URL;

export { SOCKET_URL };

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('未登录');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data;
}

export function apiGet(path: string): Promise<any> {
  return request(path);
}

export function apiPost(path: string, body?: any): Promise<any> {
  return request(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut(path: string, body?: any): Promise<any> {
  return request(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete(path: string): Promise<any> {
  return request(path, { method: 'DELETE' });
}
