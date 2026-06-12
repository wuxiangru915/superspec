import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { fileExists, readDir } from '../utils/file-system.js';
import { isCommandAvailable } from '../core/openspec.js';
import { readManifest, getAssetsDir } from '../core/skills.js';
import { PLATFORMS, getPlatformSkillsDirs } from '../core/platforms.js';
import type { InstallScope } from '../core/types.js';

interface CheckResult {
  check: string;
  gauge: 'pass' | 'warn' | 'fail';
  message: string;
}

type DoctorScope = InstallScope | 'auto';

const VALID_YAML_FIELDS = new Set([
  'workflow',
  'phase',
  'context_compression',
  'build_mode',
  'build_pause',
  'subagent_dispatch',
  'tdd_mode',
  'isolation',
  'refine_mode',
  'auto_transition',
  'base_ref',
  'blueprint_doc',
  'plan',
  'refine_result',
  'verification_report',
  'branch_status',
  'created_at',
  'verified_at',
  'archived',
  'change_id',
  'openspec_version',
  'direct_override',
  'build_command',
  'verify_command',
  'handoff_context',
  'handoff_hash',
]);

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

async function checkSuperspecCli(): Promise<CheckResult> {
  if (!isCommandAvailable('openspec')) {
    return {
      check: 'openspec CLI',
      gauge: 'warn',
      message: 'not installed — install with: npm install -g @fission-ai/openspec@latest',
    };
  }
  try {
    const version = execSync('openspec --version', { stdio: 'pipe', timeout: 10_000 })
      .toString()
      .trim();
    return { check: 'openspec CLI', gauge: 'pass', message: `installed (${version})` };
  } catch {
    return { check: 'openspec CLI', gauge: 'pass', message: 'installed' };
  }
}

async function checkWorkingDirs(projectPath: string): Promise<CheckResult> {
  const superspecDir = path.join(projectPath, '.superspec');
  const missionsDir = path.join(projectPath, '.superspec', 'missions');
  const superspecExist = await fileExists(superspecDir);
  const missionsExist = await fileExists(missionsDir);

  if (superspecExist && missionsExist) {
    return { check: 'working directories', gauge: 'pass', message: 'present' };
  }
  if (!superspecExist && !missionsExist) {
    return { check: 'working directories', gauge: 'fail', message: 'missing — run: superspec ignite' };
  }
  return {
    check: 'working directories',
    gauge: 'warn',
    message: 'partial (missing .superspec/missions/)',
  };
}

function getScopeBases(
  projectPath: string,
  scope: DoctorScope,
): Array<{
  scope: InstallScope;
  baseDir: string;
}> {
  if (scope === 'project') return [{ scope, baseDir: projectPath }];
  if (scope === 'global') return [{ scope, baseDir: os.homedir() }];

  const bases: Array<{ scope: InstallScope; baseDir: string }> = [
    { scope: 'project', baseDir: projectPath },
  ];
  if (path.resolve(projectPath) !== path.resolve(os.homedir())) {
    bases.push({ scope: 'global', baseDir: os.homedir() });
  }
  return bases;
}

async function checkSkillCompleteness(
  projectPath: string,
  scope: DoctorScope,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const manifest = await readManifest();

  let anyPlatform = false;
  for (const base of getScopeBases(projectPath, scope)) {
    for (const platform of PLATFORMS) {
      const detectedSkillsDir = (
        await Promise.all(
          getPlatformSkillsDirs(platform, base.scope).map(async (skillsDir) => ({
            skillsDir,
            exists: await fileExists(path.join(base.baseDir, skillsDir, 'skills')),
          })),
        )
      ).find((candidate) => candidate.exists)?.skillsDir;
      if (!detectedSkillsDir) continue;

      const skillsDir = path.join(base.baseDir, detectedSkillsDir, 'skills');
      if (!(await fileExists(skillsDir))) continue;
      anyPlatform = true;

      const missing: string[] = [];
      for (const relPath of manifest.skills) {
        const fullPath = path.join(base.baseDir, detectedSkillsDir, 'skills', relPath);
        if (!(await fileExists(fullPath))) {
          missing.push(relPath);
        }
      }

      results.push(
        missing.length === 0
          ? {
              check: `skills: ${platform.name} (${base.scope})`,
              gauge: 'pass' as const,
              message: `complete (${manifest.skills.length} files)`,
            }
          : {
              check: `skills: ${platform.name} (${base.scope})`,
              gauge: 'warn' as const,
              message: `missing ${missing.length}: ${missing.join(', ')}`,
            },
      );
    }
  }

  if (!anyPlatform) {
    results.push({
      check: 'skills',
      gauge: 'warn',
      message:
        scope === 'auto'
          ? 'no platforms detected in project or global scope — run superspec ignite'
          : `no platforms detected in ${scope} scope — run superspec ignite`,
    });
  }

  return results;
}

async function checkScriptsPresent(): Promise<CheckResult> {
  const assetsDir = getAssetsDir();
  const scriptsDir = path.join(assetsDir, 'skills', 'superspec', 'scripts');
  if (!(await fileExists(scriptsDir))) {
    return { check: 'scripts present', gauge: 'warn', message: 'scripts directory not found' };
  }

  const entries = await readDir(scriptsDir);
  const shFiles = entries.filter((e) => e.endsWith('.sh'));

  return {
    check: 'scripts executable',
    gauge: 'pass',
    message: `OK (${shFiles.length} scripts)`,
  };
}

async function checkSuperspecYamlValidity(projectPath: string): Promise<CheckResult[]> {
  const changesDir = path.join(projectPath, '.superspec', 'missions');
  if (!(await fileExists(changesDir))) return [];

  const entries = await readDir(changesDir);
  const results: CheckResult[] = [];

  for (const entry of entries) {
    const yamlPath = path.join(changesDir, entry, 'state.yaml');
    if (!(await fileExists(yamlPath))) continue;

    const raw = await fs.readFile(yamlPath, 'utf-8');
    const unknownFields = collectTopLevelYamlKeys(raw).filter((key) => !VALID_YAML_FIELDS.has(key));

    results.push(
      unknownFields.length === 0
        ? { check: `state.yaml: ${entry}`, gauge: 'pass' as const, message: 'valid' }
        : {
            check: `state.yaml: ${entry}`,
            gauge: 'fail' as const,
            message: `unknown field(s): ${unknownFields.join(', ')}`,
          },
    );
  }

  return results;
}

async function checkCodegraph(projectPath: string, scope: DoctorScope): Promise<CheckResult> {
  if (!isCommandAvailable('codegraph')) {
    return {
      check: 'CodeGraph CLI',
      gauge: 'warn',
      message: 'not installed — install with: npm install -g @colbymchenry/codegraph',
    };
  }

  if (scope === 'global') {
    return { check: 'CodeGraph CLI', gauge: 'pass', message: 'installed' };
  }

  const codegraphDir = path.join(projectPath, '.codegraph');
  if (!(await fileExists(codegraphDir))) {
    return {
      check: 'CodeGraph',
      gauge: 'warn',
      message: 'CLI installed but project not initialized — run: codegraph ignite -i',
    };
  }

  return { check: 'CodeGraph', gauge: 'pass', message: 'initialized (.codegraph/ present)' };
}

async function collectResults(projectPath: string, scope: DoctorScope): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  results.push(await checkSuperspecCli());
  if (scope !== 'global') {
    results.push(await checkWorkingDirs(projectPath));
  }
  results.push(...(await checkSkillCompleteness(projectPath, scope)));
  results.push(await checkScriptsPresent());
  results.push(await checkCodegraph(projectPath, scope));
  results.push(...(await checkSuperspecYamlValidity(projectPath)));
  return results;
}

function icon(gauge: string): string {
  if (gauge === 'pass') return '✓';
  if (gauge === 'warn') return '⚠';
  return '✗';
}

interface DoctorOptions {
  json?: boolean;
  scope?: DoctorScope;
}

export async function mendCommand(
  targetPath: string,
  options: DoctorOptions = {},
): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const scope = options.scope ?? 'auto';
  const results = await collectResults(projectPath, scope);

  if (options.json) {
    console.log(JSON.stringify({ scope, results }, null, 2));
    return;
  }

  console.log(`Superspec Doctor (scope: ${scope})\n`);

  for (const r of results) {
    console.log(`  ${icon(r.gauge)} ${r.check}: ${r.message}`);
  }

  console.log();
}
