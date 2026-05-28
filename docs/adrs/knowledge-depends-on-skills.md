Audience: contributor

# ADR: Knowledge Depends On Skills

Status: accepted for v3.5 Phase B

`@kevinmarmstrong/edgekit-knowledge` may depend on `@kevinmarmstrong/edgekit-skills`.

The production friction is that retrieval is often not just a tool call; adopters need a reviewable Skill artifact that carries router-visible description, activation guidance, citation expectations, freshness policy, protected sections, and executable tools together. `createKnowledgeSkill()` composes the Skill primitive rather than duplicating a parallel knowledge-specific Skill shape.

Without this dependency, knowledge would either duplicate Skill types and drift from Mission Profile composition, or force adopters to hand-wrap every knowledge source after creating the retrieval tool. The dependency lands for v3.5 adopters because Knowledge Access Skills are one of the primary starter paths, and keeping them composition-compatible is more important than making every sibling completely isolated.

Boundary rule: this is the only accepted cross-sibling dependency in Phase B. `knowledge -> skills` is allowed because Knowledge Skills are a specialization of the public Skill contract. Additional cross-sibling dependencies require their own ADR.
