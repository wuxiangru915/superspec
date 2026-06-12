import path from 'path';
import os from 'os';

import { fileExists, readDir } from '../utils/file-system.js';
import { PLATFORMS, getPlatformSkillsDirs, type Platform } from './platforms.js';

import type { InstallScope } from './types.js';

const SUPERPOWERS_SKILLS = [
  'brainstorming',
  'executing-plans',
  'finishing-a-development-branch',
  'receiving-code-review',
  'requesting-code-review',
  'subagent-driven-development',
  'systematic-debugging',
  'test-driven-development',
  'using-git-worktrees',
  'writing-plans',
];

function getBaseDir(scope: InstallScope, projectPath: string): string {
  return scope === 'global' ? os.homedir() : projectPath;
}

/**
 * Check if superpowers are installed via Claude Code plugin system.
 * Looks in ~/.claude/plugins/cache/{marketplace}/superpowers/{version}/skills/
 */
async function hasPluginSuperspec(): Promise<boolean> {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const pluginsCacheDir = path.join(claudeDir, 'plugins', 'cache');

  const marketplaceEntries = await readDir(pluginsCacheDir);
  for (const marketplace of marketplaceEntries) {
    const superpowersDir = path.join(pluginsCacheDir, marketplace, 'superpowers');
    if (!(await fileExists(superpowersDir))) continue;

    const versionEntries = await readDir(superpowersDir);
    for (const version of versionEntries) {
      const skillsDir = path.join(superpowersDir, version, 'skills');
      const skills = await readDir(skillsDir);
      // Plugin cache uses directory names like "brainstorming/"
      if (SUPERPOWERS_SKILLS.some((name) => skills.includes(name))) {
        return true;
      }
    }
  }
  return false;
}

async function hasOpenCodeSuperspecCommands(baseDir: string, skillsDir: string, entries: string[]) {
  const superspecEntries = entries.filter((entry) => entry.startsWith('superspec'));
  if (superspecEntries.length === 0) return false;

  const commandsDir = path.join(baseDir, skillsDir, 'commands');
  const commandEntries = await readDir(commandsDir);
  return superspecEntries.every((entry) => commandEntries.includes(`${entry}.md`));
}

async function detectPlatforms(projectPath: string): Promise<Set<string>> {
  const detected = new Set<string>();

  for (const platform of PLATFORMS) {
    if (platform.detectionPaths && platform.detectionPaths.length > 0) {
      for (const p of platform.detectionPaths) {
        if (await fileExists(path.join(projectPath, p))) {
          detected.add(platform.id);
          break;
        }
      }
    } else {
      for (const skillsDir of getPlatformSkillsDirs(platform, 'project')) {
        const dirPath = path.join(projectPath, skillsDir);
        if (await fileExists(dirPath)) {
          detected.add(platform.id);
          break;
        }
      }
    }
  }

  return detected;
}

/**
 * Check if a skill name matches an embedded copy (superpowers-X.md) or
 * a plugin/directory installation (X/).
 */
function matchesSuperpowersSkill(entry: string, skillName: string): boolean {
  return entry === skillName || entry === `superpowers-${skillName}.md`;
}

async function hasSkills(
  baseDir: string,
  platform: Platform,
  component: 'openspec' | 'superpowers' | 'superspec',
  _selectedPlatforms: Platform[] = [],
  scope: InstallScope = 'project',
): Promise<boolean> {
  const skillDirEntries = await Promise.all(
    getPlatformSkillsDirs(platform, scope).map(async (skillsDir) => {
      const fullPath = path.join(baseDir, skillsDir, 'skills');
      return {
        skillsDir,
        entries: (await fileExists(fullPath)) ? await readDir(fullPath) : [],
      };
    }),
  );
  const entries = skillDirEntries.flatMap((dir) => dir.entries);

  switch (component) {
    case 'openspec':
      if (entries.some((e) => e.startsWith('openspec-'))) return true;
      break;
    case 'superpowers':
      if (SUPERPOWERS_SKILLS.some((name) => entries.some((e) => matchesSuperpowersSkill(e, name)))) return true;
      break;
    case 'superspec':
      if (platform.id === 'opencode') {
        for (const dir of skillDirEntries) {
          if (await hasOpenCodeSuperspecCommands(baseDir, dir.skillsDir, dir.entries)) return true;
        }
        break;
      }
      if (entries.some((e) => e.startsWith('superspec'))) return true;
      break;
  }

  if (scope === 'project' && baseDir !== os.homedir()) {
    const globalSkillDirEntries = await Promise.all(
      getPlatformSkillsDirs(platform, 'global').map(async (skillsDir) => {
        const fullPath = path.join(os.homedir(), skillsDir, 'skills');
        return {
          skillsDir,
          entries: (await fileExists(fullPath)) ? await readDir(fullPath) : [],
        };
      }),
    );
    const globalEntries = globalSkillDirEntries.flatMap((dir) => dir.entries);

    switch (component) {
      case 'openspec':
        if (globalEntries.some((e) => e.startsWith('openspec-'))) return true;
        break;
      case 'superpowers':
        if (SUPERPOWERS_SKILLS.some((name) => globalEntries.some((e) => matchesSuperpowersSkill(e, name)))) return true;
        break;
      case 'superspec':
        if (platform.id === 'opencode') {
          for (const dir of globalSkillDirEntries) {
            if (await hasOpenCodeSuperspecCommands(os.homedir(), dir.skillsDir, dir.entries)) {
              return true;
            }
          }
          break;
        }
        if (globalEntries.some((e) => e.startsWith('superspec'))) return true;
        break;
    }
  }

  // Check Claude Code plugin cache for plugin-installed superpowers
  if (component === 'superpowers' && platform.id === 'claude') {
    if (await hasPluginSuperspec()) return true;
  }

  return false;
}

export { detectPlatforms, hasSkills, hasPluginSuperspec, getBaseDir };
export type { InstallScope };
