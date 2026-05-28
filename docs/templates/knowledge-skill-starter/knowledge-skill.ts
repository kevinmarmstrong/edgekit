import { createKnowledgeSkill } from '@kevinmarmstrong/edgekit-knowledge'
import { createSimpleMarkdownKnowledgeSource } from './simple-markdown-source'

const documents = [
  {
    id: 'refund-policy',
    title: 'Refund policy',
    body: 'Refunds require order lookup, source citation, and manager approval when the amount is over $250.',
    source: 'support-policy.md',
    uri: '/internal/policy/refunds',
    roles: ['support', 'admin'],
    updatedAt: '2026-05-26',
  },
  {
    id: 'dispatch-safety',
    title: 'Dispatch safety checklist',
    body: 'Technician dispatch for compressor repairs requires inventory reservation before ETA changes.',
    source: 'field-ops.md',
    uri: '/internal/ops/dispatch-safety',
    roles: ['dispatcher', 'supervisor'],
    updatedAt: '2026-05-26',
  },
]

export const supportKnowledgeSource = createSimpleMarkdownKnowledgeSource(documents)

export const supportKnowledgeSkill = createKnowledgeSkill({
  id: 'support-knowledge',
  name: 'Support Knowledge',
  description: 'Search support and field-ops knowledge with role filtering, citations, and freshness labels.',
  source: supportKnowledgeSource,
  toolName: 'searchSupportKnowledge',
  activationExamples: [
    'what does the refund policy require?',
    'what safety rule applies before changing a technician ETA?',
  ],
  doNotActivateWhen: [
    'The user is asking to mutate app state without first asking for supporting policy.',
  ],
  requiredFacts: ['source title', 'policy requirement', 'citation'],
})
