import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';

// Replicate pure functions from skills.ts for unit testing
// These are not exported, so we test the logic directly

function stripFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return normalized.trimStart();
  }

  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return normalized.trimStart();

  return normalized.slice(end + '\n---\n'.length).trimStart();
}

function computeRuleDestPath(
  rulesDestDir: string,
  ruleFileName: string,
  rulesFormat: string,
): string {
  if (rulesFormat === 'mdc') {
    return path.join(rulesDestDir, ruleFileName.replace(/\.md$/, '.mdc'));
  }
  if (rulesFormat === 'copilot') {
    return path.join(rulesDestDir, ruleFileName.replace(/\.md$/, '.instructions.md'));
  }
  return path.join(rulesDestDir, ruleFileName);
}

function formatRuleContent(content: string, ruleFileName: string, rulesFormat: string): string {
  if (rulesFormat === 'mdc') {
    return `---
description: ${ruleFileName.replace(/\.md$/, '').replace(/-/g, ' ')}
globs:
alwaysApply: true
---

${content}`;
  }
  if (rulesFormat === 'copilot') {
    return `---
applyTo: "**"
---

${content}`;
  }
  return content;
}

function buildHookCommand(skillsDir: string, scriptRelPath: string): string {
  return `bash ${skillsDir}/skills/${scriptRelPath}`;
}

describe('stripFrontmatter', () => {
  it('strips valid frontmatter', () => {
    const input = `---
title: Test
author: someone
---

# Content here`;
    const result = stripFrontmatter(input);
    assert.equal(result, '# Content here');
  });

  it('returns content unchanged when no frontmatter', () => {
    const input = '# Just content\nNo frontmatter here.';
    const result = stripFrontmatter(input);
    assert.equal(result, '# Just content\nNo frontmatter here.');
  });

  it('handles CRLF line endings', () => {
    const input = `---\r\ntitle: Test\r\n---\r\n\r\n# Content`;
    const result = stripFrontmatter(input);
    assert.equal(result, '# Content');
  });

  it('returns full content when frontmatter not closed', () => {
    const input = `---
title: Test
# No closing ---
`;
    const result = stripFrontmatter(input);
    // When no closing ---, returns the full normalized content (trimStart only)
    assert.equal(result, '---\ntitle: Test\n# No closing ---\n');
  });

  it('trims leading whitespace from content', () => {
    const input = `---
title: Test
---

  # Content with leading spaces`;
    const result = stripFrontmatter(input);
    assert.equal(result, '# Content with leading spaces');
  });

  it('handles empty content after frontmatter', () => {
    const input = `---
title: Test
---

`;
    const result = stripFrontmatter(input);
    assert.equal(result, '');
  });
});

describe('computeRuleDestPath', () => {
  it('converts .md to .mdc for cursor format', () => {
    const result = computeRuleDestPath('/rules', 'superspec-phase-guard.md', 'mdc');
    assert.equal(result, path.join('/rules', 'superspec-phase-guard.mdc'));
  });

  it('converts .md to .instructions.md for copilot format', () => {
    const result = computeRuleDestPath('/rules', 'superspec-phase-guard.md', 'copilot');
    assert.equal(result, path.join('/rules', 'superspec-phase-guard.instructions.md'));
  });

  it('keeps .md for plain md format', () => {
    const result = computeRuleDestPath('/rules', 'superspec-phase-guard.md', 'md');
    assert.equal(result, path.join('/rules', 'superspec-phase-guard.md'));
  });
});

describe('formatRuleContent', () => {
  it('wraps content in MDC frontmatter', () => {
    const result = formatRuleContent('# Guard', 'superspec-phase-guard.md', 'mdc');
    assert.ok(result.startsWith('---'));
    assert.ok(result.includes('description: superspec phase guard'));
    assert.ok(result.includes('alwaysApply: true'));
    assert.ok(result.includes('# Guard'));
  });

  it('wraps content in copilot frontmatter', () => {
    const result = formatRuleContent('# Guard', 'superspec-phase-guard.md', 'copilot');
    assert.ok(result.startsWith('---'));
    assert.ok(result.includes('applyTo: "**"'));
    assert.ok(result.includes('# Guard'));
  });

  it('returns plain content for md format', () => {
    const result = formatRuleContent('# Guard', 'superspec-phase-guard.md', 'md');
    assert.equal(result, '# Guard');
  });
});

describe('buildHookCommand', () => {
  it('builds correct bash command', () => {
    const result = buildHookCommand('.claude', 'scripts/superspec-guard.sh');
    assert.equal(result, 'bash .claude/skills/scripts/superspec-guard.sh');
  });

  it('handles different skillsDir', () => {
    const result = buildHookCommand('.cursor', 'scripts/superspec-state.sh');
    assert.equal(result, 'bash .cursor/skills/scripts/superspec-state.sh');
  });
});
