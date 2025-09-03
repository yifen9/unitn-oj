import { describe, it, expect } from 'vitest'
import * as mod from '../functions/api/v1/problems/[id]/submissions/index'
import { makeCtx, makeD1Mock, readJson } from './helpers'
import { signSession } from '../functions/_lib/auth'

const DEV_ENV = { APP_ENV: 'development', AUTH_SESSION_TTL_SECONDS: '3600', AUTH_SESSION_SECRET: 'dev-secret' }
const PROD_ENV = { APP_ENV: 'prod', AUTH_SESSION_TTL_SECONDS: '3600', AUTH_SESSION_SECRET: 'prod-secret' }

describe('POST /api/v1/problems/{id}/submissions', () => {
  it('400 when problemId missing', async () => {
    const { db } = makeD1Mock()
    const ctx = makeCtx({ url: 'http://x/api/v1/problems//submissions', method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'x' }), env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(400)
  })

  it('401 when no sid', async () => {
    const { db } = makeD1Mock()
    const ctx = makeCtx({ url: 'http://x/api/v1/problems/p1/submissions', method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'x' }), env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(401)
  })

  it('415 when content-type not json', async () => {
    const { db } = makeD1Mock()
    const sid = await signSession(DEV_ENV.AUTH_SESSION_SECRET, 'alice@studenti.unitn.it')
    const ctx = makeCtx({ url: 'http://x/api/v1/problems/p1/submissions', method: 'POST', headers: { cookie: `sid=${sid}`, 'content-type': 'text/plain' }, body: 'code=abc', env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(415)
  })

  it('400 when code missing or empty', async () => {
    const { db } = makeD1Mock()
    const sid = await signSession(DEV_ENV.AUTH_SESSION_SECRET, 'alice@studenti.unitn.it')
    const ctx = makeCtx({ url: 'http://x/api/v1/problems/p1/submissions', method: 'POST', headers: { cookie: `sid=${sid}`, 'content-type': 'application/json' }, body: JSON.stringify({}), env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(400)
  })

  it('201 creates submission in dev', async () => {
    const { db, state } = makeD1Mock()
    const sid = await signSession(DEV_ENV.AUTH_SESSION_SECRET, 'alice@studenti.unitn.it')
    const ctx = makeCtx({ url: 'http://x/api/v1/problems/p1/submissions', method: 'POST', headers: { cookie: `sid=${sid}`, 'content-type': 'application/json' }, body: JSON.stringify({ code: 'print(1)' }), env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(201)
    const j = await readJson(res)
    expect(j.ok).toBe(true)
    expect(j.data.problemId).toBe('p1')
    expect(j.data.status).toBe('queued')
    expect(state.lastSQL).toMatch(/INSERT\s+INTO\s+submissions/i)
  })

  it('500 INTERNAL when DB insert fails in prod', async () => {
    const { db } = makeD1Mock()
    ;(db as any).prepare = () => ({ bind: () => ({ run: async () => { throw new Error('boom') } }) })
    const sid = await signSession(PROD_ENV.AUTH_SESSION_SECRET, 'alice@studenti.unitn.it')
    const ctx = makeCtx({ url: 'http://x/api/v1/problems/p1/submissions', method: 'POST', headers: { cookie: `sid=${sid}`, 'content-type': 'application/json' }, body: JSON.stringify({ code: 'x' }), env: { ...PROD_ENV, DB: db } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(500)
  })
})
