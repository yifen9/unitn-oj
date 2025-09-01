import type { PagesFunction } from '@cloudflare/workers-types';

export type D1Stmt = { bind: (...args: unknown[]) => D1Stmt; run: () => Promise<unknown>; first: <T>() => Promise<T | null>; };
export type D1DatabaseLike = { prepare: (sql: string) => D1Stmt; batch?: (stmts: D1Stmt[]) => Promise<unknown>; };

export function makeCtx<TEnv extends Record<string, any>>(opts: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  env?: TEnv & { DB?: D1DatabaseLike };
}): Parameters<PagesFunction>[0] {
  const req = new Request(opts.url, {
    method: opts.method ?? 'GET',
    headers: opts.headers,
    body: opts.body
  });
  return {
    request: req,
    env: (opts.env ?? {}) as any,
    waitUntil: () => {},
    next: async () => new Response('next'),
    data: {}
  } as any;
}

export function makeD1Mock() {
  const state = {
    lastSQL: '',
    lastArgs: [] as unknown[],
    firstResult: null as any
  };
  const stmt: D1Stmt = {
    bind: (...args: unknown[]) => { state.lastArgs = args; return stmt; },
    run: async () => ({ success: true }),
    first: async <T>() => state.firstResult as T | null
  };
  const db: D1DatabaseLike = {
    prepare: (sql: string) => { state.lastSQL = sql; return stmt; },
    batch: async () => ({ success: true })
  };
  return { db, state };
}
