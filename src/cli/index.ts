import { Command, Option } from 'commander';
import { createRequire } from 'module';
import { igniteCommand } from '../commands/ignite.js';
import { gaugeCommand } from '../commands/gauge.js';
import { mendCommand } from '../commands/mend.js';
import { syncCommand } from '../commands/sync.js';
import { stateCommand } from '../commands/state.js';
import { runCommand } from '../commands/run.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

program
  .name('superspec')
  .description('Superspec Autonomous Engine')
  .version(version);

program
  .command('run [path]')
  .description('Auto-detect state and suggest the next workflow action')
  .action(async (targetPath = '.', options) => {
    await runCommand(targetPath, options);
  });

program
  .command('state <subcommand> <changeName> [args...]')
  .description('Manage Superspec change state')
  .action(async (subcommand, changeName, args) => {
    await stateCommand([subcommand, changeName, ...args]);
  });

program
  .command('ignite [path]')
  .description('Initialize Superspec workflow in your project')
  .option('--yes', 'Auto-install missing components, skip existing')
  .option('--skip-existing', 'Never overwrite existing components')
  .option('--overwrite', 'Overwrite manifest-managed files')
  .option('--json', 'Output as JSON')
  .addOption(new Option('--scope <scope>', 'Install scope').choices(['global', 'project']))
  .action(async (targetPath = '.', options) => {
    try {
      await igniteCommand(targetPath, options);
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log('\n  Cancelled.\n');
        process.exit(0);
      }
      throw error;
    }
  });

program
  .command('gauge [path]')
  .description('Show active changes and workflow gauge')
  .option('--json', 'Output as JSON')
  .action(async (targetPath = '.', options) => {
    await gaugeCommand(targetPath, options);
  });

program
  .command('mend [path]')
  .description('Diagnose Superspec installation health')
  .option('--json', 'Output as JSON')
  .addOption(
    new Option('--scope <scope>', 'Install scope to diagnose').choices([
      'auto',
      'global',
      'project',
    ]),
  )
  .action(async (targetPath = '.', options) => {
    await mendCommand(targetPath, options);
  });

program
  .command('sync [path]')
  .description('Update superspec skill files to latest version')
  .option('--json', 'Output as JSON')
  .addOption(new Option('--language <lang>', 'Language for skills').choices(['en', 'zh']))
  .addOption(new Option('--scope <scope>', 'Install scope').choices(['global', 'project']))
  .addOption(new Option('--skip-npm', 'Skip npm package self-sync').hideHelp())
  .action(async (targetPath = '.', options) => {
    await syncCommand(targetPath, options);
  });

program.parse();
