export type Workflow = 'full' | 'hotfix' | 'tweak';

export type Phase = 'Vision' | 'Blueprint' | 'Forge' | 'Refine' | 'Deliver';

export type BuildMode = 'subagent-driven-development' | 'executing-plans' | 'direct' | null;

export type RefineResult = 'pending' | 'pass' | 'fail' | null;

export type IsolationMode = 'branch' | 'worktree' | null;

export interface SuperspecState {
  workflow: Workflow;
  phase: Phase;
  context_compression: 'off' | 'beta';
  build_mode: BuildMode;
  build_pause: 'plan-ready' | null;
  subagent_dispatch: 'confirmed' | null;
  tdd_mode: 'tdd' | 'direct' | null;
  isolation: IsolationMode;
  refine_mode: 'light' | 'full' | null;
  auto_transition: boolean;
  base_ref: string | null;
  blueprint_doc: string | null;
  plan: string | null;
  refine_result: RefineResult;
  verification_report: string | null;
  branch_status: 'pending' | 'handled' | null;
  created_at: string;
  verified_at: string | null;
  archived: boolean;
  // Integration fields
  change_id?: string;
  openspec_version?: string;
  // Optional fields that might be added dynamically
  direct_override?: boolean;
  build_command?: string;
  verify_command?: string;
  handoff_context?: string;
  handoff_hash?: string;
}

export const PHASE_SEQUENCE: Phase[] = ['Vision', 'Blueprint', 'Forge', 'Refine', 'Deliver'];
