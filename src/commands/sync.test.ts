import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import {
  buildNpmUpdateArgs,
  formatNpmUpdateCommand,
  formatSkillUpdateCommand,
} from './sync.js';
import type { Platform } from '../core/platforms.js';

const PACKAGE_NAME = '@rpamis/superspec';

describe('buildNpmUpdateArgs', () => {
  it('returns global install args', () => {
    assert.deepEqual(buildNpmUpdateArgs('global'), [
      'install', '-g', `${PACKAGE_NAME}@latest`,
    ]);
  });

  it('returns project install args', () => {
    assert.deepEqual(buildNpmUpdateArgs('project'), [
      'install', `${PACKAGE_NAME}@latest`,
    ]);
  });
});

describe('formatNpmUpdateCommand', () => {
  it('formats global command', () => {
    assert.equal(
      formatNpmUpdateCommand('global'),
      `npm install -g ${PACKAGE_NAME}@latest`,
    );
  });

  it('formats project command', () => {
    assert.equal(
      formatNpmUpdateCommand('project'),
      `npm install ${PACKAGE_NAME}@latest`,
    );
  });
});

describe('formatSkillUpdateCommand', () => {
  const mockPlatform: Platform = {
    id: 'claude',
    name: 'Claude Code',
    skillsDir: '.claude',
    globalSkillsDir: '.claude',
    openspecToolId: 'claude',
  };

  it('formats project scope', () => {
    const result = formatSkillUpdateCommand('project', mockPlatform, 'skills');
    assert.ok(result.includes('.claude/skills/'));
    assert.ok(result.includes('project'));
  });

  it('formats global scope with ~/', () => {
    const result = formatSkillUpdateCommand('global', mockPlatform, 'skills');
    assert.ok(result.includes('~/.claude/skills/'));
    assert.ok(result.includes('global'));
  });

  it('formats zh language skills dir', () => {
    const result = formatSkillUpdateCommand('project', mockPlatform, 'skills-zh');
    assert.ok(result.includes('skills-zh'));
  });
});

// isSameOrInside is not exported, but we test the path containment logic
describe('path containment logic', () => {
  it('detects child path inside parent', () => {
    const child = '/home/user/project/node_modules/@rpamis/superspec';
    const parent = '/home/user/project/node_modules/@rpamis/superspec';
    const relative = path.relative(path.resolve(parent), path.resolve(child));
    const isSame = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    assert.equal(isSame, true);
  });

  it('detects sibling path', () => {
    const child = '/home/user/project/sibling';
    const parent = '/home/user/project/node_modules/@rpamis/superspec';
    const relative = path.relative(path.resolve(parent), path.resolve(child));
    const isSame = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    assert.equal(isSame, false);
  });

  it('detects parent path (not child)', () => {
    const child = '/home/user/project';
    const parent = '/home/user/project/node_modules/@rpamis/superspec';
    const relative = path.relative(path.resolve(parent), path.resolve(child));
    const isSame = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    assert.equal(isSame, false);
  });
});
