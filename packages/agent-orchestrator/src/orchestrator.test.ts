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
  getPendingApprovals
} from './orchestratorService.js';

describe('Development Task Orchestrator & Munder Difflin Hive Protocol', () => {
  it('enforces safety rails by allowing safe commands and blocking destructive commands', () => {
    expect(validateCommandSafety('pnpm test').allowed).toBe(true);
    expect(validateCommandSafety('pnpm build').allowed).toBe(true);
    expect(validateCommandSafety('git status').allowed).toBe(true);

    const destructiveRm = validateCommandSafety('rm -rf /');
    expect(destructiveRm.allowed).toBe(false);
    expect(destructiveRm.isDestructive).toBe(true);

    const destructiveDrop = validateCommandSafety('drop database prod_db');
    expect(destructiveDrop.allowed).toBe(false);

    expect(validatePathSafety(['apps/web/src/components/MyComp.tsx']).allowed).toBe(true);
    expect(validatePathSafety(['.env']).allowed).toBe(false);
    expect(validatePathSafety(['.git/HEAD']).allowed).toBe(false);
  });

  it('initializes the Munder Difflin Hive structure and verifies default files', () => {
    const hivePath = ensureHiveStructure();
    expect(hivePath).toContain('munder-difflin');

    const blackboard = loadBlackboardEntries();
    expect(blackboard.length).toBeGreaterThan(0);
    expect(blackboard.some((b) => b.topic.includes('HIVE_BLACKBOARD'))).toBe(true);
  });

  it('creates, executes, and audits a full multi-agent development task workflow', async () => {
    // 1. Create Task
    const task = createDevelopmentTask('Refactor 3D digital twin viewport camera reset hotkeys');
    expect(task.id).toMatch(/^MD-TASK-/);
    expect(task.squad.length).toBe(5);

    // Verify Supervisor is Michael
    const supervisor = task.squad.find((s) => s.assignedRole === 'SUPERVISOR');
    expect(supervisor?.name).toContain('Michael');

    // Verify Lead is 3D specialist
    const lead = task.squad.find((s) => s.assignedRole === 'LEAD_SPECIALIST');
    expect(lead?.id).toBe('agency-3d-scene-developer');

    // 2. Verify Worktree created
    expect(task.worktree.branchName).toContain('feat/agent-task');
    expect(task.worktree.isCleanedUp).toBe(false);

    // 3. Execute Task through stages
    const executedTask = await executeDevelopmentTask(task.id);
    expect(executedTask.status).toBe('AWAITING_APPROVAL');
    expect(executedTask.codeReview?.passed).toBe(true);
    expect(executedTask.securityReview?.passed).toBe(true);
    expect(executedTask.testResults?.passed).toBe(true);
    expect(executedTask.executionLogs.length).toBeGreaterThan(3);

    // 4. Verify Pending Human Approvals Queue
    const pending = getPendingApprovals();
    expect(pending.some((p) => p.taskId === task.id)).toBe(true);

    // 5. Human Approval Gate
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

    // 6. Verify Task persisted in Hive ledger
    const tasks = loadHiveTasks();
    const persisted = tasks.find((t) => t.id === task.id);
    expect(persisted).toBeDefined();
    expect(persisted?.status).toBe('COMPLETED');
  });
});

