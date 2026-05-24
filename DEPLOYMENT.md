# Deployment Notes

## GitHub Pages

GitHub Pages is the canonical public docs and demo host for this repo:

https://kevinmarmstrong.github.io/edgekit/

The Pages workflow builds `site/dist` from `main` and deploys it with GitHub Actions. This host is ideal for the documentation site, Chrome AI demos, and basic-mode fallbacks.

## WebLLM Headers

WebLLM works best on a host that can set cross-origin isolation headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

GitHub Pages does not let this repo set those headers, so the public Pages site should not promise WebLLM availability. Use Cloudflare Pages, Vercel, or another configurable host for full Chrome AI -> WebLLM fallback verification.

## Cloudflare Pages Header Example

```text
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

## Vercel Header Example

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```
