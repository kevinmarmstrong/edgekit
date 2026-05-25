import { createServer } from 'node:http'

const port = Number(process.env.EDGEKIT_TEST_ROUTES_PORT ?? '4198')

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`)
  response.setHeader('access-control-allow-origin', '*')
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type,authorization,x-edgekit-trace-id')
  response.setHeader('content-type', 'application/json')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (url.pathname === '/health') {
    send(response, 200, { ok: true, service: 'edgekit-test-routes' })
    return
  }

  if (url.pathname === '/api/edgekit/cloud-route') {
    send(response, 200, {
      ok: true,
      provider: 'edgekit-test-cloud-route',
      model: 'deterministic-test-worker',
      message: 'Local EdgeKit test cloud route is reachable.',
    })
    return
  }

  if (url.pathname === '/api/ag-ui') {
    send(response, 200, {
      type: 'message',
      text: 'Local AG-UI test endpoint is reachable.',
      edgeView: {
        type: 'card',
        title: 'Provider test endpoint',
        body: 'This endpoint is for local harness wiring, not a production backend.',
      },
    })
    return
  }

  if (url.pathname === '/api/mcp') {
    send(response, 200, {
      tools: [
        {
          name: 'searchDocs',
          description: 'Search EdgeKit docs in the local harness.',
          inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        },
      ],
    })
    return
  }

  send(response, 404, { ok: false, error: 'not_found' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({
    health: `http://127.0.0.1:${port}/health`,
    cloudRouteURL: `http://127.0.0.1:${port}/api/edgekit/cloud-route`,
    agUiEndpoint: `http://127.0.0.1:${port}/api/ag-ui`,
    mcpProxyURL: `http://127.0.0.1:${port}/api/mcp`,
  }, null, 2))
})

function send(response, status, body) {
  response.writeHead(status)
  response.end(`${JSON.stringify(body, null, 2)}\n`)
}
