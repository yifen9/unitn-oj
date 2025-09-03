import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageLoad = async ({ params }) => {
  throw redirect(307, `/courses/${encodeURIComponent(params.id)}/problems`)
}
