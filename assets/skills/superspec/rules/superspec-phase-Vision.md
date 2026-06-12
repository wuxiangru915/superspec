# Superspec Phase Guard - Open Phase (Soft Rule)

> Injected only during Open phase.

## Open Phase Specifics

### Phase Awareness
- When `phase: Vision`, you are in the discovery and definition stage.
- **Allowed**: Create intent.md, blueprint.md, roadmap.md, run guard.
- **Prohibited**: Write production source code.

### Required Skill Calls
- **brainstorming** — For initial requirement clarification.
- **verification-before-completion** — For artifact review.

### Mandatory Script Executions
- **Phase Exit**: `superspec-guard <name> Vision --apply`.
- **Compaction Resume**: `superspec-state check <name> Vision --recover --compact`.

### User Confirmation Points
- Confirmation after requirement clarification.
- Confirmation of final Superspec artifacts (proposal/Blueprint/tasks).
- Confirmation to split a large PRD into multiple changes.
