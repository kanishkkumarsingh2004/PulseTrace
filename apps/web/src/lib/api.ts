const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchApi<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: any }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pt_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const body = await res.json();

    if (!res.ok) {
      return { error: body.error || { message: 'HTTP Request Failed', code: `HTTP_${res.status}` } };
    }

    return { data: body.data };
  } catch (err: any) {
    return { error: { message: err.message || 'Network connection failure', code: 'NETWORK_ERROR' } };
  }
}
