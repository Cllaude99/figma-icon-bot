#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { loadConfig, createConfigFile } from './config.js';
import { syncIcons } from './sync.js';
import { FigmaClient } from './figma-client.js';

const program = new Command();

program
  .name('figma-icon-bot')
  .description('Automatically sync Figma icons to your repository')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize configuration file')
  .action(async () => {
    console.log(chalk.blue('🚀 Initializing figma-icon-bot...\n'));

    const response = await prompts([
      {
        type: 'text',
        name: 'fileKey',
        message: 'Enter your Figma file key (from the URL):',
        validate: (value) => (value.length > 0 ? true : 'File key is required'),
      },
      {
        type: 'text',
        name: 'nodeId',
        message:
          'Enter the frame/page node ID (optional, press Enter to skip):',
      },
      {
        type: 'text',
        name: 'directory',
        message: 'Where should icons be saved?',
        initial: './icons',
      },
      {
        type: 'multiselect',
        name: 'formats',
        message: 'Select output formats:',
        choices: [
          { title: 'SVG', value: 'svg', selected: true },
          { title: 'React Component', value: 'react' },
        ],
      },
    ]);

    await createConfigFile();
    console.log(chalk.green('\n✓ Configuration file created!'));
    console.log(
      chalk.gray('  Edit .figma-icon-bot.config.json to customize settings')
    );
    console.log(chalk.gray('  Set FIGMA_ACCESS_TOKEN environment variable'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(
      chalk.gray('  1. Update the config file with your Figma details')
    );
    console.log(chalk.gray('  2. Set FIGMA_ACCESS_TOKEN in your environment'));
    console.log(chalk.gray('  3. Run: figma-icon-bot sync'));
  });

program
  .command('sync')
  .description('Sync icons from Figma')
  .option('--no-git', 'Disable git automation')
  .option('--no-pr', 'Disable PR creation (only commit)')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();

    try {
      const config = await loadConfig();

      // Override config with CLI options
      if (options.git === false) {
        config.git.enabled = false;
      }
      if (options.pr === false) {
        config.git.createPR = false;
      }

      spinner.succeed('Configuration loaded');
      spinner.start('Syncing icons from Figma...');

      const result = await syncIcons(config);

      spinner.stop();
      console.log(chalk.green('\n✨ Sync completed successfully!'));
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(
        chalk.red('\n❌ Error:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate configuration and Figma connection')
  .action(async () => {
    const spinner = ora('Validating configuration...').start();

    try {
      const config = await loadConfig();
      spinner.succeed('Configuration valid');

      spinner.start('Testing Figma connection...');
      const figmaClient = new FigmaClient(
        config.figma.accessToken!,
        config.figma.fileKey
      );

      const file = await figmaClient.getFile();
      spinner.succeed(
        `Connected to Figma file: ${file.document.name || 'Untitled'}`
      );

      spinner.start('Searching for icons...');
      const icons = await figmaClient.findIconNodes(config.figma.nodeId);
      spinner.succeed(`Found ${icons.length} potential icon(s)`);

      if (icons.length > 0) {
        console.log(chalk.gray('\nSample icons:'));
        icons.slice(0, 5).forEach((icon) => {
          console.log(chalk.gray(`  - ${icon.name}`));
        });
        if (icons.length > 5) {
          console.log(chalk.gray(`  ... and ${icons.length - 5} more`));
        }
      }

      console.log(chalk.green('\n✓ Everything looks good!'));
    } catch (error) {
      spinner.fail('Validation failed');
      console.error(
        chalk.red('\n❌ Error:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program.parse();
