import { describe, it, expect } from 'vitest'
import * as mod from '../functions/api/v1/courses/[id]'
import { makeCtx, makeD1Mock, readJson } from './helpers'

const DEV_ENV = { APP_ENV: 'development' }

describe('GET /api/v1/courses/{id}', () => {
  it('400 when id missing', async () => {
    const { db } = makeD1Mock()
    const ctx = makeCtx({ url: 'http://x/api/v1/courses/', env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestGet(ctx)
    expect(res.status).toBe(400)
  })

  it('404 when not found', async () => {
    const { db } = makeD1Mock()
    const ctx = makeCtx({ url: 'http://x/api/v1/courses/NONE', env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestGet(ctx)
    expect(res.status).toBe(404)
  })

  it('200 when found', async () => {
    const { db, state } = makeD1Mock()
    state.firstResult = { courseId: 'UNITN_CP1', schoolId: 'ror:unitn', name: 'CP1' }
    const orig = db.prepare.bind(db)
    ;(db as any).prepare = (sql: string) => {
      const s = orig(sql)
      if (/FROM\s+courses\s+WHERE/i.test(sql)) s.first = async () => state.firstResult
      return s
    }
    const ctx = makeCtx({ url: 'http://x/api/v1/courses/UNITN_CP1', env: { ...DEV_ENV, DB: db } })
    const res = await (mod as any).onRequestGet(ctx)
    expect(res.status).toBe(200)
    const j = await readJson(res)
    expect(j.ok).toBe(true)
    expect(j.data.courseId).toBe('UNITN_CP1')
  })
})
