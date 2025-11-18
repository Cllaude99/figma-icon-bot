import simpleGit, { SimpleGit } from 'simple-git';
import { Octokit } from 'octokit';
import { FigmaIconBotConfig, SyncResult } from './types.js';

export class GitHandler {
  private git: SimpleGit;
  private config: FigmaIconBotConfig;
  private octokit?: Octokit;

  constructor(config: FigmaIconBotConfig, cwd: string = process.cwd()) {
    this.config = config;
    this.git = simpleGit(cwd);

    // Initialize Octokit for PR creation if GitHub token is available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      this.octokit = new Octokit({ auth: githubToken });
    }
  }

  /**
   * Check if there are any changes to commit
   */
  async hasChanges(): Promise<boolean> {
    const status = await this.git.status();
    return status.files.length > 0;
  }

  /**
   * Create a new branch and commit changes
   */
  async commitChanges(syncResult: SyncResult): Promise<void> {
    if (!this.config.git.enabled) {
      return;
    }

    const hasChanges = await this.hasChanges();
    if (!hasChanges) {
      console.log('No changes to commit');
      return;
    }

    // Get current branch
    const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

    // Create and checkout new branch
    const branchName = this.config.git.branch || 'chore/sync-figma-icons';
    try {
      await this.git.checkoutBranch(branchName, currentBranch);
    } catch {
      // Branch might already exist, just checkout
      await this.git.checkout(branchName);
    }

    // Stage changes
    await this.git.add(this.config.output.directory);

    // Create commit message
    const commitMessage = this.generateCommitMessage(syncResult);
    await this.git.commit(commitMessage);

    console.log(`✓ Changes committed to branch: ${branchName}`);
  }

  /**
   * Push branch to remote
   */
  async pushBranch(): Promise<void> {
    const branchName = this.config.git.branch || 'chore/sync-figma-icons';

    try {
      await this.git.push('origin', branchName, ['--set-upstream']);
      console.log(`✓ Pushed branch to origin/${branchName}`);
    } catch (error) {
      console.error('Failed to push branch:', error);
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(syncResult: SyncResult): Promise<string | null> {
    if (!this.config.git.createPR) {
      return null;
    }

    if (!this.octokit) {
      console.warn('GITHUB_TOKEN not found. Skipping PR creation.');
      console.warn('Set GITHUB_TOKEN environment variable to enable PR creation.');
      return null;
    }

    try {
      // Get repository info
      const remote = await this.git.getRemotes(true);
      const originUrl = remote.find((r) => r.name === 'origin')?.refs.push;

      if (!originUrl) {
        throw new Error('No origin remote found');
      }

      const repoInfo = this.parseGitHubUrl(originUrl);
      if (!repoInfo) {
        throw new Error('Could not parse GitHub repository info from remote URL');
      }

      // Get current branch
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

      // Check if PR already exists
      const existingPRs = await this.octokit.rest.pulls.list({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        head: `${repoInfo.owner}:${currentBranch}`,
        state: 'open',
      });

      if (existingPRs.data.length > 0) {
        const prUrl = existingPRs.data[0].html_url;
        console.log(`✓ PR already exists: ${prUrl}`);
        return prUrl;
      }

      // Create PR
      const prBody = this.generatePRBody(syncResult);
      const response = await this.octokit.rest.pulls.create({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        title: this.config.git.prTitle || '🎨 Sync Figma Icons',
        body: prBody,
        head: currentBranch,
        base: 'main', // TODO: make this configurable
      });

      const prUrl = response.data.html_url;
      console.log(`✓ Pull request created: ${prUrl}`);
      return prUrl;
    } catch (error) {
      console.error('Failed to create PR:', error);
      throw error;
    }
  }

  /**
   * Parse GitHub repository info from remote URL
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Handle SSH URLs: git@github.com:owner/repo.git
    const sshMatch = url.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // Handle HTTPS URLs: https://github.com/owner/repo.git
    const httpsMatch = url.match(/https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    return null;
  }

  /**
   * Generate commit message from sync result
   */
  private generateCommitMessage(syncResult: SyncResult): string {
    const baseMessage = this.config.git.commitMessage || 'chore: sync Figma icons';

    const details: string[] = [];
    if (syncResult.added.length > 0) {
      details.push(`Added: ${syncResult.added.length} icon(s)`);
    }
    if (syncResult.updated.length > 0) {
      details.push(`Updated: ${syncResult.updated.length} icon(s)`);
    }
    if (syncResult.deleted.length > 0) {
      details.push(`Deleted: ${syncResult.deleted.length} icon(s)`);
    }

    if (details.length > 0) {
      return `${baseMessage}\n\n${details.join('\n')}`;
    }

    return baseMessage;
  }

  /**
   * Generate PR body from sync result
   */
  private generatePRBody(syncResult: SyncResult): string {
    const baseBody = this.config.git.prBody || 'This PR was automatically generated by figma-icon-bot.';

    let changes = '\n\n## Changes\n\n';

    if (syncResult.added.length > 0) {
      changes += `### Added (${syncResult.added.length})\n`;
      syncResult.added.slice(0, 10).forEach((file) => {
        changes += `- ${file}\n`;
      });
      if (syncResult.added.length > 10) {
        changes += `- ... and ${syncResult.added.length - 10} more\n`;
      }
      changes += '\n';
    }

    if (syncResult.updated.length > 0) {
      changes += `### Updated (${syncResult.updated.length})\n`;
      syncResult.updated.slice(0, 10).forEach((file) => {
        changes += `- ${file}\n`;
      });
      if (syncResult.updated.length > 10) {
        changes += `- ... and ${syncResult.updated.length - 10} more\n`;
      }
      changes += '\n';
    }

    if (syncResult.deleted.length > 0) {
      changes += `### Deleted (${syncResult.deleted.length})\n`;
      syncResult.deleted.slice(0, 10).forEach((file) => {
        changes += `- ${file}\n`;
      });
      if (syncResult.deleted.length > 10) {
        changes += `- ... and ${syncResult.deleted.length - 10} more\n`;
      }
      changes += '\n';
    }

    if (syncResult.errors.length > 0) {
      changes += `### Errors (${syncResult.errors.length})\n`;
      syncResult.errors.forEach((error) => {
        changes += `- ${error.file}: ${error.error}\n`;
      });
      changes += '\n';
    }

    return baseBody + changes;
  }

  /**
   * Full automation: commit, push, and create PR
   */
  async automate(syncResult: SyncResult): Promise<string | null> {
    await this.commitChanges(syncResult);
    await this.pushBranch();
    return await this.createPullRequest(syncResult);
  }
}
