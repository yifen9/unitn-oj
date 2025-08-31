export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
};