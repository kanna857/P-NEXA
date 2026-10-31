import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { findWorkspaceRoot, getAllMunderHires } from '@nexus/agent-registry';
import { DevelopmentTask, TaskExecutionLog, BlackboardMemoryEntry } from './types.js';

/**
 * Returns the canonical path to the Munder Difflin Hive directory.
 */
export function getHivePath(): string {
  const root = findWorkspaceRoot();
  return join(root, 'integrations', 'munder-difflin', 'hive');
}

/**
 * Initializes and verifies the complete on-disk Hive layout.
 */
export function ensureHiveStructure(): string {
  const hivePath = getHivePath();
  const dirs = [
    hivePath,
    join(hivePath, 'mailboxes'),
    join(hivePath, 'blackboard'),
    join(hivePath, 'worktrees')
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // 1. Sync Hive Registry from 283 Agency Agents
  const registryFile = join(hivePath, 'registry.json');
  if (!existsSync(registryFile)) {
    const hires = getAllMunderHires();
    writeFileSync(
      registryFile,
      JSON.stringify(
        {
          schema: 'munder-difflin/hive-registry@1',
          updatedAt: new Date().toISOString(),
          activeRosterCount: hires.length,
          agents: hires
        },
        null,
        2
      ),
      'utf8'
    );
  }

  // 2. Initialize tasks.json
  const tasksFile = join(hivePath, 'tasks.json');
  if (!existsSync(tasksFile)) {
    writeFileSync(tasksFile, JSON.stringify([], null, 2), 'utf8');
  }

  // 3. Initialize log.jsonl
  const logFile = join(hivePath, 'log.jsonl');
  if (!existsSync(logFile)) {
    writeFileSync(
      logFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'HIVE_INITIALIZED',
        agent: 'Michael (Branch Manager)',
        message: 'Munder Difflin Hive multi-agent harness initialized for P-NEXA.'
      }) + '\n',
      'utf8'
    );
  }

  // 4. Initialize Core Blackboard
  const blackboardFile = join(hivePath, 'blackboard', 'HIVE_BLACKBOARD.md');
  if (!existsSync(blackboardFile)) {
    writeFileSync(
      blackboardFile,
      `# Munder Difflin Hive Shared Blackboard\n\n` +
      `**Autonomous Multi-Agent Workspace for P-NEXA Development**\n\n` +
      `## Architectural Invariants\n` +
      `- Main branch is protected by single-committer rails.\n` +
      `- All code changes must execute in isolated Git worktrees.\n` +
      `- Zero credentials permitted in blackboard memory or task mailboxes.\n` +
      `- All tasks require human-in-the-loop sign-off before merge.\n\n` +
      `## Active Directives\n` +
      `- [Directive #1] Preserve all 3D Digital Twin, MongoDB, Redis, and React routes.\n` +
      `- [Directive #2] Run test suite gating on every stage.\n`,
      'utf8'
    );
  }

  return hivePath;
}

/**
 * Loads all tasks from the Hive tasks ledger.
 */
export function loadHiveTasks(): DevelopmentTask[] {
  ensureHiveStructure();
  const tasksFile = join(getHivePath(), 'tasks.json');
  try {
    const raw = readFileSync(tasksFile, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw) as DevelopmentTask[];
  } catch {
    return [];
  }
}

/**
 * Saves or updates a development task in the Hive ledger.
 */
export function saveHiveTask(task: DevelopmentTask): void {
  ensureHiveStructure();
  const tasks = loadHiveTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx] = { ...task, updatedAt: new Date().toISOString() };
  } else {
    tasks.unshift(task);
  }

  const tasksFile = join(getHivePath(), 'tasks.json');
  writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
}

/**
 * Appends a log event to the append-only Hive activity feed (`log.jsonl`).
 */
export function appendHiveLog(log: TaskExecutionLog & { taskId?: string }): void {
  ensureHiveStructure();
  const logFile = join(getHivePath(), 'log.jsonl');
  const line = JSON.stringify({
    ...log,
    recordedAt: new Date().toISOString()
  }) + '\n';
  appendFileSync(logFile, line, 'utf8');
}

/**
 * Delivers an atomic desk-to-desk mailbox notification to a specialist agent.
 */
export function writeAgentMailbox(
  recipientAgentId: string,
  message: {
    from: string;
    taskId: string;
    type: 'TASK_ASSIGNMENT' | 'REVIEW_REQUEST' | 'SECURITY_ALERT' | 'APPROVAL_NOTICE';
    subject: string;
    body: string;
  }
): string {
  const hivePath = getHivePath();
  const agentInbox = join(hivePath, 'mailboxes', recipientAgentId, 'inbox');
  if (!existsSync(agentInbox)) {
    mkdirSync(agentInbox, { recursive: true });
  }

  const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const msgPath = join(agentInbox, `${msgId}.json`);
  const payload = {
    id: msgId,
    timestamp: new Date().toISOString(),
    recipient: recipientAgentId,
    ...message
  };

  writeFileSync(msgPath, JSON.stringify(payload, null, 2), 'utf8');
  return msgId;
}

/**
 * Appends an entry to the shared Markdown Blackboard.
 */
export function writeBlackboardMemory(topic: string, author: string, content: string): void {
  const hivePath = getHivePath();
  const blackboardDir = join(hivePath, 'blackboard');
  if (!existsSync(blackboardDir)) {
    mkdirSync(blackboardDir, { recursive: true });
  }

  const safeTopic = topic.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const filePath = join(blackboardDir, `${safeTopic}.md`);

  const entry = `\n### [${new Date().toLocaleTimeString()}] ${topic} (Author: ${author})\n${content}\n`;
  appendFileSync(filePath, entry, 'utf8');
}

/**
 * Reads all Blackboard memory files.
 */
export function loadBlackboardEntries(): BlackboardMemoryEntry[] {
  ensureHiveStructure();
  const blackboardDir = join(getHivePath(), 'blackboard');
  const files = readdirSync(blackboardDir).filter((f) => f.endsWith('.md'));

  const entries: BlackboardMemoryEntry[] = [];
  for (const file of files) {
    const content = readFileSync(join(blackboardDir, file), 'utf8');
    entries.push({
      topic: file.replace('.md', ''),
      author: 'Michael / Agent Squad',
      timestamp: new Date().toISOString(),
      content
    });
  }
  return entries;
}

