import { describe, it, expect } from 'vitest';
import * as mod from '../functions/api/v1/auth/requestLink';
import { makeCtx, makeD1Mock, readJson } from './helpers';

const DEV_ENV = {
  APP_ENV: 'dev',
  AUTH_ALLOWED_DOMAIN: 'studenti.unitn.it',
  AUTH_TOKEN_TTL_SECONDS: '300',
  SESSION_SECRET: 'dev-secret',
};

const PROD_ENV = {
  APP_ENV: 'prod',
  AUTH_ALLOWED_DOMAIN: 'studenti.unitn.it',
  AUTH_TOKEN_TTL_SECONDS: '300',
  SESSION_SECRET: 'prod-secret',
};

describe('POST /api/v1/auth/requestLink', () => {
  it('415 when content-type is not JSON', async () => {
    const ctx = makeCtx({
      url: 'http://x/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'email=foo',
      env: DEV_ENV,
    });
    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(415);
    const j = await readJson(res);
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('INVALID_ARGUMENT');
  });

  it('400 when invalid JSON body', async () => {
    const ctx = makeCtx({
      url: 'http://x/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
      env: DEV_ENV,
    });
    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(400);
    const j = await readJson(res);
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('INVALID_ARGUMENT');
  });

  it('412 FAILED_PRECONDITION when AUTH_ALLOWED_DOMAIN missing', async () => {
    const ctx = makeCtx({
      url: 'http://x/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@studenti.unitn.it' }),
      env: { APP_ENV: 'development', APP_MODE: 'dev' },
    });
    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(412);
    const j = await readJson(res);
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('FAILED_PRECONDITION');
  });

  it('400 INVALID_ARGUMENT when email empty or wrong domain', async () => {
    const { db } = makeD1Mock();
    const ctx1 = makeCtx({
      url: 'http://x/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: '' }),
      env: { ...DEV_ENV, DB: db },
    });
    const res1 = await (mod as any).onRequestPost(ctx1);
    expect(res1.status).toBe(400);
    const j1 = await readJson(res1);
    expect(j1.error.code).toBe('INVALID_ARGUMENT');

    const ctx2 = makeCtx({
      url: 'http://x/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bob@gmail.com' }),
      env: { ...DEV_ENV, DB: db },
    });
    const res2 = await (mod as any).onRequestPost(ctx2);
    expect(res2.status).toBe(400);
    const j2 = await readJson(res2);
    expect(j2.error.code).toBe('INVALID_ARGUMENT');
    expect(j2.error.message).toContain('@studenti.unitn.it');
  });

  it('200 dev: returns magicUrl and inserts token into D1', async () => {
    const { db, state } = makeD1Mock();
    const ctx = makeCtx({
      url: 'http://local/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@studenti.unitn.it' }),
      env: { ...DEV_ENV, DB: db },
    });

    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(200);
    const j = await readJson(res);
    expect(j.ok).toBe(true);
    expect(j.data.magicUrl).toMatch(/\/api\/v1\/auth\/verify\?token=/);

    expect(state.lastSQL).toMatch(/INSERT\s+INTO\s+magic_tokens/i);
    expect(state.lastArgs.length).toBe(3);
    expect(state.lastArgs[1]).toBe('alice@studenti.unitn.it');
  });

  it('200 prod: no magicUrl in response body', async () => {
    const { db } = makeD1Mock();
    const ctx = makeCtx({
      url: 'https://oj.example.com/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@studenti.unitn.it' }),
      env: { ...PROD_ENV, DB: db },
    });

    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(200);
    const j = await readJson(res);
    expect(j.ok).toBe(true);
    expect(j.data).toBeUndefined();
  });

  it('500 INTERNAL on D1 insert error in production; dev tolerates', async () => {
    const { db } = makeD1Mock();
    const origPrepare = db.prepare.bind(db);
    (db as any).prepare = (sql: string) => {
      const stmt = origPrepare(sql);
      stmt.run = async () => {
        throw new Error('D1 insert failed');
      };
      return stmt;
    };

    const ctxProd = makeCtx({
      url: 'https://oj.example.com/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@studenti.unitn.it' }),
      env: { ...PROD_ENV, DB: db },
    });
    const resProd = await (mod as any).onRequestPost(ctxProd);
    expect(resProd.status).toBe(500);
    const jProd = await readJson(resProd);
    expect(jProd.ok).toBe(false);
    expect(jProd.error.code).toBe('INTERNAL');

    const ctxDev = makeCtx({
      url: 'http://local/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@studenti.unitn.it' }),
      env: { ...DEV_ENV, DB: db },
    });
    const resDev = await (mod as any).onRequestPost(ctxDev);
    expect(resDev.status).toBe(200);
    const jDev = await readJson(resDev);
    expect(jDev.ok).toBe(true);
  });

  it('accepts structured json content-types like application/merge-patch+json', async () => {
    const { db } = makeD1Mock();
    const ctx = makeCtx({
      url: 'http://local/api/v1/auth/requestLink',
      method: 'POST',
      headers: { 'content-type': 'application/merge-patch+json' },
      body: JSON.stringify({ email: 'alice@studenti.unitn.it' }),
      env: { ...DEV_ENV, DB: db },
    });
    const res = await (mod as any).onRequestPost(ctx);
    expect(res.status).toBe(200);
  });
});
