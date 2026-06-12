import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterSupportedPlatforms } from './codegraph.js';

describe('filterSupportedPlatforms', () => {
  it('partitions supported and unsupported platforms', () => {
    const result = filterSupportedPlatforms(['claude', 'cursor', 'cline', 'windsurf']);
    assert.deepEqual(result.supported, ['claude', 'cursor']);
    assert.deepEqual(result.unsupported, ['cline', 'windsurf']);
  });

  it('returns all supported when all are supported', () => {
    const result = filterSupportedPlatforms(['claude', 'cursor', 'gemini']);
    assert.deepEqual(result.supported, ['claude', 'cursor', 'gemini']);
    assert.deepEqual(result.unsupported, []);
  });

  it('returns all unsupported when none are supported', () => {
    const result = filterSupportedPlatforms(['cline', 'windsurf', 'roocode']);
    assert.deepEqual(result.supported, []);
    assert.deepEqual(result.unsupported, ['cline', 'windsurf', 'roocode']);
  });

  it('handles empty input', () => {
    const result = filterSupportedPlatforms([]);
    assert.deepEqual(result.supported, []);
    assert.deepEqual(result.unsupported, []);
  });

  it('handles single platform', () => {
    const result = filterSupportedPlatforms(['claude']);
    assert.deepEqual(result.supported, ['claude']);
    assert.deepEqual(result.unsupported, []);
  });
});
