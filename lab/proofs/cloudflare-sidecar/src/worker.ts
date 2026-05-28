export interface Env {
  ASSETS: Fetcher
  EDGEKIT_PROVIDER_LANE?: string
  EDGEKIT_CLOUD_ROUTE_URL?: string
  EDGEKIT_CLOUD_ROUTE_TOKEN?: string
  EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN?: string
}

const maxCloudRouteBytes = 64_000

const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

const knowledge = [
  {
    id: 'kb-cloudflare-host',
    title: 'Cloudflare host requirements',
    body: 'Cloudflare Workers can serve Edgekit demos with COOP and COEP headers, which is required for WebLLM SharedArrayBuffer execution on capable browsers.',
    citation: '/docs/CLOUDFLARE-ARCHITECTURE-PROOF.md#headers',
  },
  {
    id: 'kb-cloud-route',
    title: 'Explicit cloud route',
    body: 'Edgekit should only use a cloud model through a developer-owned route. The route can enforce tenant policy, redact context, and record telemetry before forwarding.',
    citation: '/docs/CLOUDFLARE-ARCHITECTURE-PROOF.md#cloud-route',
  },
  {
    id: 'kb-intake',
    title: 'Approval-gated intake',
    body: 'Intake submission is a mutating workflow. The sidecar can render a form, but the Worker route owns validation, persistence, and authorization.',
    citation: '/docs/CLOUDFLARE-ARCHITECTURE-PROOF.md#intake',
  },
]

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/edgekit/health') {
      return json({ ok: true, lane: env.EDGEKIT_PROVIDER_LANE ?? 'cloudflare-worker' })
    }
    if (url.pathname === '/api/edgekit/knowledge/search') {
      return handleKnowledge(request)
    }
    if (url.pathname === '/api/edgekit/intake') {
      return handleIntake(request)
    }
    if (url.pathname === '/api/edgekit/cloud-route') {
      return handleCloudRoute(request, env)
    }

    const response = await env.ASSETS.fetch(request)
    return withHeaders(response)
  },
}

async function handleKnowledge(request: Request) {
  if (request.method !== 'POST') return methodNotAllowed()
  const input = await request.json().catch(() => ({})) as { query?: string; topK?: number }
  const query = String(input.query ?? '').toLowerCase()
  const topK = Math.min(Math.max(Number(input.topK ?? 4), 1), 6)
  const results = knowledge
    .filter(item => `${item.title} ${item.body}`.toLowerCase().includes(query) || query.length < 3)
    .slice(0, topK)
    .map(item => ({
      id: item.id,
      title: item.title,
      body: item.body,
      citation: item.citation,
      source: 'cloudflare-sidecar-worker',
      score: 1,
    }))
  return json({
    results: results.length > 0 ? results : knowledge.slice(0, 1),
    freshness: { stale: false, updatedAt: new Date().toISOString() },
  })
}

async function handleIntake(request: Request) {
  if (request.method !== 'POST') return methodNotAllowed()
  const input = await request.json().catch(() => ({})) as Record<string, unknown>
  const required = ['name', 'email', 'topic', 'summary']
  const missing = required.filter(key => typeof input[key] !== 'string' || String(input[key]).trim().length === 0)
  if (missing.length > 0) return json({ error: `Missing ${missing.join(', ')}` }, 400)
  return json({
    success: true,
    intakeId: `CF-${crypto.randomUUID().slice(0, 8)}`,
    storedBy: 'cloudflare-worker-route',
    received: input,
  })
}

async function handleCloudRoute(request: Request, env: Env) {
  if (request.method === 'GET') {
    if (env.EDGEKIT_CLOUD_ROUTE_URL && !env.EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN) {
      return json({
        ok: false,
        lane: 'cloud-route-forwarding-disabled',
        error: 'EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN must be configured before forwarding is advertised as ready.',
        accepts: ['POST'],
        forwardingRequiresAuth: true,
      }, 501)
    }
    return json({
      ok: true,
      lane: env.EDGEKIT_CLOUD_ROUTE_URL ? 'developer-forwarded-cloud-route' : 'cloudflare-worker-deterministic-stub',
      accepts: ['POST'],
      forwardingRequiresAuth: Boolean(env.EDGEKIT_CLOUD_ROUTE_URL),
    })
  }
  if (request.method !== 'POST') return methodNotAllowed()
  if (env.EDGEKIT_CLOUD_ROUTE_URL) {
    if (!env.EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN) {
      return json({ error: 'Cloud route forwarding is disabled until EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN is configured.' }, 501)
    }
    const authorization = request.headers.get('authorization')
    if (authorization !== `Bearer ${env.EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN}`) {
      return json({ error: 'Unauthorized cloud route request.' }, 401)
    }
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return json({ error: 'Cloud route requires application/json.' }, 415)
    }
    const declaredLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(declaredLength) && declaredLength > maxCloudRouteBytes) {
      return json({ error: 'Cloud route payload too large.' }, 413)
    }
  }
  const bodyResult = await readRequestTextWithLimit(request, maxCloudRouteBytes)
  if (!bodyResult.ok) return json({ error: 'Cloud route payload too large.' }, 413)
  const body = bodyResult.text
  if (env.EDGEKIT_CLOUD_ROUTE_URL) {
    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      return json({ error: 'Cloud route payload must be valid JSON.' }, 400)
    }
    if (!isRecord(payload)) return json({ error: 'Cloud route payload must be a JSON object.' }, 400)
    const response = await fetch(env.EDGEKIT_CLOUD_ROUTE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.EDGEKIT_CLOUD_ROUTE_TOKEN ? { authorization: `Bearer ${env.EDGEKIT_CLOUD_ROUTE_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return withHeaders(response)
  }
  return json({
    provider: 'cloudflare-worker-deterministic-stub',
    text: 'Cloud fallback route reached. Configure EDGEKIT_CLOUD_ROUTE_URL to forward this request to a hosted model provider.',
    receivedBytes: body.length,
  })
}

function methodNotAllowed() {
  return json({ error: 'Method not allowed' }, 405)
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function withHeaders(response: Response) {
  const next = new Response(response.body, response)
  for (const [key, value] of Object.entries(headers)) next.headers.set(key, value)
  return next
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readRequestTextWithLimit(request: Request, maxBytes: number): Promise<{ ok: true; text: string } | { ok: false }> {
  if (!request.body) return { ok: true, text: '' }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return { ok: false }
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, text: new TextDecoder().decode(body) }
}
