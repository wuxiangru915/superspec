import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { printCommandErrorDetails } from './command-error.js';
import type { InstallScope } from './types.js';

function getNpmExecutable(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'npm.cmd' : 'npm';
}

function isCommandAvailable(command: string): boolean {
  try {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(checker, [command], { stdio: 'ignore', timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the .superspec/missions/ directory structure.
 */
async function installSuperspec(
  projectPath: string,
  _toolIds: string[],
  scope: InstallScope,
): Promise<'installed' | 'failed' | 'skipped'> {
  const targetPath = scope === 'global' ? os.homedir() : projectPath;

  console.log(`    Initializing Superspec structure...`);
  try {
    const dirs = [
      path.join(targetPath, '.superspec'),
      path.join(targetPath, '.superspec', 'missions'),
      path.join(targetPath, '.superspec', 'missions', 'archive'),
      path.join(targetPath, '.superspec', 'specs'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Create default config if not present
    const configPath = path.join(targetPath, '.superspec', 'config.yaml');
    try {
      await fs.access(configPath);
    } catch {
      await fs.writeFile(configPath, 'context_compression: off\nauto_transition: true\n', 'utf-8');
    }

    return 'installed';
  } catch (error) {
    console.error(`    Superspec init failed: ${(error as Error).message}`);
    printCommandErrorDetails(error);
    return 'failed';
  }
}

export {
  installSuperspec,
  isCommandAvailable,
  getNpmExecutable,
};
