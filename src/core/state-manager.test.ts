import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { StateManager } from './state-manager.js';
import type { SuperspecState } from './state.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'superspec-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeState(overrides: Partial<SuperspecState> = {}): SuperspecState {
  return {
    workflow: 'full',
    phase: 'Vision',
    context_compression: 'off',
    build_mode: null,
    build_pause: null,
    subagent_dispatch: null,
    tdd_mode: null,
    isolation: null,
    refine_mode: null,
    auto_transition: true,
    base_ref: null,
    blueprint_doc: null,
    plan: null,
    refine_result: 'pending',
    verification_report: null,
    branch_status: 'pending',
    created_at: '2026-01-01',
    verified_at: null,
    archived: false,
    ...overrides,
  };
}

describe('StateManager', () => {
  describe('ignite', () => {
    it('creates initial state for full workflow', async () => {
      const mgr = new StateManager(tmpDir);
      const state = await mgr.ignite('test-mission', 'full');

      assert.equal(state.workflow, 'full');
      assert.equal(state.phase, 'Vision');
      assert.equal(state.build_mode, null);
      assert.equal(state.tdd_mode, null);
      assert.equal(state.isolation, null);
      assert.equal(state.refine_mode, null);
      assert.equal(state.refine_result, 'pending');
      assert.equal(state.archived, false);
      assert.match(state.created_at, /^\d{4}-\d{2}-\d{2}$/);
    });

    it('creates initial state for hotfix workflow', async () => {
      const mgr = new StateManager(tmpDir);
      const state = await mgr.ignite('hotfix-1', 'hotfix');

      assert.equal(state.workflow, 'hotfix');
      assert.equal(state.build_mode, 'direct');
      assert.equal(state.tdd_mode, 'direct');
      assert.equal(state.isolation, 'branch');
      assert.equal(state.refine_mode, 'light');
    });

    it('creates initial state for tweak workflow', async () => {
      const mgr = new StateManager(tmpDir);
      const state = await mgr.ignite('tweak-1', 'tweak');

      assert.equal(state.build_mode, 'direct');
      assert.equal(state.isolation, 'branch');
    });

    it('prevents overwriting existing state', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('dup', 'full');

      await assert.rejects(
        () => mgr.ignite('dup', 'full'),
        /already exists/,
      );
    });

    it('sanitizes change name (path traversal)', async () => {
      const mgr = new StateManager(tmpDir);
      const state = await mgr.ignite('../evil', 'full');

      // State should be saved under a sanitized path
      const missionsDir = path.join(tmpDir, '.superspec', 'missions');
      const entries = await fs.readdir(missionsDir);
      assert.ok(entries.length > 0);
      // The name should not contain ../
      assert.ok(!entries.some(e => e.includes('..')));
    });
  });

  describe('saveState / loadState', () => {
    it('round-trips state through YAML', async () => {
      const mgr = new StateManager(tmpDir);
      const original = makeState({ phase: 'Forge', build_mode: 'direct' });
      await mgr.saveState('round-trip', original);
      const loaded = await mgr.loadState('round-trip');

      assert.equal(loaded.phase, 'Forge');
      assert.equal(loaded.build_mode, 'direct');
      assert.equal(loaded.workflow, 'full');
      assert.equal(loaded.archived, false);
    });

    it('throws on missing state', async () => {
      const mgr = new StateManager(tmpDir);
      await assert.rejects(
        () => mgr.loadState('nonexistent'),
        /Failed to load state/,
      );
    });
  });

  describe('transition', () => {
    it('Vision-complete → Blueprint (full workflow)', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t1', 'full');
      const state = await mgr.transition('t1', 'Vision-complete');
      assert.equal(state.phase, 'Blueprint');
    });

    it('Vision-complete → Forge (hotfix workflow)', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t2', 'hotfix');
      const state = await mgr.transition('t2', 'Vision-complete');
      assert.equal(state.phase, 'Forge');
    });

    it('Blueprint-complete → Forge', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t3', 'full');
      await mgr.transition('t3', 'Vision-complete');
      const state = await mgr.transition('t3', 'Blueprint-complete');
      assert.equal(state.phase, 'Forge');
    });

    it('Forge-complete → Refine (with valid decisions)', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t4', 'full');
      await mgr.transition('t4', 'Vision-complete');
      await mgr.transition('t4', 'Blueprint-complete');

      // Set required decisions
      const state = await mgr.loadState('t4');
      state.isolation = 'branch';
      state.build_mode = 'direct';
      await mgr.saveState('t4', state);

      const result = await mgr.transition('t4', 'Forge-complete');
      assert.equal(result.phase, 'Refine');
      assert.equal(result.refine_result, 'pending');
    });

    it('Forge-complete fails without isolation', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t5', 'full');
      await mgr.transition('t5', 'Vision-complete');
      await mgr.transition('t5', 'Blueprint-complete');

      // Don't set isolation
      const state = await mgr.loadState('t5');
      state.build_mode = 'direct';
      await mgr.saveState('t5', state);

      await assert.rejects(
        () => mgr.transition('t5', 'Forge-complete'),
        /Incomplete build decisions/,
      );
    });

    it('Forge-complete fails without build_mode', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t6', 'full');
      await mgr.transition('t6', 'Vision-complete');
      await mgr.transition('t6', 'Blueprint-complete');

      const state = await mgr.loadState('t6');
      state.isolation = 'branch';
      await mgr.saveState('t6', state);

      await assert.rejects(
        () => mgr.transition('t6', 'Forge-complete'),
        /Incomplete build decisions/,
      );
    });

    it('Refine-pass → Deliver (with verification evidence)', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t7', 'full');
      await mgr.transition('t7', 'Vision-complete');
      await mgr.transition('t7', 'Blueprint-complete');

      const s1 = await mgr.loadState('t7');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('t7', s1);

      await mgr.transition('t7', 'Forge-complete');

      const s2 = await mgr.loadState('t7');
      s2.verification_report = 'All tests pass';
      s2.branch_status = 'handled';
      await mgr.saveState('t7', s2);

      const result = await mgr.transition('t7', 'Refine-pass');
      assert.equal(result.phase, 'Deliver');
      assert.equal(result.refine_result, 'pass');
      assert.ok(result.verified_at);
    });

    it('Refine-pass fails without verification_report', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t8', 'full');
      await mgr.transition('t8', 'Vision-complete');
      await mgr.transition('t8', 'Blueprint-complete');

      const s1 = await mgr.loadState('t8');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('t8', s1);
      await mgr.transition('t8', 'Forge-complete');

      // Don't set verification_report
      const s2 = await mgr.loadState('t8');
      s2.branch_status = 'handled';
      await mgr.saveState('t8', s2);

      await assert.rejects(
        () => mgr.transition('t8', 'Refine-pass'),
        /Verification evidence missing/,
      );
    });

    it('Refine-pass fails without branch_status=handled', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t9', 'full');
      await mgr.transition('t9', 'Vision-complete');
      await mgr.transition('t9', 'Blueprint-complete');

      const s1 = await mgr.loadState('t9');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('t9', s1);
      await mgr.transition('t9', 'Forge-complete');

      const s2 = await mgr.loadState('t9');
      s2.verification_report = 'All tests pass';
      // Don't set branch_status to 'handled'
      await mgr.saveState('t9', s2);

      await assert.rejects(
        () => mgr.transition('t9', 'Refine-pass'),
        /Verification evidence missing/,
      );
    });

    it('Refine-fail → Forge', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t10', 'full');
      await mgr.transition('t10', 'Vision-complete');
      await mgr.transition('t10', 'Blueprint-complete');

      const s1 = await mgr.loadState('t10');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('t10', s1);
      await mgr.transition('t10', 'Forge-complete');

      const result = await mgr.transition('t10', 'Refine-fail');
      assert.equal(result.phase, 'Forge');
      assert.equal(result.refine_result, 'fail');
    });

    it('Deliver-reopen → Refine', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t11', 'full');
      await mgr.transition('t11', 'Vision-complete');
      await mgr.transition('t11', 'Blueprint-complete');

      const s1 = await mgr.loadState('t11');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('t11', s1);
      await mgr.transition('t11', 'Forge-complete');

      const s2 = await mgr.loadState('t11');
      s2.verification_report = 'All tests pass';
      s2.branch_status = 'handled';
      await mgr.saveState('t11', s2);
      await mgr.transition('t11', 'Refine-pass');

      const result = await mgr.transition('t11', 'Deliver-reopen');
      assert.equal(result.phase, 'Refine');
      assert.equal(result.refine_result, 'pending');
      assert.equal(result.verified_at, null);
    });

    it('Deliver-reopen fails on archived change', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t12', 'full');
      await mgr.transition('t12', 'Vision-complete');
      await mgr.transition('t12', 'Blueprint-complete');

      const s1 = await mgr.loadState('t12');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('t12', s1);
      await mgr.transition('t12', 'Forge-complete');

      const s2 = await mgr.loadState('t12');
      s2.verification_report = 'All tests pass';
      s2.branch_status = 'handled';
      await mgr.saveState('t12', s2);
      await mgr.transition('t12', 'Refine-pass');
      await mgr.transition('t12', 'archived');

      await assert.rejects(
        () => mgr.transition('t12', 'Deliver-reopen'),
        /Cannot reopen archived/,
      );
    });

    it('archived sets archived=true', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t13', 'full');
      await mgr.transition('t13', 'Vision-complete');
      await mgr.transition('t13', 'Blueprint-complete');

      const s1 = await mgr.loadState('t13');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('t13', s1);
      await mgr.transition('t13', 'Forge-complete');

      const s2 = await mgr.loadState('t13');
      s2.verification_report = 'All tests pass';
      s2.branch_status = 'handled';
      await mgr.saveState('t13', s2);
      await mgr.transition('t13', 'Refine-pass');

      const result = await mgr.transition('t13', 'archived');
      assert.equal(result.archived, true);
    });

    it('rejects invalid phase transitions', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t14', 'full');

      await assert.rejects(
        () => mgr.transition('t14', 'Blueprint-complete'),
        /expected phase "Blueprint".*current is "Vision"/,
      );
    });

    it('rejects unknown events', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('t15', 'full');

      await assert.rejects(
        () => mgr.transition('t15', 'bogus-event'),
        /Unknown transition event/,
      );
    });
  });

  describe('getNext', () => {
    it('returns correct skill for each phase', async () => {
      const mgr = new StateManager(tmpDir);

      await mgr.ignite('n1', 'full');
      let next = await mgr.getNext('n1');
      assert.equal(next.skill, 'superspec-Vision');
      assert.equal(next.next, 'auto');

      await mgr.transition('n1', 'Vision-complete');
      next = await mgr.getNext('n1');
      assert.equal(next.skill, 'superspec-Blueprint');

      await mgr.transition('n1', 'Blueprint-complete');
      next = await mgr.getNext('n1');
      assert.equal(next.skill, 'superspec-Forge');
    });

    it('returns hotfix skill for hotfix workflow in Forge', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('n2', 'hotfix');
      await mgr.transition('n2', 'Vision-complete');

      const next = await mgr.getNext('n2');
      assert.equal(next.skill, 'superspec-hotfix');
    });

    it('returns tweak skill for tweak workflow in Forge', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('n3', 'tweak');
      await mgr.transition('n3', 'Vision-complete');

      const next = await mgr.getNext('n3');
      assert.equal(next.skill, 'superspec-tweak');
    });

    it('returns done for archived', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('n4', 'full');
      await mgr.transition('n4', 'Vision-complete');
      await mgr.transition('n4', 'Blueprint-complete');

      const s1 = await mgr.loadState('n4');
      s1.isolation = 'branch';
      s1.build_mode = 'direct';
      await mgr.saveState('n4', s1);
      await mgr.transition('n4', 'Forge-complete');

      const s2 = await mgr.loadState('n4');
      s2.verification_report = 'All tests pass';
      s2.branch_status = 'handled';
      await mgr.saveState('n4', s2);
      await mgr.transition('n4', 'Refine-pass');
      await mgr.transition('n4', 'archived');

      const next = await mgr.getNext('n4');
      assert.equal(next.next, 'done');
    });

    it('returns manual when auto_transition is false', async () => {
      const mgr = new StateManager(tmpDir);
      await mgr.ignite('n5', 'full');

      const state = await mgr.loadState('n5');
      state.auto_transition = false;
      await mgr.saveState('n5', state);

      const next = await mgr.getNext('n5');
      assert.equal(next.next, 'manual');
      assert.ok(next.hint);
    });
  });
});
