import { FigmaClient } from './figma-client.js';
import { IconProcessor } from './icon-processor.js';
import { GitHandler } from './git-handler.js';
import { FigmaIconBotConfig, SyncResult } from './types.js';

export async function syncIcons(config: FigmaIconBotConfig): Promise<SyncResult> {
  // Initialize clients
  const figmaClient = new FigmaClient(config.figma.accessToken!, config.figma.fileKey);
  const iconProcessor = new IconProcessor(config);
  const gitHandler = new GitHandler(config);

  // Build filter pattern if configured
  let nameFilter: RegExp | undefined;
  if (config.filters?.includePattern) {
    nameFilter = new RegExp(config.filters.includePattern);
  }

  // Fetch icons from Figma
  console.log('📥 Fetching icons from Figma...');
  const icons = await figmaClient.getIcons(config.figma.nodeId, nameFilter);

  if (icons.length === 0) {
    console.log('⚠️  No icons found in Figma');
    return {
      added: [],
      updated: [],
      deleted: [],
      unchanged: [],
      errors: [],
    };
  }

  console.log(`Found ${icons.length} icon(s)`);

  // Apply exclude filter if configured
  let filteredIcons = icons;
  if (config.filters?.excludePattern) {
    const excludePattern = new RegExp(config.filters.excludePattern);
    filteredIcons = icons.filter((icon) => !excludePattern.test(icon.name));
    console.log(`Filtered to ${filteredIcons.length} icon(s) after exclusions`);
  }

  // Process and save icons
  console.log('💾 Processing and saving icons...');
  const syncResult = await iconProcessor.processIcons(filteredIcons);

  // Print summary
  console.log('\n📊 Sync Summary:');
  if (syncResult.added.length > 0) {
    console.log(`  ✨ Added: ${syncResult.added.length} icon(s)`);
  }
  if (syncResult.updated.length > 0) {
    console.log(`  🔄 Updated: ${syncResult.updated.length} icon(s)`);
  }
  if (syncResult.deleted.length > 0) {
    console.log(`  🗑️  Deleted: ${syncResult.deleted.length} icon(s)`);
  }
  if (syncResult.unchanged.length > 0) {
    console.log(`  ⏭️  Unchanged: ${syncResult.unchanged.length} icon(s)`);
  }
  if (syncResult.errors.length > 0) {
    console.log(`  ❌ Errors: ${syncResult.errors.length}`);
    syncResult.errors.forEach((error) => {
      console.log(`     - ${error.file}: ${error.error}`);
    });
  }

  // Git automation
  if (config.git.enabled) {
    console.log('\n🔧 Git automation...');
    const hasChanges = await gitHandler.hasChanges();

    if (hasChanges) {
      await gitHandler.commitChanges(syncResult);

      if (config.git.createPR) {
        await gitHandler.pushBranch();
        const prUrl = await gitHandler.createPullRequest(syncResult);
        if (prUrl) {
          console.log(`\n🎉 Pull request created: ${prUrl}`);
        }
      }
    } else {
      console.log('  ℹ️  No changes to commit');
    }
  }

  return syncResult;
}
