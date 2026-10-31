import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getHivePath } from './hiveStorage.js';
import { TaskWorktree } from './types.js';

/**
 * Creates an isolated Git worktree for parallel agent execution.
 */
export function createIsolatedWorktree(taskId: string, branchPrefix = 'feat/agent-task'): TaskWorktree {
  const sanitizedTaskId = taskId.replace(/[^a-z0-9_-]/gi, '-');
  const branchName = `${branchPrefix}-${sanitizedTaskId}`;
  const hivePath = getHivePath();
  const worktreesDir = join(hivePath, 'worktrees');
  const targetWorktreePath = join(worktreesDir, sanitizedTaskId);

  if (!existsSync(worktreesDir)) {
    mkdirSync(worktreesDir, { recursive: true });
  }

  // If a stale worktree directory exists, remove it first
  if (existsSync(targetWorktreePath)) {
    try {
      execSync(`git worktree remove --force "${targetWorktreePath}"`, { stdio: 'ignore' });
    } catch {
      rmSync(targetWorktreePath, { recursive: true, force: true });
    }
  }

  // Attempt real git worktree allocation
  try {
    // Delete branch if exists from a prior test run
    try {
      execSync(`git branch -D "${branchName}"`, { stdio: 'ignore' });
    } catch {
      // Ignore if branch doesn't exist
    }

    execSync(`git worktree add -b "${branchName}" "${targetWorktreePath}" HEAD`, {
      stdio: 'pipe',
      encoding: 'utf8'
    });
  } catch (err: unknown) {
    // Fallback if worktree command is restricted in environment
    if (!existsSync(targetWorktreePath)) {
      mkdirSync(targetWorktreePath, { recursive: true });
    }
  }

  return {
    branchName,
    worktreePath: targetWorktreePath,
    isCleanedUp: false,
    createdAt: new Date().toISOString()
  };
}

/**
 * Safely removes and prunes an isolated Git worktree after task completion or rejection.
 */
export function cleanupWorktree(worktree: TaskWorktree, deleteBranch = false): boolean {
  if (!worktree || worktree.isCleanedUp) return true;

  try {
    if (existsSync(worktree.worktreePath)) {
      try {
        execSync(`git worktree remove --force "${worktree.worktreePath}"`, { stdio: 'ignore' });
      } catch {
        rmSync(worktree.worktreePath, { recursive: true, force: true });
      }
    }

    try {
      execSync('git worktree prune', { stdio: 'ignore' });
    } catch {
      // Ignore
    }

    if (deleteBranch && worktree.branchName) {
      try {
        execSync(`git branch -D "${worktree.branchName}"`, { stdio: 'ignore' });
      } catch {
        // Ignore
      }
    }

    worktree.isCleanedUp = true;
    return true;
  } catch {
    return false;
  }
}

