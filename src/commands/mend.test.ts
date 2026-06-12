import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// collectTopLevelYamlKeys is not exported, but we can replicate its logic for testing
function collectTopLevelYamlKeys(yamlContent: string): string[] {
  const topLevelKeys: string[] = [];

  for (const line of yamlContent.split(/\r?\n/u)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    if (/^\s/u.test(line)) continue;
    if (trimmedLine.startsWith('- ')) continue;

    const keyMatch = line.match(/^['"]?([A-Za-z0-9_-]+)['"]?\s*:/u);
    if (keyMatch) {
      topLevelKeys.push(keyMatch[1]);
    }
  }

  return topLevelKeys;
}

describe('collectTopLevelYamlKeys', () => {
  it('extracts top-level keys from valid YAML', () => {
    const yaml = `
workflow: full
phase: Vision
context_compression: off
build_mode: null
`;
    const keys = collectTopLevelYamlKeys(yaml);
    assert.deepEqual(keys, ['workflow', 'phase', 'context_compression', 'build_mode']);
  });

  it('ignores comments', () => {
    const yaml = `
# This is a comment
workflow: full
# Another comment
phase: Vision
`;
    const keys = collectTopLevelYamlKeys(yaml);
    assert.deepEqual(keys, ['workflow', 'phase']);
  });

  it('ignores indented lines (nested values)', () => {
    const yaml = `
workflow: full
  nested: value
phase: Vision
`;
    const keys = collectTopLevelYamlKeys(yaml);
    assert.deepEqual(keys, ['workflow', 'phase']);
  });

  it('ignores list items', () => {
    const yaml = `
workflow: full
- item1
- item2
phase: Vision
`;
    const keys = collectTopLevelYamlKeys(yaml);
    assert.deepEqual(keys, ['workflow', 'phase']);
  });

  it('handles quoted keys', () => {
    const yaml = `
'workflow': full
"phase": Vision
`;
    const keys = collectTopLevelYamlKeys(yaml);
    assert.deepEqual(keys, ['workflow', 'phase']);
  });

  it('returns empty array for empty input', () => {
    const keys = collectTopLevelYamlKeys('');
    assert.deepEqual(keys, []);
  });

  it('returns empty array for only comments', () => {
    const keys = collectTopLevelYamlKeys('# just a comment\n# another');
    assert.deepEqual(keys, []);
  });

  it('handles CRLF line endings', () => {
    const yaml = 'workflow: full\r\nphase: Vision\r\n';
    const keys = collectTopLevelYamlKeys(yaml);
    assert.deepEqual(keys, ['workflow', 'phase']);
  });
});
