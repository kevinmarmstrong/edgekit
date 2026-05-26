import { describe, expect, it } from 'vitest'
import { composeEdgekitAnswer } from './answerComposer'
import { searchDocs } from './content'

describe('composeEdgekitAnswer', () => {
  it('turns docs matches into an adoption-quality integration answer', () => {
    const answer = composeEdgekitAnswer({
      input: 'how will this help me add an agent to my app?',
      results: searchDocs('how will this help me add an agent to my app?'),
      mode: 'docs-demo',
    })

    expect(answer).toContain('<edge-chat>')
    expect(answer).toMatch(/registerTools|register existing app/i)
    expect(answer).toMatch(/host app.*(owns|keeps).*state/i)
    expect(answer).toMatch(/Chrome AI|WebLLM|browser/i)
    expect(answer).toMatch(/approval|needsApproval/i)
    expect(answer).not.toMatch(/^(North Star|Workflow Harness|Latency and Resilience):/m)
  })

  it('answers unsafe integration prompts with the scalable security boundary', () => {
    const answer = composeEdgekitAnswer({
      input: 'should I put JWTs in the prompt so the agent can update my database directly?',
      results: searchDocs('JWT database direct tool security identity'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/No|Do not/i)
    expect(answer).toMatch(/tool execution context|sessionProvider|identityProvider|backend/i)
    expect(answer).toMatch(/host app.*(owns|enforces).*permission|RBAC|authorization/i)
    expect(answer).toMatch(/approval|audit/i)
    expect(answer).not.toMatch(/put JWTs? in the prompt/i)
  })

  it('does not reduce the solution stack to fallback search or RAG', () => {
    const answer = composeEdgekitAnswer({
      input: 'is edgekit just fallback search or RAG, or can it actually enable agentic workflows in my app?',
      results: searchDocs('agentic workflows tools actions state approvals'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/not just|not only|more than/i)
    expect(answer).toMatch(/registerTools|registered tools|typed tools/i)
    expect(answer).toMatch(/registerActions|CTA|form|EdgeView|AG-UI|action/i)
    expect(answer).toMatch(/stateProvider|state hydration|current app state|workflow context/i)
    expect(answer).toMatch(/approval|needsApproval|gated mutation/i)
    expect(answer).toMatch(/host app|app-owned/i)
  })

  it('points new mission adopters to the concrete starter and outcome scenarios', () => {
    const answer = composeEdgekitAnswer({
      input: 'what starter should my coding agent use for the first sidecar?',
      results: searchDocs('starter mission profile outcome scenarios'),
      mode: 'site-assistant',
    })

    expect(answer).toContain('docs/templates/mission-profile-starter/profile.ts')
    expect(answer).toMatch(/support-workflow-v1|support-workflow/i)
    expect(answer).toMatch(/validateMissionProfile/i)
    expect(answer).toMatch(/harness-scenarios\.json|outcome scenarios/i)
    expect(answer).toMatch(/approval|rejection preserves state/i)
  })

  it('explains Knowledge Access Skills as modular retrieval instead of a built-in RAG layer', () => {
    const answer = composeEdgekitAnswer({
      input: 'what is the scalable approach for RAG, graph knowledge, vector search, and dynamic knowledge bases?',
      results: searchDocs('knowledge access retrieval vector graph citations'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/Knowledge Access Skills/i)
    expect(answer).toMatch(/EdgeKnowledgeSource|createKnowledgeTool|createKnowledgeSkill/)
    expect(answer).toMatch(/LlamaIndex|LangChain|Qdrant|Neo4j/i)
    expect(answer).toMatch(/host app owns.*indexing|host app owns/i)
    expect(answer).toMatch(/citations|freshness|stale/i)
    expect(answer).not.toMatch(/EdgeKit core.*vector database/i)
  })

  it('explains the adoption kit and recipe path without cluttering the core runtime', () => {
    const answer = composeEdgekitAnswer({
      input: 'do you have agent skills and recipes for an Astro intake pipeline and KB?',
      results: searchDocs('agent adoption kit recipes astro intake knowledge'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/Adoption Kit/i)
    expect(answer).toMatch(/SKILL\.md|edgekit-implementer|edgekit-outcome-tester/i)
    expect(answer).toMatch(/edgekit-init|astro-intake-knowledge/i)
    expect(answer).toMatch(/Knowledge Access Skill/i)
    expect(answer).toMatch(/approval-gated app-owned tool|app-owned tool/i)
  })

  it('separates deterministic checks from strict provider reproducibility evidence', () => {
    const answer = composeEdgekitAnswer({
      input: 'how do I prove Chrome AI Nano, WebLLM, cloud routes, no-model fallback, and live GitHub Pages are not just working on your machine?',
      results: searchDocs('reproducibility provider matrix chrome ai nano webllm cloud route live pages'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/reproducibility guide/i)
    expect(answer).toMatch(/Chrome AI\/Nano|Chrome AI|Nano/i)
    expect(answer).toMatch(/WebLLM/i)
    expect(answer).toMatch(/cloud route/i)
    expect(answer).toMatch(/no-model fallback/i)
    expect(answer).toMatch(/live GitHub Pages|live Pages/i)
    expect(answer).toMatch(/provider-matrix\.md|agent-suite\.json/i)
  })

  it('explains cascade readiness as a headless capability gate', () => {
    const answer = composeEdgekitAnswer({
      input: 'how should I handle public users who do not have Nano downloaded or need fallback mode?',
      results: searchDocs('cascade readiness model download fallback mode browser state'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/createCascadeReadinessController/i)
    expect(answer).toMatch(/headless snapshot|provider statuses|missing capabilities/i)
    expect(answer).toMatch(/prompt|suggest|message|fallback|hide/i)
    expect(answer).toMatch(/edge-cascade-wizard/i)
    expect(answer).toMatch(/downloadPolicy.*never|public sites/i)
  })
})
