import { StateManager } from '../core/state-manager.js';
import { Workflow } from '../core/state.js';

const ALLOWED_FIELDS = new Set([
  'workflow', 'phase', 'context_compression', 'build_mode', 'build_pause',
  'subagent_dispatch', 'tdd_mode', 'isolation', 'refine_mode', 'auto_transition',
  'base_ref', 'blueprint_doc', 'plan', 'refine_result', 'verification_report',
  'branch_status', 'created_at', 'verified_at', 'archived',
  'change_id', 'openspec_version', 'direct_override',
  'build_command', 'verify_command', 'handoff_context', 'handoff_hash',
]);

export async function stateCommand(args: string[]): Promise<void> {
  const [subcommand, changeName, ...rest] = args;
  const manager = new StateManager();

  try {
    switch (subcommand) {
      case 'ignite': {
        const workflow = (rest[0] as Workflow) || 'full';
        const state = await manager.ignite(changeName, workflow);
        console.log(`Initialized state for "${changeName}" (workflow: ${workflow})`);
        break;
      }
      case 'get': {
        const field = rest[0];
        if (!ALLOWED_FIELDS.has(field)) {
          throw new Error(`Unknown field "${field}". Allowed: ${[...ALLOWED_FIELDS].join(', ')}`);
        }
        const state = await manager.loadState(changeName) as any;
        console.log(state[field] ?? '');
        break;
      }
      case 'set': {
        const [field, value] = rest;
        if (!ALLOWED_FIELDS.has(field)) {
          throw new Error(`Unknown field "${field}". Allowed: ${[...ALLOWED_FIELDS].join(', ')}`);
        }
        const state = await manager.loadState(changeName) as any;
        state[field] = value === 'null' ? null : (value === 'true' ? true : (value === 'false' ? false : value));
        await manager.saveState(changeName, state);
        console.log(`Set ${field}=${value} for "${changeName}"`);
        break;
      }
      case 'transition': {
        const event = rest[0];
        await manager.transition(changeName, event);
        console.log(`Transitioned "${changeName}" via event "${event}"`);
        break;
      }
      case 'next': {
        const next = await manager.getNext(changeName);
        console.log(JSON.stringify(next));
        break;
      }
      case 'sync': {
        const state = await manager.syncWithOpenspec(changeName);
        console.log(`Synced with .openspec.yaml for "${changeName}" (ID: ${state.change_id || 'N/A'})`);
        break;
      }
      case 'deliver': {
        const state = await manager.loadState(changeName);
        if (state.phase !== 'Deliver' || state.refine_result !== 'pass') {
          throw new Error(`Cannot deliver "${changeName}": phase is ${state.phase}, refine_result is ${state.refine_result}`);
        }
        
        // Backfill history before archiving
        console.log(`Backfilling history for "${changeName}"...`);
        await manager.backfillHistory(changeName);

        // Finalize state
        await manager.transition(changeName, 'archived');
        
        console.log(`Successfully delivered and archived "${changeName}"`);
        break;
      }
      default:
        console.error(`Unknown subcommand: ${subcommand}`);
        process.exit(1);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
