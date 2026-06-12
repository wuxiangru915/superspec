import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORMS, getPlatformSkillsDir, getPlatformSkillsDirs } from './platforms.js';

describe('getPlatformSkillsDir', () => {
  const claude = PLATFORMS.find(p => p.id === 'claude')!;
  const junie = PLATFORMS.find(p => p.id === 'junie')!;
  const opencode = PLATFORMS.find(p => p.id === 'opencode')!;

  it('returns globalSkillsDir for global scope when available', () => {
    assert.equal(getPlatformSkillsDir(claude, 'global'), '.claude');
  });

  it('returns skillsDir for project scope', () => {
    assert.equal(getPlatformSkillsDir(claude, 'project'), '.claude');
  });

  it('returns skillsDir when no globalSkillsDir defined', () => {
    assert.equal(getPlatformSkillsDir(junie, 'global'), '.junie');
  });

  it('returns different dirs for opencode global vs project', () => {
    assert.equal(getPlatformSkillsDir(opencode, 'global'), '.config/opencode');
    assert.equal(getPlatformSkillsDir(opencode, 'project'), '.opencode');
  });
});

describe('getPlatformSkillsDirs', () => {
  it('returns single-element array', () => {
    const claude = PLATFORMS.find(p => p.id === 'claude')!;
    const dirs = getPlatformSkillsDirs(claude, 'project');
    assert.ok(Array.isArray(dirs));
    assert.equal(dirs.length, 1);
    assert.equal(dirs[0], '.claude');
  });
});

describe('PLATFORMS', () => {
  it('has no duplicate ids', () => {
    const ids = PLATFORMS.map(p => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('every platform has required fields', () => {
    for (const p of PLATFORMS) {
      assert.ok(p.id, `platform missing id`);
      assert.ok(p.name, `platform ${p.id} missing name`);
      assert.ok(p.skillsDir, `platform ${p.id} missing skillsDir`);
      assert.ok(p.openspecToolId, `platform ${p.id} missing openspecToolId`);
    }
  });

  it('platforms with supportsHooks have hookFormat', () => {
    for (const p of PLATFORMS) {
      if (p.supportsHooks) {
        assert.ok(p.hookFormat, `platform ${p.id} has supportsHooks but no hookFormat`);
      }
    }
  });

  it('platforms with rulesDir have rulesFormat', () => {
    for (const p of PLATFORMS) {
      if (p.rulesDir) {
        assert.ok(p.rulesFormat, `platform ${p.id} has rulesDir but no rulesFormat`);
      }
    }
  });

  it('contains expected platforms', () => {
    const ids = PLATFORMS.map(p => p.id);
    assert.ok(ids.includes('claude'));
    assert.ok(ids.includes('cursor'));
    assert.ok(ids.includes('windsurf'));
    assert.ok(ids.includes('gemini'));
    assert.ok(ids.includes('github-copilot'));
    assert.ok(ids.includes('cline'));
  });
});
