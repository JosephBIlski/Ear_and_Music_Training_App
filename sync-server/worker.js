/**
 * Minimal sync server for the Ear Trainer app as a Cloudflare Worker.
 *
 * Stores one JSON snapshot per token in a KV namespace. Deploy:
 *   1. npm i -g wrangler && wrangler login
 *   2. wrangler kv namespace create SNAPSHOTS        (paste the id into wrangler.toml)
 *   3. wrangler secret put SYNC_TOKEN                (choose a long random string)
 *   4. wrangler deploy
 * Then in the app: Settings → Sync → "Custom endpoint", URL = your worker URL,
 * token = the SYNC_TOKEN value.
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!env.SYNC_TOKEN || token !== env.SYNC_TOKEN) return new Response('unauthorized', { status: 401, headers: cors });

    const key = 'snapshot:' + token.slice(0, 16);
    if (request.method === 'GET') {
      const body = await env.SNAPSHOTS.get(key);
      if (!body) return new Response('', { status: 404, headers: cors });
      return new Response(body, { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (request.method === 'PUT') {
      const body = await request.text();
      if (body.length > 5_000_000) return new Response('too large', { status: 413, headers: cors });
      try {
        JSON.parse(body);
      } catch {
        return new Response('invalid json', { status: 400, headers: cors });
      }
      await env.SNAPSHOTS.put(key, body);
      return new Response('ok', { headers: cors });
    }
    return new Response('method not allowed', { status: 405, headers: cors });
  },
};
