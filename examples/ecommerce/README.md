# Edgekit Ecommerce Eval Fixture

This package is the internal standalone workflow and E2E fixture for Edgekit maintainers. It stays in the monorepo so CI can exercise catalog search, action cards, approval gates, and no-model fallback while the v3.5 refactor is in flight.

The public adopter demo is the external packed-package repo:

- COOP/COEP live demo: https://edgekit-demo-ecommerce.pages.dev/
- GitHub Pages fallback/no-model reference: https://kevinmarmstrong.github.io/edgekit-demo-ecommerce/
- Source: https://github.com/kevinmarmstrong/edgekit-demo-ecommerce

Use the external repo when evaluating the fresh-adopter install path. Use this fixture when changing core runtime behavior, UI primitives, approval flow, or workflow tests.
