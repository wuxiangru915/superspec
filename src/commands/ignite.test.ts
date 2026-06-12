import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyBulkOverwriteChoice } from './ignite.js';

describe('applyBulkOverwriteChoice', () => {
  const basePlan = {
    osAction: 'install' as const,
    spAction: 'install' as const,
    cmAction: 'install' as const,
  };

  it('overwrite-all sets all actions to overwrite when all exist', () => {
    const result = applyBulkOverwriteChoice(
      basePlan,
      'overwrite-all',
      { os: true, sp: true, cm: true },
    );
    assert.equal(result.osAction, 'overwrite');
    assert.equal(result.spAction, 'overwrite');
    assert.equal(result.cmAction, 'overwrite');
  });

  it('overwrite-all only overwrites existing components', () => {
    const result = applyBulkOverwriteChoice(
      basePlan,
      'overwrite-all',
      { os: true, sp: false, cm: true },
    );
    assert.equal(result.osAction, 'overwrite');
    assert.equal(result.spAction, 'install');
    assert.equal(result.cmAction, 'overwrite');
  });

  it('skip-all sets all actions to skip when all exist', () => {
    const result = applyBulkOverwriteChoice(
      basePlan,
      'skip-all',
      { os: true, sp: true, cm: true },
    );
    assert.equal(result.osAction, 'skip');
    assert.equal(result.spAction, 'skip');
    assert.equal(result.cmAction, 'skip');
  });

  it('skip-all only skips existing components', () => {
    const result = applyBulkOverwriteChoice(
      basePlan,
      'skip-all',
      { os: false, sp: true, cm: false },
    );
    assert.equal(result.osAction, 'install');
    assert.equal(result.spAction, 'skip');
    assert.equal(result.cmAction, 'install');
  });

  it('does not modify actions that are already overwrite or skip', () => {
    const plan = {
      osAction: 'overwrite' as const,
      spAction: 'skip' as const,
      cmAction: 'install' as const,
    };
    const result = applyBulkOverwriteChoice(
      plan,
      'overwrite-all',
      { os: true, sp: true, cm: true },
    );
    assert.equal(result.osAction, 'overwrite');
    assert.equal(result.spAction, 'skip');
    assert.equal(result.cmAction, 'overwrite');
  });

  it('without hasExisting, applies to all install actions (unconditional)', () => {
    const result = applyBulkOverwriteChoice(
      basePlan,
      'overwrite-all',
    );
    // Without hasExisting: shouldApply = actionState === 'install' && (undefined === undefined)
    // = true, so all install actions become overwrite
    assert.equal(result.osAction, 'overwrite');
    assert.equal(result.spAction, 'overwrite');
    assert.equal(result.cmAction, 'overwrite');
  });
});
