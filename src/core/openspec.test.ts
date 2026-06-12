import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNpmExecutable, isCommandAvailable } from './openspec.js';

describe('getNpmExecutable', () => {
  it('returns npm.cmd on win32', () => {
    assert.equal(getNpmExecutable('win32'), 'npm.cmd');
  });

  it('returns npm on linux', () => {
    assert.equal(getNpmExecutable('linux'), 'npm');
  });

  it('returns npm on darwin', () => {
    assert.equal(getNpmExecutable('darwin'), 'npm');
  });
});

describe('isCommandAvailable', () => {
  it('returns true for existing command', () => {
    assert.equal(isCommandAvailable('node'), true);
  });

  it('returns false for nonexistent command', () => {
    assert.equal(isCommandAvailable('nonexistent-command-xyz-12345'), false);
  });
});
