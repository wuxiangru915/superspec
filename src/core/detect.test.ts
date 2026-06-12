import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import { getBaseDir } from './detect.js';

describe('getBaseDir', () => {
  it('returns homedir for global scope', () => {
    assert.equal(getBaseDir('global', '/some/project'), os.homedir());
  });

  it('returns projectPath for project scope', () => {
    assert.equal(getBaseDir('project', '/some/project'), '/some/project');
  });
});

// matchesSuperpowersSkill is not exported, but we test the logic
describe('matchesSuperpowersSkill logic', () => {
  function matchesSuperpowersSkill(entry: string, skillName: string): boolean {
    return entry === skillName || entry === `superpowers-${skillName}.md`;
  }

  it('matches exact skill name', () => {
    assert.equal(matchesSuperpowersSkill('brainstorming', 'brainstorming'), true);
  });

  it('matches superpowers- prefixed .md file', () => {
    assert.equal(matchesSuperpowersSkill('superpowers-brainstorming.md', 'brainstorming'), true);
  });

  it('does not match partial name', () => {
    assert.equal(matchesSuperpowersSkill('brain', 'brainstorming'), false);
  });

  it('does not match wrong prefix', () => {
    assert.equal(matchesSuperpowersSkill('openspec-brainstorming.md', 'brainstorming'), false);
  });

  it('does not match wrong extension', () => {
    assert.equal(matchesSuperpowersSkill('superpowers-brainstorming.txt', 'brainstorming'), false);
  });
});
