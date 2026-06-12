import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import {
  SuperspecState,
  Workflow,
  Phase,
  BuildMode,
  IsolationMode,
  RefineResult
} from './state.js';

export class StateManager {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private getChangeDir(changeName: string): string {
    // Basic validation to prevent path traversal
    const safeName = changeName.replace(/[^\w-]/g, '');
    return path.join(this.projectRoot, '.superspec', 'missions', safeName);
  }

  private getStatePath(changeName: string): string {
    return path.join(this.getChangeDir(changeName), 'state.yaml');
  }

  async loadState(changeName: string): Promise<SuperspecState> {
    const statePath = this.getStatePath(changeName);
    try {
      const content = await fs.readFile(statePath, 'utf8');
      return yaml.load(content) as SuperspecState;
    } catch (error) {
      throw new Error(`Failed to load state for "${changeName}": ${(error as Error).message}`);
    }
  }

  async saveState(changeName: string, state: SuperspecState): Promise<void> {
    const changeDir = this.getChangeDir(changeName);
    const statePath = this.getStatePath(changeName);

    await fs.mkdir(changeDir, { recursive: true });
    const content = yaml.dump(state, { quotingType: '"', forceQuotes: false });
    await fs.writeFile(statePath, content, 'utf8');
  }

  async ignite(changeName: string, workflow: Workflow): Promise<SuperspecState> {
    const changeDir = this.getChangeDir(changeName);
    const statePath = this.getStatePath(changeName);

    // Check if exists
    try {
      await fs.access(statePath);
      throw new Error(`State file already exists for "${changeName}"`);
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }

    let baseRef: string | null = null;
    try {
      baseRef = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      // Not a git repo or no commits
    }

    const state: SuperspecState = {
      workflow,
      phase: 'Vision',
      context_compression: 'off',
      build_mode: (workflow === 'full' ? null : 'direct') as BuildMode,
      build_pause: null,
      subagent_dispatch: null,
      tdd_mode: (workflow === 'full' ? null : 'direct') as any,
      isolation: (workflow === 'full' ? null : 'branch') as IsolationMode,
      refine_mode: (workflow === 'full' ? null : 'light') as any,
      auto_transition: true,
      base_ref: baseRef,
      blueprint_doc: null,
      plan: null,
      refine_result: 'pending',
      verification_report: null,
      branch_status: 'pending',
      created_at: new Date().toISOString().split('T')[0],
      verified_at: null,
      archived: false
    };

    await this.saveState(changeName, state);
    return state;
  }

  async syncWithOpenspec(changeName: string): Promise<SuperspecState> {
    const state = await this.loadState(changeName);
    const changeDir = this.getChangeDir(changeName);
    const openspecYamlPath = path.join(changeDir, '.openspec.yaml');

    try {
      await fs.access(openspecYamlPath);
      const content = await fs.readFile(openspecYamlPath, 'utf8');
      const openspecMetadata = yaml.load(content) as any;

      if (openspecMetadata && openspecMetadata.id) {
        state.change_id = openspecMetadata.id;
      }
      if (openspecMetadata && openspecMetadata.version) {
        state.openspec_version = openspecMetadata.version;
      }
      
      await this.saveState(changeName, state);
    } catch (e) {
      // If .openspec.yaml doesn't exist, just skip syncing
    }

    return state;
  }

  async backfillHistory(changeName: string): Promise<void> {
    const state = await this.loadState(changeName);
    const changeDir = this.getChangeDir(changeName);
    
    // 1. Get Summary from Blueprint or Intent
    let summary = "No summary available.";
    const blueprintPath = state.blueprint_doc ? path.join(this.projectRoot, state.blueprint_doc) : null;
    const intentPath = path.join(changeDir, 'intent.md');

    try {
      if (blueprintPath && await this.fileExists(blueprintPath)) {
        const content = await fs.readFile(blueprintPath, 'utf8');
        // Simple extraction: first paragraph after # or ##
        const match = content.match(/^(?:#|##).+?\n+([\s\S]+?)(?:\n\n|\n#|$)/m);
        if (match && match[1]) summary = match[1].trim().split('\n')[0];
      } else if (await this.fileExists(intentPath)) {
        const content = await fs.readFile(intentPath, 'utf8');
        const match = content.match(/^(?:#|##).+?\n+([\s\S]+?)(?:\n\n|\n#|$)/m);
        if (match && match[1]) summary = match[1].trim().split('\n')[0];
      }
    } catch (e) {
      // Fallback
    }

    // 2. Find relevant specs (from specs/ directory in change)
    const changeSpecsDir = path.join(changeDir, 'specs');
    if (await this.fileExists(changeSpecsDir)) {
      const capabilities = await fs.readdir(changeSpecsDir);
      for (const cap of capabilities) {
        const mainSpecPath = path.join(this.projectRoot, '.superspec', 'specs', cap, 'spec.md');
        if (await this.fileExists(mainSpecPath)) {
          await this.appendToSpecHistory(mainSpecPath, summary, changeName);
        }
      }
    }
  }

  private async appendToSpecHistory(specPath: string, summary: string, changeName: string): Promise<void> {
    let content = await fs.readFile(specPath, 'utf8');
    const date = new Date().toISOString().split('T')[0];
    const entry = `\n- **${date}** (${changeName}): ${summary}`;

    if (content.includes('## History')) {
      content = content.replace('## History', `## History${entry}`);
    } else {
      content += `\n\n## History${entry}\n`;
    }
    
    await fs.writeFile(specPath, content, 'utf8');
  }

  async transition(changeName: string, event: string): Promise<SuperspecState> {
    const state = await this.loadState(changeName);
    const currentPhase = state.phase;

    switch (event) {
      case 'Vision-complete':
        this.requirePhase(currentPhase, 'Vision');
        state.phase = state.workflow === 'full' ? 'Blueprint' : 'Forge';
        break;
      case 'Blueprint-complete':
        this.requirePhase(currentPhase, 'Blueprint');
        state.phase = 'Forge';
        break;
      case 'Forge-complete':
        this.requirePhase(currentPhase, 'Forge');
        // Simple validation of decisions
        if (!state.isolation || !state.build_mode) {
          throw new Error('Incomplete build decisions (isolation/mode)');
        }
        state.phase = 'Refine';
        state.refine_result = 'pending';
        state.verification_report = null;
        state.branch_status = 'pending';
        break;
      case 'Refine-pass':
        this.requirePhase(currentPhase, 'Refine');
        if (!state.verification_report || state.branch_status !== 'handled') {
          throw new Error('Verification evidence missing or branch not handled');
        }
        state.refine_result = 'pass';
        state.phase = 'Deliver';
        state.verified_at = new Date().toISOString().split('T')[0];
        break;
      case 'Refine-fail':
        this.requirePhase(currentPhase, 'Refine');
        state.refine_result = 'fail';
        state.phase = 'Forge';
        break;
      case 'Deliver-reopen':
        this.requirePhase(currentPhase, 'Deliver');
        if (state.archived) throw new Error('Cannot reopen archived change');
        state.refine_result = 'pending';
        state.phase = 'Refine';
        state.verified_at = null;
        break;
      case 'archived':
        this.requirePhase(currentPhase, 'Deliver');
        state.archived = true;
        break;
      default:
        throw new Error(`Unknown transition event: ${event}`);
    }

    await this.saveState(changeName, state);
    return state;
  }

  private requirePhase(actual: Phase, expected: Phase) {
    if (actual !== expected) {
      throw new Error(`Invalid transition: expected phase "${expected}", but current is "${actual}"`);
    }
  }

  async getNext(changeName: string): Promise<{ next: 'auto' | 'manual' | 'done', skill?: string, hint?: string }> {
    const state = await this.loadState(changeName);
    if (state.archived) return { next: 'done' };

    let skill = '';
    switch (state.phase) {
      case 'Vision': skill = 'superspec-Vision'; break;
      case 'Blueprint': skill = 'superspec-Blueprint'; break;
      case 'Forge':
        if (state.workflow === 'hotfix') skill = 'superspec-hotfix';
        else if (state.workflow === 'tweak') skill = 'superspec-tweak';
        else skill = 'superspec-Forge';
        break;
      case 'Refine': skill = 'superspec-Refine'; break;
      case 'Deliver': skill = 'superspec-Deliver'; break;
    }

    if (!state.auto_transition) {
      return { 
        next: 'manual', 
        skill, 
        hint: `Phase is "${state.phase}"; run /${skill} manually to continue` 
      };
    }

    return { next: 'auto', skill };
  }
}
