export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const isProd = String(env.APP_MODE || '').toLowerCase() === 'prod';

  const contentType = request.headers.get('content-type') || '';
  if (!/application\/json|.+\+json/i.test(contentType)) {
    return jsonError('INVALID_ARGUMENT', 'content-type must be application/json', 415);
  }

  let email = '';
  try {
    const raw = await request.text();
    const body = raw ? JSON.parse(raw) : {};
    email = String(body.email ?? '').trim().toLowerCase();
  } catch {
    return jsonError('INVALID_ARGUMENT', 'invalid JSON body', 400);
  }

  const allowedDomain = String(env.EMAIL_ALLOWED_DOMAIN);
  if (!email || !email.endsWith('@' + allowedDomain)) {
    return jsonError('INVALID_ARGUMENT', `email must end with @${allowedDomain}`, 400);
  }

  const tokenTtlSeconds = Number(env.TOKEN_TTL_SECONDS ?? 300);
  const token = randomHex(32);
  const expiresAt = Math.floor(Date.now() / 1000) + tokenTtlSeconds;

  try {
    await env.DB
      .prepare('INSERT INTO magic_tokens (token,email,expires_at) VALUES (?1,?2,?3)')
      .bind(token, email, expiresAt)
      .run();
  } catch (e) {
    console.error('D1 insert failed:', e);
    if (isProd) return jsonError('INTERNAL', 'database error', 500);
  }

  const url = new URL(request.url);
  url.pathname = '/api/v1/auth/verify';
  url.searchParams.set('token', token);

  if (isProd) return json({ ok: true });
  return json({ ok: true, data: { magicUrl: url.toString() } });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function jsonError(code: string, message: string, status = 400) {
  return json({ ok: false, error: { code, message } }, status);
}

function randomHex(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}