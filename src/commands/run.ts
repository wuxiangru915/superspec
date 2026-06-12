import { StateManager } from '../core/state-manager.js';
import { fileExists, readDir } from '../utils/file-system.js';
import path from 'path';

export async function runCommand(targetPath: string, options: Record<string, unknown> = {}): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const manager = new StateManager(projectPath);
  
  // 1. Discovery active changes
  const changesDir = path.join(projectPath, '.superspec', 'missions');
  if (!(await fileExists(changesDir))) {
    console.log("No active changes found. Please start with a new vision.");
    console.log("SUGGESTED_ACTION: /superspec-Vision");
    return;
  }

  const entries = await readDir(changesDir);
  const activeChanges: string[] = [];
  for (const entry of entries) {
    try {
      const state = await manager.loadState(entry);
      if (!state.archived) {
        activeChanges.push(entry);
      }
    } catch {
      // Skip invalid state
    }
  }

  if (activeChanges.length === 0) {
    console.log("No active changes found.");
    console.log("SUGGESTED_ACTION: /superspec-Vision");
    return;
  }

  // 2. If multiple, we might need a way to pick one, but for 'run' we focus on the most relevant
  // For now, let's take the first one or ask (simplified: take first or use provided name)
  const changeName = activeChanges[0];
  
  if (activeChanges.length > 1) {
    console.log(`Multiple active changes found: ${activeChanges.join(', ')}`);
    console.log(`Selecting the first one: "${changeName}"`);
  }

  // 3. Get next action
  const next = await manager.getNext(changeName);
  
  console.log(`Current Change: "${changeName}"`);
  console.log(`Phase: ${next.skill?.split('-')[1] || 'Unknown'}`);
  
  if (next.next === 'done') {
    console.log("Workflow complete.");
  } else if (next.next === 'manual') {
    console.log(`ATTENTION: ${next.hint}`);
    console.log(`SUGGESTED_ACTION: /${next.skill}`);
  } else {
    console.log(`Ready for the next phase.`);
    console.log(`SUGGESTED_ACTION: /${next.skill}`);
  }
}
