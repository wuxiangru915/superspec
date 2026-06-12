---
name: superspec-Blueprint
description: "Superspec Phase 2: Deep Design [FUSED]. Conduct deep technical brainstorming based on requirements, select architectural approach, and produce technical Design Doc in one integrated flow."
---

# Superspec Phase 2: Deep Design (Integrated)

This is a **Fused Skill**. You no longer need to load separate Superspec `brainstorming` skills.

## 1. Context Handoff

Run the handoff script to prepare the requirements context for technical Blueprint:
```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_HANDOFF" <change-name> Blueprint --write
```

## 2. Technical Brainstorming (Inline Brainstorming)

Conduct deep technical Blueprint directly. Use the Superspec artifacts as the "WHAT" and focus on the "HOW".

**Brainstorming Flow**:
- **Analyze Complexity**: Read the Handoff Pack and identify technical risks, bottlenecks, and data flow.
- **Propose Approaches**: Present 2-3 distinct technical approaches (e.g., lightweight vs. robust, iterative vs. full-rebuild).
- **Evaluate Trade-offs**: Compare performance, maintainability, and implementation cost for each approach.
- **Testing Strategy**: Define how to Refine success (Unit, Integration, E2E).

**Blocking Point (1c)**: Present the chosen approach and wait for user confirmation.

## 3. Integrated Design Synthesis

Once confirmed, produce the technical **Design Doc**.

**Output**:
- Write the Technical Design to `.superspec/blueprints/YYYY-MM-DD-<topic>-blueprint.md`.
- **Spec Patch**: If Blueprint finding implies a requirements change, sync `.superspec/missions/<name>/blueprint.md` or `specs/*/spec.md` directly.

**Design Doc Schema**:
- Frontmatter: `superspec_change: <name>`, `role: technical-Blueprint`.
- Content: Architecture, Components, Data Flow, Error Handling, Verification Plan.

## 4. State Update

```bash
# Record blueprint_doc
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <name> blueprint_doc .superspec/blueprints/YYYY-MM-DD-topic-blueprint.md

# Regenerate handoff to capture any Spec Patches
"$SUPERSPEC_BASH" "$SUPERSPEC_HANDOFF" <change-name> Blueprint --write
```

## Exit Conditions

- Deep technical Blueprint conducted via inline brainstorming.
- Architectural approach confirmed by user.
- Design Doc created and saved.
- **Phase transition**: Run `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Blueprint --apply`.

## NEXT Action

Run `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <change-name>` to determine if you should auto-invoke `/superspec-Forge`.
