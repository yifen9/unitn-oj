import { describe, it, expect } from 'vitest';
import * as mod from '../functions/api/v1/auth/verify';
import { makeCtx, makeD1Mock } from './helpers';

describe('/api/v1/auth/verify', () => {
  it('400 when token missing', async () => {
    const ctx = makeCtx({ url: 'http://x/api/v1/auth/verify' });
    const res = await (mod as any).onRequest(ctx);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('INVALID_ARGUMENT');
  });

  it('200 on valid token (GET) and sets cookie', async () => {
    const { db, state } = makeD1Mock();
    state.firstResult = { email: 'alice@studenti.unitn.it', expires_at: Math.floor(Date.now()/1000) + 60 };

    const origPrepare = db.prepare.bind(db);
    db.prepare = (sql: string) => {
      state.lastSQL = sql;
      const stmt = origPrepare(sql);
      if (/SELECT\s+email,\s*expires_at\s+FROM\s+magic_tokens/i.test(sql)) {
        stmt.first = async <T>() => state.firstResult as T;
      }
      return stmt;
    };

    const ctx = makeCtx({
      url: 'http://local/api/v1/auth/verify?token=abc',
      env: {
        APP_MODE: 'dev',
        SESSION_SECRET: 'dev-secret',
        DB: db
      }
    });

    const res = await (mod as any).onRequest(ctx);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.data.email).toBe('alice@studenti.unitn.it');

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/sid=/);
  });
});