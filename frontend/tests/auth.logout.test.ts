import { describe, it, expect } from 'vitest'
import * as mod from '../functions/api/v1/auth/logout'
import { makeCtx, readJson } from './helpers'

describe('POST /api/v1/auth/logout', () => {
  it('200 clears cookie in dev', async () => {
    const ctx = makeCtx({ url: 'http://x/api/v1/auth/logout', method: 'POST', env: { APP_ENV: 'development' } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(200)
    const j = await readJson(res)
    expect(j.ok).toBe(true)
    const sc = res.headers.get('set-cookie') || ''
    expect(sc).toMatch(/^sid=/i)
    expect(sc).toMatch(/Max-Age=0/i)
    expect(sc).toMatch(/HttpOnly/i)
    expect(sc).toMatch(/SameSite=Lax/i)
    expect(sc).not.toMatch(/Secure/i)
  })

  it('200 clears cookie in prod with Secure', async () => {
    const ctx = makeCtx({ url: 'http://x/api/v1/auth/logout', method: 'POST', env: { APP_ENV: 'prod' } })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(200)
    const sc = res.headers.get('set-cookie') || ''
    expect(sc).toMatch(/Secure/i)
  })

  it('303 redirect to home on HTML form submit', async () => {
    const ctx = makeCtx({
      url: 'http://x/api/v1/auth/logout',
      method: 'POST',
      headers: { accept: 'text/html' },
      env: { APP_ENV: 'dev' }
    })
    const res = await (mod as any).onRequestPost(ctx)
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('/')
    const sc = res.headers.get('set-cookie') || ''
    expect(sc).toMatch(/^sid=/i)
  })
})