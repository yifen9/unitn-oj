export const onRequest: PagesFunction = async ({ request, env }) => {
  const isProd = String(env.APP_MODE || '').toLowerCase() === 'prod';

  let token = new URL(request.url).searchParams.get('token') || '';
  if (!token && request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    if (!/application\/json|.+\+json/i.test(contentType)) {
      return jsonError('INVALID_ARGUMENT', 'content-type must be application/json', 415);
    }
    try {
      const raw = await request.text();
      const body = raw ? JSON.parse(raw) : {};
      token = String(body.token ?? '').trim();
    } catch {
      return jsonError('INVALID_ARGUMENT', 'invalid JSON body', 400);
    }
  }
  if (!token) return jsonError('INVALID_ARGUMENT', 'token required', 400);

  let email = '';
  try {
    const row = await env.DB
      .prepare('SELECT email, expires_at FROM magic_tokens WHERE token=?1')
      .bind(token)
      .first<{ email: string; expires_at: number }>();

    if (!row) return jsonError('UNAUTHENTICATED', 'token not found', 401);
    if (row.expires_at < Math.floor(Date.now() / 1000)) {
      await env.DB.prepare('DELETE FROM magic_tokens WHERE token=?1').bind(token).run().catch(() => {});
      return jsonError('UNAUTHENTICATED', 'token expired', 401);
    }
    email = row.email.toLowerCase();
  } catch (e) {
    console.error('D1 select failed:', e);
    if (isProd) return jsonError('INTERNAL', 'database error', 500);
  }

  const nowIso = new Date().toISOString();
  const userId = await userIdFromEmail(email);
  try {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO users(user_id,email,created_at) VALUES(?1,?2,?3) ' +
        'ON CONFLICT(email) DO UPDATE SET email=excluded.email'
      ).bind(userId, email, nowIso),
      env.DB.prepare('DELETE FROM magic_tokens WHERE token=?1').bind(token)
    ]);
  } catch (e) {
    console.error('D1 upsert/delete failed:', e);
    if (isProd) return jsonError('INTERNAL', 'database error', 500);
  }

  const sessionTtlSeconds = Number(env.SESSION_TTL_SECONDS ?? 7 * 24 * 3600);
  const secret = String(env.SESSION_SECRET || '');
  if (isProd && !secret) return jsonError('FAILED_PRECONDITION', 'SESSION_SECRET missing', 500);

  const sid = await signSession(secret || 'dev-secret', email);

  const headers = new Headers({ 'content-type': 'application/json' });
  const cookieAttrs = [
    `sid=${sid}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${sessionTtlSeconds}`,
    isProd ? 'SameSite=Lax' : 'SameSite=Lax',
    isProd ? 'Secure'       : ''
  ].filter(Boolean).join('; ');
  headers.append('set-cookie', cookieAttrs);

  return new Response(JSON.stringify({ ok: true, data: { userId, email } }), { headers });
};

function jsonError(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status, headers: { 'content-type': 'application/json' }
  });
}

async function userIdFromEmail(email: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  return 'u_' + [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signSession(secret: string, email: string) {
  const ts = Math.floor(Date.now() / 1000);
  const payload = `${email}.${ts}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${payload}.${b64}`;
}