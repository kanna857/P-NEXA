import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getHivePath } from './hiveStorage.js';
import { TaskWorktree } from './types.js';

const PROTECTED_BRANCHES = ['main', 'master', 'release/'];

/**
 * Safely executes a git command via spawnSync with an argument array (shell: false).
 */
function safeGit(args: string[]): { success: boolean; stdout: string; stderr: string } {
  try {
    const result = spawnSync('git', args, {
      shell: false,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return {
      success: result.status === 0,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
  } catch (err: unknown) {
    return {
      success: false,
      stdout: '',
      stderr: String(err)
    };
  }
}

/**
 * Creates an isolated Git worktree for parallel agent execution.
 */
export function createIsolatedWorktree(taskId: string, branchPrefix = 'feat/agent-task'): TaskWorktree {
  // Strict sanitization of taskId and branchPrefix
  const sanitizedTaskId = taskId.replace(/[^a-z0-9_-]/gi, '-');
  const sanitizedPrefix = branchPrefix.replace(/[^a-z0-9_\-\/]/gi, '');
  const branchName = `${sanitizedPrefix}-${sanitizedTaskId}`;

  // Enforce branch protection invariants
  if (PROTECTED_BRANCHES.some((b) => branchName === b || branchName.startsWith(b))) {
    throw new Error(`Refusing to allocate worktree on protected branch: ${branchName}`);
  }

  const hivePath = getHivePath();
  const worktreesDir = join(hivePath, 'worktrees');
  const targetWorktreePath = join(worktreesDir, sanitizedTaskId);

  if (!existsSync(worktreesDir)) {
    mkdirSync(worktreesDir, { recursive: true });
  }

  // If a stale worktree directory exists, remove it safely
  if (existsSync(targetWorktreePath)) {
    safeGit(['worktree', 'remove', '--force', targetWorktreePath]);
    if (existsSync(targetWorktreePath)) {
      rmSync(targetWorktreePath, { recursive: true, force: true });
    }
  }

  // Attempt real git worktree allocation using parameterized invocation
  safeGit(['branch', '-D', branchName]);
  const addResult = safeGit(['worktree', 'add', '-b', branchName, targetWorktreePath, 'HEAD']);

  if (!addResult.success && !existsSync(targetWorktreePath)) {
    mkdirSync(targetWorktreePath, { recursive: true });
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
      safeGit(['worktree', 'remove', '--force', worktree.worktreePath]);
      if (existsSync(worktree.worktreePath)) {
        rmSync(worktree.worktreePath, { recursive: true, force: true });
      }
    }

    safeGit(['worktree', 'prune']);

    // Guard: never delete protected branches
    if (
      deleteBranch &&
      worktree.branchName &&
      !PROTECTED_BRANCHES.some((b) => worktree.branchName === b || worktree.branchName.startsWith(b))
    ) {
      safeGit(['branch', '-D', worktree.branchName]);
    }

    worktree.isCleanedUp = true;
    return true;
  } catch {
    return false;
  }
}
