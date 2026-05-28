import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const searchAccountsSkill = createSkill({
  id: 'search-accounts',
  name: 'Search Accounts',
  description: 'Find customer accounts before recommending or changing account state.',
  instructions: 'Search for the account first, restate account name, current plan, status, and risk signals, and do not imply a mutation has happened.',
  activationExamples: ['find Northwind account', 'what is Globex status?', 'look up account plan before changing it'],
  doNotActivateWhen: ['The user is asking public product catalog questions.', 'The user is asking Edgekit documentation questions.'],
  requiredTools: ['searchAccounts'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['account name', 'plan', 'status'], preferredStyle: 'explicit' },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: { slowStatePaths: ['policy'], fastStatePaths: ['description', 'instructions', 'activationExamples'], maxPatchOperations: 8 },
  meta: { category: 'admin', version: '1.1.0' },
})

export const updatePlanSkill = createSkill({
  id: 'update-plan',
  name: 'Update Account Plan',
  description: 'Change an account plan after explicit approval.',
  instructions: 'Use only after account lookup has identified a specific account and target plan. Require approval, then confirm the exact account and new plan after execution.',
  activationExamples: ['upgrade Northwind to Enterprise', 'move Northwind Labs onto the enterprise plan'],
  doNotActivateWhen: ['The target account or plan is ambiguous.', 'The user asks to bypass approval.'],
  requiredTools: ['updatePlan'],
  policy: { needsApproval: true, riskLevel: 'high', approvalMessage: 'Update this account plan?' },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: { slowStatePaths: ['policy'], fastStatePaths: ['description', 'instructions', 'activationExamples'], maxPatchOperations: 8 },
  meta: { category: 'admin', version: '1.1.0' },
})

export const suspendAccountSkill = createSkill({
  id: 'suspend-account',
  name: 'Suspend Account',
  description: 'Suspend an account after explicit approval.',
  instructions: 'Use only after account lookup has identified a specific account. Require approval, preserve account status on rejection, and confirm final state after execution.',
  activationExamples: ['suspend Globex account', 'put Globex Retail into suspension'],
  doNotActivateWhen: ['The target account is ambiguous.', 'The user asks to bypass approval or silently suspend.'],
  requiredTools: ['suspendAccount'],
  policy: { needsApproval: true, riskLevel: 'high', approvalMessage: 'Suspend this account?' },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: { slowStatePaths: ['policy'], fastStatePaths: ['description', 'instructions', 'activationExamples'], maxPatchOperations: 8 },
  meta: { category: 'admin', version: '1.1.0' },
})

export const adminWorkflowProfile = createMissionProfile({
  id: 'admin-workflow-v1',
  mission: 'internal-admin',
  version: '1.0.0',
  systemPrompt: `You are a precise SaaS admin assistant.
Always search accounts before recommending or changing account state.
Ask for explicit approval before changing plans or suspending accounts.
After tool results, restate the account name, current status, target change, and approval boundary.`,
  requiredTools: ['searchAccounts', 'updatePlan', 'suspendAccount'],
  defaults: { downloadPolicy: 'never', toolChoice: 'required' },
  synthesis: { requiredAttributes: ['account', 'plan', 'status', 'approval boundary'], style: 'explicit' },
  meta: {
    description: 'Internal admin agent workflow for account search, plan changes, and suspensions behind approval gates.',
    compatibility: '^0.1.0',
  },
})
