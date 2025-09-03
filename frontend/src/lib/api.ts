export type ApiOk<T> = { ok: true; data: T }
export type ApiErr = { ok: false; error: { code: string; message: string } }

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(init?.body ? { 'content-type': 'application/json' } : {})
    },
    credentials: 'same-origin'
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = (j as ApiErr)?.error ?? { code: `HTTP_${res.status}`, message: res.statusText }
    const err = new Error(e.message) as Error & { code: string; status: number }
    err.code = e.code
    err.status = res.status
    throw err
  }
  return (j as ApiOk<T>).data as T
}