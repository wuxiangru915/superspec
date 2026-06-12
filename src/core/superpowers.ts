/**
 * Integrated Superspec installer.
 * Since Superspec skills are now embedded in the Superspec assets
 * and listed in the manifest, they are automatically copied by
 * copySuperspecSkillsForPlatform.
 *
 * This function now just returns success as the work is handled elsewhere.
 */
async function installSuperspecForPlatforms(
  _projectPath: string,
  _scope: string,
  _platformIds: string[],
): Promise<'installed' | 'failed' | 'skipped'> {
  console.log(`    Integrating Superspec components from local assets...`);
  return 'installed';
}

export {
  installSuperspecForPlatforms,
};
