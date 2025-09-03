import { httpJson, httpError } from '../../../_lib/http'
import { readSidFromCookie, verifySession } from '../../../_lib/auth'
import { getOptionalNumber, getRequired, isProd } from '../../../_lib/env'

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const sid = readSidFromCookie(request)
  if (!sid) return httpError('UNAUTHENTICATED', 'sid cookie required', 401)

  const sessionTtl = getOptionalNumber(env, 'AUTH_SESSION_TTL_SECONDS', 7 * 24 * 3600)
  const secret = getRequired(env, 'AUTH_SESSION_SECRET')

  let email = ''
  try {
    const s = await verifySession(secret, sid, sessionTtl)
    email = s.email
  } catch {
    return httpError('UNAUTHENTICATED', 'invalid or expired session', 401)
  }

  try {
    const row = await env.DB
      .prepare('SELECT user_id as userId, email, created_at as createdAt FROM users WHERE email=?1')
      .bind(email)
      .first<{ userId: string; email: string; createdAt: number }>()
    if (!row) return httpError('UNAUTHENTICATED', 'user not found', 401)
    return httpJson({ ok: true, data: row })
  } catch (e) {
    if (isProd(env)) return httpError('INTERNAL', 'database error', 500)
    return httpError('INTERNAL', String(e))
  }
}
