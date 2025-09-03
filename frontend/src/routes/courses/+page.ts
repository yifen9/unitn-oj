import type { PageLoad } from './$types'
import { error } from '@sveltejs/kit'

type Course = { courseId: string; schoolId: string; name: string }

export const load: PageLoad = async ({ fetch, url }) => {
  const schoolId = url.searchParams.get('schoolId') ?? ''
  const path = schoolId
    ? `/api/v1/courses?schoolId=${encodeURIComponent(schoolId)}`
    : `/api/v1/courses`
  const res = await fetch(path, { credentials: 'same-origin' })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j?.ok) throw error(res.status, j?.error?.message ?? 'Failed to load courses')
  return { courses: j.data as Course[], schoolId }
}
