import type { PageLoad } from './$types'
import { error } from '@sveltejs/kit'

type Submission = { submissionId: string; userId: string; problemId: string; status: string; createdAt: number }

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/v1/users/me/submissions', { credentials: 'same-origin' })
  const j = await res.json().catch(() => ({}))
  if (res.status === 401) {
    return { requiresAuth: true, submissions: [] as Submission[] }
  }
  if (!res.ok || !j?.ok) throw error(res.status, j?.error?.message ?? 'Failed to load submissions')
  return { requiresAuth: false, submissions: j.data as Submission[] }
}
