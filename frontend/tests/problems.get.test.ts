import { describe, it, expect } from 'vitest'
import * as mod from '../functions/api/v1/courses/[courseId]/problems/[id]'
import { makeCtx, makeD1Mock, readJson } from './helpers'

const DEV_ENV = { APP_ENV: 'development' }
const PROD_ENV = { APP_ENV: 'prod' }

describe('GET /api/v1/courses/{courseId}/problems/{id}', () => {
  it('400 when courseId or id missing', async () => {
    const { db } = makeD1Mock()
    const ctx = makeCtx({ url: 'http://x/api/v1/courses//problems/', env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestGet(ctx)
    expect(res.status).toBe(400)
  })

  it('404 when not mapped or not exists', async () => {
    const { db } = makeD1Mock()
    const ctx = makeCtx({ url: 'http://x/api/v1/courses/UNITN_CP1/problems/p_x', env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestGet(ctx)
    expect(res.status).toBe(404)
  })

  it('200 when found and mapped', async () => {
    const { db, state } = makeD1Mock()
    state.firstResult = { problemId: 'p_hello', courseId: 'UNITN_CP1', title: 'Hello', description: 'print' }
    const orig = db.prepare.bind(db)
    ;(db as any).prepare = (sql: string) => {
      const s = orig(sql)
      if (/FROM problems p WHERE p\.problem_id=\?2 AND EXISTS/i.test(sql)) s.first = async () => state.firstResult
      return s
    }
    const ctx = makeCtx({ url: 'http://x/api/v1/courses/UNITN_CP1/problems/p_hello', env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestGet(ctx)
    expect(res.status).toBe(200)
    const j = await readJson(res)
    expect(j.ok).toBe(true)
    expect(j.data.problemId).toBe('p_hello')
    expect(j.data.courseId).toBe('UNITN_CP1')
  })

  it('500 INTERNAL when DB throws in prod', async () => {
    const { db } = makeD1Mock()
    ;(db as any).prepare = () => ({ bind: () => ({ first: async () => { throw new Error('boom') } }) })
    const ctx = makeCtx({ url: 'http://x/api/v1/courses/UNITN_CP1/problems/p_hello', env: { ...PROD_ENV, DB: db } })
    const res = await (mod as any).onRequestGet(ctx)
    expect(res.status).toBe(500)
  })
})
