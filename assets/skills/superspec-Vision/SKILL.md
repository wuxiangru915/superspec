---
name: superspec-Vision
description: "Superspec Phase 1: Open [FUSED]. Clarify requirements, triage scale, and initialize the dual-star change structure (WHAT + HOW) in one cohesive flow."
---

# Superspec Phase 1: Open (Integrated)

This is a **Fused Skill**. You no longer need to load separate Superspec or Superspec skills for Phase 1.

## 0. Output Language Constraint

Every prompt and artifact request must use the language of the user request that triggered this workflow. Preserve the dominant artifact language on resume.

## 1. Requirement Exploration (Inline Explore)

Instead of delegating, perform deep clarification directly. Align with the user to form a **Clarification Summary**:
- **Problem & Goals**: The core value proposition.
- **Non-goals**: Explicit exclusions.
- **Scope & Boundaries**: Affected modules and data.
- **Key Unknowns**: Risks and dependencies.
- **Success Scenarios**: Specific, testable acceptance criteria.

**Blocking Point (1b)**: Present the summary and use the platform's confirmation tool to wait for user approval.

## 2. Scale Triage (PRD Split)

If the input is large (Multiple journeys/milestones), propose a **Split Plan** before creating artifacts.
- Propose independent changes with clear goals.
- **Blocking Point (1a)**: Wait for user choice (Split vs. Single vs. Adjust).

## 3. Unified Initialization (WHAT + HOW)

Once confirmed, initialize the change using the `openspec` CLI but drive the content synthesis yourself.

**Execution**:
1. Run `openspec new change <name>` (use confirmed name).
2. Initialize Superspec state: `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" ignite <name> full`.

**Artifact Synthesis**:
Create the following files in `.superspec/missions/<name>/` based on the **Clarification Summary**:

- `intent.md`: Focus on **WHY** (Problem, Goals, Impact).
- `blueprint.md`: Focus on **WHAT** (Scope, Logic, Data Flow, External APIs).
- `roadmap.md`: Focus on **EXECUTION** (Actionable checkboxes).

*Note: In this fused mode, `blueprint.md` now acts as the bridge between Superspec and Superspec, including initial architectural assumptions.*

## Exit Conditions

- Clarification Summary approved by user.
- `intent.md`, `blueprint.md`, `roadmap.md` created with complete, high-fidelity content.
- Superspec state machine initialized (`phase: Vision`).
- **Phase transition**: Run `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Vision --apply`.

## NEXT Action

Run `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <change-name>` to determine if you should auto-invoke `/superspec-Blueprint`.
