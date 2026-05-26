# Deployment and hosting

GitHub Pages hosts the public docs. Cloudflare Pages or Vercel can provide WebLLM headers.

## GitHub Pages

The canonical public site is deployed from `site/dist` by `.github/workflows/pages.yml`. GitHub Pages is good for the docs, Chrome AI demos, and basic fallback demos.

## WebLLM hosting headers

WebLLM works best when the host can set cross-origin isolation headers. The repo includes local Vite headers plus a Cloudflare Pages `_headers` file.



```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

## Cloudflare Pages

The repo includes `site/wrangler.jsonc` and a convenience deploy script for a WebLLM-capable Pages host.



```bash
pnpm deploy:cloudflare
```