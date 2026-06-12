import path from 'path';
import { fileExists, readDir } from '../utils/file-system.js';
import { promises as fs } from 'fs';
import { StateManager } from '../core/state-manager.js';

interface ChangeStatus {
  name: string;
  workflow: string;
  phase: string;
  buildMode: string;
  isolation: string;
  refineMode: string;
  refineResult: string;
  blueprintDoc: string | null;
  plan: string | null;
  tasksCompleted: number;
  tasksTotal: number;
  nextCommand: string | null;
}

function getNextCommand(phase: string): string | null {
  switch (phase) {
    case 'Vision':
      return '/superspec-Vision';
    case 'Blueprint':
      return '/superspec-Blueprint';
    case 'Forge':
      return '/superspec-Forge';
    case 'Refine':
      return '/superspec-Refine';
    case 'Deliver':
      return '/superspec-Deliver';
    default:
      return null;
  }
}

async function countTasks(tasksPath: string): Promise<{ done: number; total: number }> {
  if (!(await fileExists(tasksPath))) return { done: 0, total: 0 };
  const content = await fs.readFile(tasksPath, 'utf-8');
  const lines = content.split('\n');
  const total = lines.filter((l) => /^\s*- \[[ x]\]/.test(l)).length;
  const done = lines.filter((l) => /^\s*- \[x\]/i.test(l)).length;
  return { done, total };
}

async function getActiveChanges(projectPath: string): Promise<ChangeStatus[]> {
  const changesDir = path.join(projectPath, '.superspec', 'missions');
  if (!(await fileExists(changesDir))) return [];

  const manager = new StateManager(projectPath);
  const entries = await readDir(changesDir);
  const changes: ChangeStatus[] = [];

  for (const entry of entries) {
    const changeDir = path.join(changesDir, entry);
    const stat = await fs.stat(changeDir);
    if (!stat.isDirectory()) continue;

    try {
      const state = await manager.loadState(entry);
      if (state.archived) continue;

      const { done, total } = await countTasks(path.join(changeDir, 'roadmap.md'));

      changes.push({
        name: entry,
        workflow: state.workflow ?? 'full',
        phase: state.phase ?? 'unknown',
        buildMode: state.build_mode ?? 'null',
        isolation: state.isolation ?? 'null',
        refineMode: state.refine_mode ?? 'null',
        refineResult: state.refine_result ?? 'pending',
        blueprintDoc: state.blueprint_doc === 'null' ? null : (state.blueprint_doc ?? null),
        plan: state.plan === 'null' ? null : (state.plan ?? null),
        tasksCompleted: done,
        tasksTotal: total,
        nextCommand: getNextCommand(state.phase ?? 'unknown'),
      });
    } catch (e) {
      // Skip entries without valid state.yaml
      continue;
    }
  }

  return changes;
}

function displayStatus(changes: ChangeStatus[]): void {
  if (changes.length === 0) {
    console.log('No active changes.\n');
    return;
  }

  console.log('Active Changes:\n');

  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const taskStr = c.tasksTotal > 0 ? ` [${c.tasksCompleted}/${c.tasksTotal} tasks]` : '';
    console.log(`  ${i + 1}. ${c.name} [phase: ${c.phase}${taskStr}]`);
    console.log(`     workflow: ${c.workflow} | build_mode: ${c.buildMode}`);
    if (c.blueprintDoc) console.log(`     blueprint: ${c.blueprintDoc}`);
    if (c.plan) console.log(`     plan:   ${c.plan}`);
    if (c.phase === 'Refine') console.log(`     refine_result: ${c.refineResult}`);
    if (c.nextCommand) console.log(`     next: ${c.nextCommand}`);
    console.log();
  }
}

interface StatusOptions {
  json?: boolean;
}

export async function gaugeCommand(
  targetPath: string,
  options: StatusOptions = {},
): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const changes = await getActiveChanges(projectPath);

  if (options.json) {
    console.log(JSON.stringify({ changes }, null, 2));
    return;
  }

  displayStatus(changes);
}
