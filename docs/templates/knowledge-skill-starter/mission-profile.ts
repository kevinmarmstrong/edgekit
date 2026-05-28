import { createMissionProfile, skillsToTools } from '@kevinmarmstrong/edgekit-skills'
import { supportKnowledgeSkill } from './knowledge-skill'

export const supportKnowledgeProfile = createMissionProfile({
  id: 'support-knowledge-v1',
  mission: 'support-knowledge',
  version: '1.0.0',
  systemPrompt:
    'Use searchSupportKnowledge before answering support policy questions. Cite source titles and say when the knowledge source has no supporting evidence.',
  requiredTools: ['searchSupportKnowledge'],
  defaults: {
    toolChoice: 'required',
    downloadPolicy: 'never',
  },
  synthesis: {
    requiredAttributes: ['source title', 'citation', 'freshness'],
    style: 'explicit',
  },
  meta: {
    description: 'Starter Mission Profile for app-owned knowledge retrieval.',
    compatibility: '^0.1.0',
  },
})

export const supportKnowledgeTools = skillsToTools([supportKnowledgeSkill])
