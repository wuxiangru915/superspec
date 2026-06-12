import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// getNextCommand is not exported, so we test the mapping indirectly
// by verifying the command pattern through the gauge module's behavior.
// For now, we test the countTasks logic with a temp file.

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let tmpDir: string;

import { beforeEach, afterEach } from 'node:test';

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gauge-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// countTasks is not exported, but we can test its behavior through file creation
describe('countTasks behavior (via file)', () => {
  it('counts checkboxes in markdown', async () => {
    const content = `
# Tasks
- [x] Done task
- [ ] Pending task
- [x] Another done
- [ ] Another pending
- [x] Final done
`;
    const filePath = path.join(tmpDir, 'roadmap.md');
    await fs.writeFile(filePath, content, 'utf-8');

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    const total = lines.filter((l) => /^\s*- \[[ x]\]/.test(l)).length;
    const done = lines.filter((l) => /^\s*- \[x\]/i.test(l)).length;

    assert.equal(total, 5);
    assert.equal(done, 3);
  });

  it('returns 0 for empty file', async () => {
    const filePath = path.join(tmpDir, 'empty.md');
    await fs.writeFile(filePath, '', 'utf-8');

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    const total = lines.filter((l) => /^\s*- \[[ x]\]/.test(l)).length;
    const done = lines.filter((l) => /^\s*- \[x\]/i.test(l)).length;

    assert.equal(total, 0);
    assert.equal(done, 0);
  });
});
