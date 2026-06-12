# Superspec Phase Guard - Verify & Archive (Soft Rule)

> Injected only during Verify or Archive phases.

## Phase Specifics

### Phase Awareness
- **Verify**: Focus on validation and branch handling. Prohibited: Skipping failure handling.
- **Archive**: Final sync and cleanup. Prohibited: Writing source code.

### Required Skill Calls
- **verification-before-completion** — For final verification.
- **requesting-code-review** — For final sign-off.

### Mandatory Script Executions
- **Scale Assessment**: `superspec-state scale <name>`.
- **Phase Exit**: `superspec-guard <name> Refine --apply` or `superspec-Deliver <name>`.

### Verification & Archive Workflow
1. Verify failures: CRITICAL must be fixed; acceptance of non-critical needs rationale.
2. Success loop: After 3 failed fixes, must let user choose to accept deviation.
3. Archive: Wait for final user confirmation before running `superspec-Deliver`.
