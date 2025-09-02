import type { PagesFunction } from '@cloudflare/workers-types';

export type D1Stmt = {
  bind: (...args: unknown[]) => D1Stmt;
  run: () => Promise<any>;
  first: <T>() => Promise<T | null>;
};
export type D1DatabaseLike = {
  prepare: (sql: string) => D1Stmt;
  batch?: (stmts: D1Stmt[]) => Promise<any>;
};

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
    body: opts.body,
  });
  return {
    request: req,
    env: (opts.env ?? {}) as any,
    waitUntil: () => {},
    next: async () => new Response('next'),
    data: {},
  } as any;
}

export function makeD1Mock() {
  const state = {
    /** last prepared SQL (most recent) */
    lastSQL: '' as string,
    /** last .bind() args (most recent statement) */
    lastArgs: [] as unknown[],
    /** default result for .first() unless overridden by per-test monkey patch  */
    firstResult: null as any,
    /** record of all prepared SQLs in order */
    prepared: [] as string[],
    /** count of run/first calls */
    counters: { run: 0, first: 0 },
  };

  const mkStmt = (): D1Stmt => {
    const stmt: D1Stmt = {
      bind: (...args: unknown[]) => {
        state.lastArgs = args;
        return stmt;
      },
      run: async () => {
        state.counters.run += 1;
        return { success: true };
      },
      first: async <T>() => {
        state.counters.first += 1;
        return state.firstResult as T | null;
      },
    };
    return stmt;
  };

  const db: D1DatabaseLike = {
    prepare: (sql: string) => {
      state.lastSQL = sql;
      state.prepared.push(sql);
      return mkStmt();
    },
    batch: async () => ({ success: true }),
  };

  return { db, state };
}

export async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Response is not JSON: ${text}`);
  }
}
