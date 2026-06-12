# Superspec Phase Guard - Design Phase (Soft Rule)

> Injected only during Design phase.

## Design Phase Specifics

### Phase Awareness
- When `phase: Blueprint`, you are in technical architecture and planning.
- **Allowed**: brainstorming, create Design Doc, run guard.
- **Prohibited**: Write production source code.

### Required Skill Calls
- **brainstorming** — Must be used for deep technical Blueprint.
- **verification-before-completion** — For Design Doc review.

### Mandatory Script Executions
- **Handoff Generation**: `superspec-handoff <name> Blueprint --write` (Must run before brainstorming).
- **Phase Exit**: `superspec-guard <name> Blueprint --apply`.
- **Compaction Resume**: `superspec-state check <name> Blueprint --recover --compact`.
- **Handoff Check**: Use `superspec-handoff <name> --summary-only` if already written.

### Design Specific Workflow
1. Run `superspec-handoff` first.
2. Brainstorming: Incrementally sync `brainstorm-summary.md`.
3. Active Compaction: Trigger/ask for compaction after `brainstorm-summary.md` is finalized but before creating Design Doc.
4. User Confirmation: Must confirm technical approach before creating Design Doc.
