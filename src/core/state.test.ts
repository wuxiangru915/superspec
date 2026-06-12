import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE_SEQUENCE } from './state.js';

describe('PHASE_SEQUENCE', () => {
  it('has exactly 5 phases in correct order', () => {
    assert.deepEqual(PHASE_SEQUENCE, [
      'Vision',
      'Blueprint',
      'Forge',
      'Refine',
      'Deliver',
    ]);
  });

  it('has no duplicates', () => {
    assert.equal(new Set(PHASE_SEQUENCE).size, PHASE_SEQUENCE.length);
  });
});
