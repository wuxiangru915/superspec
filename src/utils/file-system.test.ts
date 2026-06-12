import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ensureDir, fileExists, readDir, readJson, writeFile, copyFile } from './file-system.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('ensureDir', () => {
  it('creates nested directories', async () => {
    const nested = path.join(tmpDir, 'a', 'b', 'c');
    await ensureDir(nested);
    const stat = await fs.stat(nested);
    assert.ok(stat.isDirectory());
  });

  it('does not throw if directory exists', async () => {
    await ensureDir(tmpDir);
    await ensureDir(tmpDir);
  });
});

describe('fileExists', () => {
  it('returns true for existing file', async () => {
    const filePath = path.join(tmpDir, 'exists.txt');
    await fs.writeFile(filePath, 'hello', 'utf-8');
    assert.equal(await fileExists(filePath), true);
  });

  it('returns false for nonexistent file', async () => {
    assert.equal(await fileExists(path.join(tmpDir, 'nope.txt')), false);
  });

  it('returns true for existing directory', async () => {
    assert.equal(await fileExists(tmpDir), true);
  });
});

describe('readDir', () => {
  it('returns file names', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.txt'), '');
    await fs.writeFile(path.join(tmpDir, 'b.txt'), '');
    const entries = await readDir(tmpDir);
    assert.ok(entries.includes('a.txt'));
    assert.ok(entries.includes('b.txt'));
  });

  it('returns empty array for nonexistent directory', async () => {
    const entries = await readDir(path.join(tmpDir, 'nonexistent'));
    assert.deepEqual(entries, []);
  });
});

describe('readJson', () => {
  it('reads and parses JSON', async () => {
    const filePath = path.join(tmpDir, 'data.json');
    await fs.writeFile(filePath, '{"key": "value", "num": 42}', 'utf-8');
    const data = await readJson<{ key: string; num: number }>(filePath);
    assert.equal(data.key, 'value');
    assert.equal(data.num, 42);
  });
});

describe('writeFile', () => {
  it('writes content to file', async () => {
    const filePath = path.join(tmpDir, 'output.txt');
    await writeFile(filePath, 'hello world');
    const content = await fs.readFile(filePath, 'utf-8');
    assert.equal(content, 'hello world');
  });

  it('creates parent directories', async () => {
    const filePath = path.join(tmpDir, 'deep', 'nested', 'file.txt');
    await writeFile(filePath, 'nested content');
    const content = await fs.readFile(filePath, 'utf-8');
    assert.equal(content, 'nested content');
  });
});

describe('copyFile', () => {
  it('copies file to destination', async () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'dest.txt');
    await fs.writeFile(src, 'copied content', 'utf-8');
    await copyFile(src, dest);
    const content = await fs.readFile(dest, 'utf-8');
    assert.equal(content, 'copied content');
  });

  it('creates parent directories for destination', async () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'deep', 'dest.txt');
    await fs.writeFile(src, 'content', 'utf-8');
    await copyFile(src, dest);
    const content = await fs.readFile(dest, 'utf-8');
    assert.equal(content, 'content');
  });
});
