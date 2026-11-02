import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const hiveTasksPath = path.join(rootDir, 'integrations', 'munder-difflin', 'hive', 'tasks.json');
const webTasksPath = path.join(rootDir, 'apps', 'web', 'src', 'data', 'hiveTasks.json');

const existingTasks = JSON.parse(fs.readFileSync(hiveTasksPath, 'utf8'));

// Filter out any previous injected tasks to avoid duplicate runs
const baseTasks = existingTasks.filter(t => !['MD-TASK-A11Y-WCAG', 'MD-TASK-SEC-POLICY', 'MD-TASK-TIMELINE-SYNC'].includes(t.id));

const additionalTasks = [
  {
    id: 'MD-TASK-A11Y-WCAG',
    title: 'WCAG 2.1 AA accessibility audit & keyboard focus traps',
    prompt: 'Audit WCAG 2.1 AA compliance for Agent Execution Timeline, ensure color contrast >= 4.5:1, keyboard navigation, and aria-labels.',
    priority: 'HIGH',
    status: 'RETRYING',
    currentStage: 'TESTING',
    retryCount: 2,
    maxRetries: 3,
    failureReason: 'axe-core assertion failed: filter toggle button missing explicit aria-label. Color contrast ratio 3.82:1 below WCAG AA 4.5:1 minimum on secondary badge.',
    errorDetails: {
      code: 'ERR_A11Y_CONTRAST_FAIL',
      message: 'axe-core assertion failed: filter toggle button missing explicit aria-label.',
      stack: 'Error: axe-core [color-contrast]: Elements must have sufficient color contrast (3.82:1 < 4.5:1)\n    at Object.test (tests/a11y/AgentTimeline.test.ts:42:15)\n    at runTest (packages/testing/src/runner.ts:88:9)',
      stage: 'TESTING',
      timestamp: '2026-10-31T16:09:12.000Z',
      retryCount: 2,
      recovered: false
    },
    squad: [
      {
        id: 'munder-michael-supervisor',
        name: 'Michael (Branch Manager)',
        role: 'Office Orchestrator & Supervisor',
        division: 'operations',
        assignedRole: 'SUPERVISOR',
        provider: 'antigravity',
        deskId: 'desk-mgr-001'
      },
      {
        id: 'agency-accessibility-auditor',
        name: 'Accessibility Auditor',
        role: 'Specialist (testing)',
        division: 'testing',
        assignedRole: 'LEAD_SPECIALIST',
        provider: 'codex',
        deskId: 'desk-tes-275'
      },
      {
        id: 'agency-frontend-developer',
        name: 'Frontend Developer',
        role: 'Specialist (engineering)',
        division: 'engineering',
        assignedRole: 'LEAD_SPECIALIST',
        provider: 'antigravity',
        deskId: 'desk-eng-012'
      },
      {
        id: 'agency-code-reviewer',
        name: 'Code Reviewer',
        role: 'Specialist (engineering)',
        division: 'engineering',
        assignedRole: 'CODE_REVIEWER',
        provider: 'claude-code',
        deskId: 'desk-eng-025'
      },
      {
        id: 'agency-ai-generated-code-security-auditor',
        name: 'AI-Generated Code Security Auditor',
        role: 'Specialist (security)',
        division: 'security',
        assignedRole: 'SECURITY_AUDITOR',
        provider: 'gemini-cli',
        deskId: 'desk-sec-192'
      }
    ],
    plan: [
      {
        id: 'MD-TASK-A11Y-WCAG-P1',
        title: 'Accessibility Baseline & Color Contrast Matrix',
        assignedAgentId: 'agency-accessibility-auditor',
        assignedAgentName: 'Accessibility Auditor',
        provider: 'codex',
        stage: 'PLANNING',
        dependencies: [],
        status: 'completed'
      },
      {
        id: 'MD-TASK-A11Y-WCAG-P2',
        title: 'ARIA Landmarks and High-Contrast Focus Ring Implementation',
        assignedAgentId: 'agency-frontend-developer',
        assignedAgentName: 'Frontend Developer',
        provider: 'antigravity',
        stage: 'IMPLEMENTATION',
        dependencies: ['MD-TASK-A11Y-WCAG-P1'],
        status: 'completed'
      },
      {
        id: 'MD-TASK-A11Y-WCAG-P3',
        title: 'Semantic HTML & Screen Reader Verification Review',
        assignedAgentId: 'agency-code-reviewer',
        assignedAgentName: 'Code Reviewer',
        provider: 'claude-code',
        stage: 'CODE_REVIEW',
        dependencies: ['MD-TASK-A11Y-WCAG-P2'],
        status: 'completed'
      },
      {
        id: 'MD-TASK-A11Y-WCAG-P4',
        title: 'DOM Mutation Security and Allowlist Audit',
        assignedAgentId: 'agency-ai-generated-code-security-auditor',
        assignedAgentName: 'AI-Generated Code Security Auditor',
        provider: 'gemini-cli',
        stage: 'SECURITY_REVIEW',
        dependencies: ['MD-TASK-A11Y-WCAG-P2'],
        status: 'completed'
      },
      {
        id: 'MD-TASK-A11Y-WCAG-P5',
        title: 'Axe-core Automated Accessibility Suite Verification',
        assignedAgentId: 'agency-accessibility-auditor',
        assignedAgentName: 'Accessibility Auditor',
        provider: 'codex',
        stage: 'TESTING',
        dependencies: ['MD-TASK-A11Y-WCAG-P3', 'MD-TASK-A11Y-WCAG-P4'],
        status: 'running'
      }
    ],
    worktree: {
      branchName: 'feat/agent-task-MD-TASK-A11Y-WCAG',
      worktreePath: 'C:\\Users\\dhanu\\OneDrive\\Desktop\\Mern\\integrations\\munder-difflin\\hive\\worktrees\\MD-TASK-A11Y-WCAG',
      isCleanedUp: false,
      createdAt: '2026-10-31T16:08:10.000Z'
    },
    executionLogs: [
      {
        timestamp: '9:38:10 pm',
        agentId: 'munder-michael-supervisor',
        agentName: 'Michael (Branch Manager)',
        level: 'info',
        message: 'Initialized development task "WCAG 2.1 AA accessibility audit & keyboard focus traps" with squad of 5 agents. Worktree allocated at "feat/agent-task-MD-TASK-A11Y-WCAG".'
      },
      {
        timestamp: '9:38:11 pm',
        agentId: 'agency-accessibility-auditor',
        agentName: 'Accessibility Auditor',
        level: 'info',
        message: 'Loaded accessibility guidelines from .agents/skills/agency-accessibility-auditor/SKILL.md. Commencing evaluation on worktree branch.'
      },
      {
        timestamp: '9:38:14 pm',
        agentId: 'agency-frontend-developer',
        agentName: 'Frontend Developer',
        level: 'success',
        message: 'Implemented focus-visible rings, tab navigation order, and ARIA live regions in Agent Timeline components.'
      },
      {
        timestamp: '9:38:16 pm',
        agentId: 'agency-code-reviewer',
        agentName: 'Code Reviewer',
        level: 'success',
        message: 'Peer review approved: Keyboard event handlers utilize proper onKeyDown with Enter/Space handling.'
      },
      {
        timestamp: '9:38:17 pm',
        agentId: 'agency-ai-generated-code-security-auditor',
        agentName: 'AI-Generated Code Security Auditor',
        level: 'success',
        message: 'Security audit passed. Zero script injections or unsanitized innerHTML.'
      },
      {
        timestamp: '9:38:19 pm',
        agentId: 'agency-accessibility-auditor',
        agentName: 'Accessibility Auditor',
        level: 'error',
        message: 'Axe-core verification error: [aria-label] attribute missing on interactive filter toggle button. Text contrast ratio 3.82:1 below 4.5:1 AA standard.'
      },
      {
        timestamp: '9:38:21 pm',
        agentId: 'munder-michael-supervisor',
        agentName: 'Michael (Branch Manager)',
        level: 'warn',
        message: '[RETRY 1/3]: Test suite assertion failed. Supervisor dispatched automated remediation to Frontend Developer in isolated worktree.'
      },
      {
        timestamp: '9:38:24 pm',
        agentId: 'agency-frontend-developer',
        agentName: 'Frontend Developer',
        level: 'info',
        message: 'Applied high-contrast slate-200 styling and aria-label attributes across filter bar components.'
      },
      {
        timestamp: '9:38:26 pm',
        agentId: 'munder-michael-supervisor',
        agentName: 'Michael (Branch Manager)',
        level: 'warn',
        message: '[RETRY 2/3]: Re-running axe-core verification. Automated testing in progress on isolated worktree.'
      }
    ],
    humanApproval: {
      required: true,
      status: 'PENDING',
      requestedAt: '2026-10-31T16:08:10.000Z',
      targetBranch: 'main'
    },
    createdAt: '2026-10-31T16:08:10.000Z',
    updatedAt: '2026-10-31T16:08:26.000Z'
  },
  {
    id: 'MD-TASK-SEC-POLICY',
    title: 'Zero-trust workspace boundary & credential isolation test',
    prompt: 'Test workspace sandbox boundaries by simulating unauthorized file system write to protected .env and .git/HEAD.',
    priority: 'CRITICAL',
    status: 'FAILED',
    currentStage: 'SECURITY_REVIEW',
    retryCount: 3,
    maxRetries: 3,
    failureReason: 'Zero-Trust Policy Violation: Destructive command mutation to ".env" rejected by safetyValidator. Branch quarantined to prevent pipeline escalation.',
    errorDetails: {
      code: 'ERR_ZERO_TRUST_QUARANTINE',
      message: 'Zero-Trust Policy Violation: Mutation target ".env" is in prohibited protected paths allowlist.',
      stack: 'SecurityError: PathSafetyBlocked: Path ".env" is prohibited by Zero-Trust Isolation Policy.\n    at validatePathSafety (packages/agent-orchestrator/src/safetyValidator.ts:38:12)\n    at Orchestrator.enforceIsolation (packages/agent-orchestrator/src/orchestratorService.ts:184:7)',
      stage: 'SECURITY_REVIEW',
      timestamp: '2026-10-31T16:06:50.000Z',
      retryCount: 3,
      recovered: false
    },
    squad: [
      {
        id: 'munder-michael-supervisor',
        name: 'Michael (Branch Manager)',
        role: 'Office Orchestrator & Supervisor',
        division: 'operations',
        assignedRole: 'SUPERVISOR',
        provider: 'antigravity',
        deskId: 'desk-mgr-001'
      },
      {
        id: 'agency-security-architect',
        name: 'Security Architect',
        role: 'Specialist (security)',
        division: 'security',
        assignedRole: 'LEAD_SPECIALIST',
        provider: 'gemini-cli',
        deskId: 'desk-sec-190'
      },
      {
        id: 'agency-code-reviewer',
        name: 'Code Reviewer',
        role: 'Specialist (engineering)',
        division: 'engineering',
        assignedRole: 'CODE_REVIEWER',
        provider: 'claude-code',
        deskId: 'desk-eng-025'
      },
      {
        id: 'agency-ai-generated-code-security-auditor',
        name: 'AI-Generated Code Security Auditor',
        role: 'Specialist (security)',
        division: 'security',
        assignedRole: 'SECURITY_AUDITOR',
        provider: 'gemini-cli',
        deskId: 'desk-sec-192'
      },
      {
        id: 'agency-penetration-tester',
        name: 'Penetration Tester',
        role: 'Specialist (security)',
        division: 'security',
        assignedRole: 'TEST_ENGINEER',
        provider: 'codex',
        deskId: 'desk-sec-198'
      }
    ],
    plan: [
      {
        id: 'MD-TASK-SEC-POLICY-P1',
        title: 'Zero-Trust Boundary Threat Model',
        assignedAgentId: 'agency-security-architect',
        assignedAgentName: 'Security Architect',
        provider: 'gemini-cli',
        stage: 'PLANNING',
        dependencies: [],
        status: 'completed'
      },
      {
        id: 'MD-TASK-SEC-POLICY-P2',
        title: 'Boundary Probe Synthesis in Isolated Worktree',
        assignedAgentId: 'agency-security-architect',
        assignedAgentName: 'Security Architect',
        provider: 'gemini-cli',
        stage: 'IMPLEMENTATION',
        dependencies: ['MD-TASK-SEC-POLICY-P1'],
        status: 'completed'
      },
      {
        id: 'MD-TASK-SEC-POLICY-P3',
        title: 'Secret Hygiene & Privilege Escalation Audit',
        assignedAgentId: 'agency-ai-generated-code-security-auditor',
        assignedAgentName: 'AI-Generated Code Security Auditor',
        provider: 'gemini-cli',
        stage: 'SECURITY_REVIEW',
        dependencies: ['MD-TASK-SEC-POLICY-P2'],
        status: 'failed'
      }
    ],
    worktree: {
      branchName: 'feat/agent-task-MD-TASK-SEC-POLICY-QUARANTINED',
      worktreePath: 'C:\\Users\\dhanu\\OneDrive\\Desktop\\Mern\\integrations\\munder-difflin\\hive\\worktrees\\MD-TASK-SEC-POLICY',
      isCleanedUp: true,
      createdAt: '2026-10-31T16:06:10.000Z'
    },
    executionLogs: [
      {
        timestamp: '9:36:10 pm',
        agentId: 'munder-michael-supervisor',
        agentName: 'Michael (Branch Manager)',
        level: 'info',
        message: 'Initialized security task "Zero-trust workspace boundary & credential isolation test". Worktree allocated at "feat/agent-task-MD-TASK-SEC-POLICY".'
      },
      {
        timestamp: '9:36:12 pm',
        agentId: 'agency-security-architect',
        agentName: 'Security Architect',
        level: 'info',
        message: 'Testing single-committer rails and file isolation boundaries.'
      },
      {
        timestamp: '9:36:15 pm',
        agentId: 'agency-ai-generated-code-security-auditor',
        agentName: 'AI-Generated Code Security Auditor',
        level: 'error',
        message: 'CRITICAL SECURITY VIOLATION: Attempted file mutation targeting protected ".env" blocked by safetyValidator.'
      },
      {
        timestamp: '9:36:18 pm',
        agentId: 'munder-michael-supervisor',
        agentName: 'Michael (Branch Manager)',
        level: 'warn',
        message: '[RETRY 1/3]: Security check failed. Subagent prompted to redirect test artifacts into workspace temporary scratch directory.'
      },
      {
        timestamp: '9:36:22 pm',
        agentId: 'agency-ai-generated-code-security-auditor',
        agentName: 'AI-Generated Code Security Auditor',
        level: 'error',
        message: '[RETRY 2/3]: Secondary mutation target ".git/HEAD" rejected. Path prohibited by zero-trust policies.'
      },
      {
        timestamp: '9:36:26 pm',
        agentId: 'munder-michael-supervisor',
        agentName: 'Michael (Branch Manager)',
        level: 'error',
        message: '[RETRY 3/3]: Maximum retry limit exceeded. Task halted with status FAILED. Worktree quarantined and access revoked.'
      }
    ],
    humanApproval: {
      required: true,
      status: 'REJECTED',
      requestedAt: '2026-10-31T16:06:10.000Z',
      targetBranch: 'main',
      reviewedBy: 'system-governance@nexus.ai',
      reviewedAt: '2026-10-31T16:06:30.000Z',
      decisionComment: 'Automatically quarantined due to policy violation.'
    },
    createdAt: '2026-10-31T16:06:10.000Z',
    updatedAt: '2026-10-31T16:06:30.000Z'
  },
  {
    id: 'MD-TASK-TIMELINE-SYNC',
    title: 'Live Agent Execution Timeline & Live Trace Drawer Synchronization',
    prompt: 'Synchronize Hive execution ledger with real-time websocket and polling drawer with filterable lifecycle events.',
    priority: 'HIGH',
    status: 'RUNNING',
    currentStage: 'IMPLEMENTATION',
    retryCount: 0,
    maxRetries: 3,
    squad: [
      {
        id: 'munder-michael-supervisor',
        name: 'Michael (Branch Manager)',
        role: 'Office Orchestrator & Supervisor',
        division: 'operations',
        assignedRole: 'SUPERVISOR',
        provider: 'antigravity',
        deskId: 'desk-mgr-001'
      },
      {
        id: 'agency-frontend-developer',
        name: 'Frontend Developer',
        role: 'Specialist (engineering)',
        division: 'engineering',
        assignedRole: 'LEAD_SPECIALIST',
        provider: 'antigravity',
        deskId: 'desk-eng-012'
      },
      {
        id: 'agency-code-reviewer',
        name: 'Code Reviewer',
        role: 'Specialist (engineering)',
        division: 'engineering',
        assignedRole: 'CODE_REVIEWER',
        provider: 'claude-code',
        deskId: 'desk-eng-025'
      },
      {
        id: 'agency-ai-generated-code-security-auditor',
        name: 'AI-Generated Code Security Auditor',
        role: 'Specialist (security)',
        division: 'security',
        assignedRole: 'SECURITY_AUDITOR',
        provider: 'gemini-cli',
        deskId: 'desk-sec-192'
      },
      {
        id: 'agency-test-automation-engineer',
        name: 'Test Automation Engineer',
        role: 'Specialist (testing)',
        division: 'testing',
        assignedRole: 'TEST_ENGINEER',
        provider: 'codex',
        deskId: 'desk-tes-270'
      }
    ],
    plan: [
      {
        id: 'MD-TASK-TIMELINE-SYNC-P1',
        title: 'Component Design & WCAG AA Accessible Contract Specification',
        assignedAgentId: 'agency-frontend-developer',
        assignedAgentName: 'Frontend Developer',
        provider: 'antigravity',
        stage: 'PLANNING',
        dependencies: [],
        status: 'completed'
      },
      {
        id: 'MD-TASK-TIMELINE-SYNC-P2',
        title: 'Interactive Timeline Cards, Filters, and Slide-over Drawer Implementation',
        assignedAgentId: 'agency-frontend-developer',
        assignedAgentName: 'Frontend Developer',
        provider: 'antigravity',
        stage: 'IMPLEMENTATION',
        dependencies: ['MD-TASK-TIMELINE-SYNC-P1'],
        status: 'running'
      },
      {
        id: 'MD-TASK-TIMELINE-SYNC-P3',
        title: 'TypeScript Strict Typing & Lint Verification Review',
        assignedAgentId: 'agency-code-reviewer',
        assignedAgentName: 'Code Reviewer',
        provider: 'claude-code',
        stage: 'CODE_REVIEW',
        dependencies: ['MD-TASK-TIMELINE-SYNC-P2'],
        status: 'pending'
      },
      {
        id: 'MD-TASK-TIMELINE-SYNC-P4',
        title: 'Security Allowlist & Zero-Trust Sandbox Isolation Review',
        assignedAgentId: 'agency-ai-generated-code-security-auditor',
        assignedAgentName: 'AI-Generated Code Security Auditor',
        provider: 'gemini-cli',
        stage: 'SECURITY_REVIEW',
        dependencies: ['MD-TASK-TIMELINE-SYNC-P2'],
        status: 'pending'
      },
      {
        id: 'MD-TASK-TIMELINE-SYNC-P5',
        title: 'Full Vitest & Axe-Core Accessibility Regression Suite',
        assignedAgentId: 'agency-test-automation-engineer',
        assignedAgentName: 'Test Automation Engineer',
        provider: 'codex',
        stage: 'TESTING',
        dependencies: ['MD-TASK-TIMELINE-SYNC-P3', 'MD-TASK-TIMELINE-SYNC-P4'],
        status: 'pending'
      }
    ],
    worktree: {
      branchName: 'feat/agent-task-MD-TASK-TIMELINE-SYNC',
      worktreePath: 'C:\\Users\\dhanu\\OneDrive\\Desktop\\Mern\\integrations\\munder-difflin\\hive\\worktrees\\MD-TASK-TIMELINE-SYNC',
      isCleanedUp: false,
      createdAt: '2026-10-31T16:10:00.000Z'
    },
    executionLogs: [
      {
        timestamp: '9:40:00 pm',
        agentId: 'munder-michael-supervisor',
        agentName: 'Michael (Branch Manager)',
        level: 'info',
        message: 'Initialized development task "Live Agent Execution Timeline & Live Trace Drawer Synchronization" with squad of 5 agents. Worktree allocated at "feat/agent-task-MD-TASK-TIMELINE-SYNC".'
      },
      {
        timestamp: '9:40:01 pm',
        agentId: 'agency-frontend-developer',
        agentName: 'Frontend Developer',
        level: 'info',
        message: 'Loaded specialist guidelines from .agents/skills/agency-frontend-developer/SKILL.md. Commencing implementation in isolated Git worktree.'
      },
      {
        timestamp: '9:40:03 pm',
        agentId: 'agency-frontend-developer',
        agentName: 'Frontend Developer',
        level: 'info',
        message: 'Synthesizing WCAG 2.1 AA accessible filterable timeline component with real retry indicators, error diagnostics, and slide-over trace drawer.'
      }
    ],
    humanApproval: {
      required: true,
      status: 'PENDING',
      requestedAt: '2026-10-31T16:10:00.000Z',
      targetBranch: 'main'
    },
    createdAt: '2026-10-31T16:10:00.000Z',
    updatedAt: '2026-10-31T16:10:03.000Z'
  }
];

const mergedTasks = [...additionalTasks, ...baseTasks];
fs.writeFileSync(hiveTasksPath, JSON.stringify(mergedTasks, null, 2), 'utf8');
fs.writeFileSync(webTasksPath, JSON.stringify(mergedTasks, null, 2), 'utf8');
console.log(`Successfully synced ${mergedTasks.length} tasks to ${hiveTasksPath} and ${webTasksPath}`);
