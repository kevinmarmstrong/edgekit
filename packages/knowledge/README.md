# @kevinmarmstrong/edgekit-knowledge

Knowledge sources, knowledge tools/skills, and Markdown memory for Edgekit.

Use `createGroundedQaSkill()` for public-site or docs Q&A that must answer from
host-owned evidence instead of model memory.

```ts
import { createGroundedQaSkill } from '@kevinmarmstrong/edgekit-knowledge'

const siteQa = createGroundedQaSkill({
  id: 'site',
  name: 'Site Q&A',
  description: 'Answer from public site content.',
  toolName: 'searchSite',
  identity: {
    name: 'Site assistant',
    noEvidenceMessage: 'I do not know from this site.',
  },
  source: { id: 'site', search: async query => searchLocalIndex(query) },
})
```
