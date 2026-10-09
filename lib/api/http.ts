/**
 * Shared HTTP helpers. Components never call fetch() directly: every request
 * lives in a module under /lib/api and components import those functions.
 */
export type ApiResult<T = any> = { ok: boolean; status: number; data: T }

export async function request<T = any>(url: string, init: Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit | null } = {}): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = init
  const response = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  const data = (await response.json().catch(() => ({}))) as T
  return { ok: response.ok, status: response.status, data }
}

export function messageOf(data: any, fallback: string): string {
  const e = data?.error
  return (typeof e === 'string' ? e : e?.message) || fallback
}

/** Admin request: redirects to login on 401, throws Error(message) on failure, returns parsed data. */
export async function adminRequest<T = any>(url: string, init: Parameters<typeof request>[1] = {}, fallback = 'Request failed.'): Promise<T> {
  const result = await request<T>(url, { cache: 'no-store', ...init })
  if (result.status === 401 && typeof window !== 'undefined') { window.location.assign('/admin/login'); throw new Error('Session expired.') }
  if (!result.ok) throw Object.assign(new Error(messageOf(result.data, fallback)), { field: (result.data as any)?.field as string | undefined, status: result.status })
  return result.data
}
