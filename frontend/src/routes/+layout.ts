import type { LayoutLoad } from './$types'

type User = { userId: string; email: string; createdAt: number; nickname?: string | null }

export const load: LayoutLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/v1/users/me', { credentials: 'same-origin' })
    if (res.status === 401) return { user: null }
    const j = await res.json().catch(() => null)
    if (j && j.ok) return { user: j.data as User }
    return { user: null }
  } catch {
    return { user: null }
  }
}
