# Testing outcome quality

Measure whether the agent achieved the workflow and answer quality the user needed.

## Do not stop at code ran

Agent tests must verify the final user-visible answer, generated UI, approval boundary, telemetry, and app state. A green tool call is not enough if the user-visible answer drops the facts the user asked for.

- `answerQuality`
- `synthesisFaithfulness`
- `safety`
- `workflowState`
- `generativeUi`
- `observability`
- `integrationTransparency`

## Catalog example

For `how much are Nike dunks and what sizes are carried?`, passing output must show Nike Dunk Low, $64.99, sizes 9, 10, 11, White / Black, and no cart mutation.

## Mutating workflow example

For `find me size nine white nike dunks and put in cart`, passing output must search first, request approval before `addToCart`, add size 9 only after approval, and leave cart unchanged after rejection.

## Harness rule

Add or update scenario and rubric checks before tuning a demo-specific response. Prefer reusable Edgekit fixes over narrow demo patches.