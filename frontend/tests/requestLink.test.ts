import { describe, it, expect } from 'vitest';
import * as mod from '../functions/api/v1/auth/requestLink';
import { makeCtx, makeD1Mock } from './helpers';

describe('POST /api/v1/auth/requestLink', () => {
  it('415 when content-type is not JSON', async () => {
    const ctx = makeCtx({
      url: 'http://x/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'email=foo'
    });
    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(415);
    const j = await res.json();
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('INVALID_ARGUMENT');
  });

  it('200 with magicUrl in dev mode and inserts token into D1', async () => {
    const { db, state } = makeD1Mock();
    const ctx = makeCtx({
      url: 'http://local/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@studenti.unitn.it' }),
      env: {
        APP_MODE: 'dev',
        EMAIL_ALLOWED_DOMAIN: 'studenti.unitn.it',
        TOKEN_TTL_SECONDS: '300',
        STRICT_DB_ERRORS: '1',
        DB: db
      }
    });
    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.data.magicUrl).toMatch(/\/api\/v1\/auth\/verify\?token=/);

    expect(state.lastSQL).toMatch(/INSERT INTO magic_tokens/i);
    expect(state.lastArgs.length).toBe(3);
    expect(state.lastArgs[1]).toBe('alice@studenti.unitn.it');
  });
});
