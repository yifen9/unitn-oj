export const onRequestGet: PagesFunction = async () =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });