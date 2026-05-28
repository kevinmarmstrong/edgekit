Audience: adopter

# Migration And Upgrades

Edgekit is designed so core primitives can improve without forcing every app integration to rewrite.

## Recommended Migration Path

1. Keep executable tools app-owned.
2. Move mission-specific prompts, required tools, synthesis rules, and safety intent into a Mission Profile.
3. Wrap reusable capabilities as Skills.
4. Validate profiles against registered tools.
5. Run outcome scenarios before and after upgrading Edgekit.

## From Raw Configure To Profile

Before:

```ts
chat.configure({
  systemPrompt: 'Long mission prompt...',
  model: [chromeAI()],
  toolChoice: 'required',
})
chat.registerTools({ searchProducts, addToCart })
```

After:

```ts
chat.configure({ model: [chromeAI()] })
chat.applyMissionProfile(publicCatalogShoppingProfile)
chat.registerTools({ searchProducts, addToCart })
```

The app still owns `searchProducts` and `addToCart`. The profile owns mission localization and upgrade-facing metadata.

## Upgrade Gate

Before accepting a core upgrade:

- Run `validateMissionProfile()` on all production profiles.
- Run focused outcome scenarios for each mission.
- Compare `synthesisFaithfulness`, `safety`, `workflowState`, and `answerQuality`.
- Read release notes for approval, tool execution, provider routing, and EdgeView changes.

If a core change requires profile edits, prefer bounded Skill/Profile patches and held-out validation.
