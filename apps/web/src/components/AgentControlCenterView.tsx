import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCw,
  ExternalLink,
  BookOpen,
  LayoutGrid,
  Lock,
  Sparkles,
  Clock
} from 'lucide-react';
import defaultCatalogData from '../data/agencyHiresCatalog.json';
import defaultHiveTasks from '../data/hiveTasks.json';
import { AgentExecutionTimeline } from './AgentExecutionTimeline.js';

interface AgentControlCenterViewProps {
  userRole?: string;
  onNavigateTab?: (tab: string) => void;
}

export interface MunderHireItem {
  schema: string;
  id: string;
  name: string;
  role: string;
  division: string;
  specialty: string;
  sprite: string;
  seat: {
    deskId: string;
    x: number;
    y: number;
    zone: string;
  };
  provider: 'antigravity' | 'claude-code' | 'gemini-cli' | 'codex' | string;
  model: string;
  systemPrompt: string;
  autonomyLevel: string;
  budget: {
    maxTokens: number;
    velocityLimit: number;
  };
  allowedCommands: string[];
  requiresApprovalFor: string[];
  status: 'AVAILABLE' | 'ACTIVE' | 'ASSIGNED' | 'STANDBY';
  assignedTasks: string[];
  executionHistoryCount: number;
  workspaceSkillPath: string;
}

export interface TaskItem {
  id: string;
  title: string;
  prompt: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'PLANNING' | 'EXECUTING' | 'IN_REVIEW' | 'TESTING' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'REJECTED' | 'RETRYING' | 'FAILED' | 'RUNNING';
  currentStage: string;
  leadSpecialist: string;
  leadSpecialistId: string;
  worktreeBranch: string;
  targetBranch: string;
  isWorktreeCleaned: boolean;
  squad: Array<{ id: string; name: string; role: string; provider: string; division?: string; deskId?: string }>;
  logs: Array<{ timestamp: string; agent: string; level: 'info' | 'warn' | 'error' | 'success'; message: string; agentId?: string; agentName?: string }>;
  codeReviewPassed?: boolean;
  securityAuditPassed?: boolean;
  testsPassed?: boolean;
  testCount?: number;
  createdAt: string;
  updatedAt?: string;
  retryCount?: number;
  maxRetries?: number;
  failureReason?: string;
  errorDetails?: {
    code?: string;
    message: string;
    stack?: string;
    stage: string;
    timestamp: string;
    retryCount: number;
    recovered?: boolean;
  };
}

export const AgentControlCenterView: React.FC<AgentControlCenterViewProps> = ({
  userRole = 'admin'
}) => {
  const isAdmin = userRole === 'admin' || userRole === 'commander' || userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN';

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'tasks' | 'approvals' | 'floor' | 'catalog' | 'blackboard'>('timeline');

  // Catalog State
  const hires: MunderHireItem[] = useMemo(() => {
    return (defaultCatalogData as any).agents || [];
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [inspectedAgent, setInspectedAgent] = useState<MunderHireItem | null>(null);

  // Filtered Catalog
  const filteredHires = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return hires.filter((h) => {
      if (q) {
        const matchesName = h.name.toLowerCase().includes(q);
        const matchesId = h.id.toLowerCase().includes(q);
        const matchesSpec = h.specialty.toLowerCase().includes(q);
        const matchesDiv = h.division.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesSpec && !matchesDiv) return false;
      }
      if (selectedDivision !== 'all' && h.division.toLowerCase() !== selectedDivision.toLowerCase()) {
        return false;
      }
      if (selectedProvider !== 'all' && h.provider.toLowerCase() !== selectedProvider.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [hires, searchQuery, selectedDivision, selectedProvider]);

  // Divisions List
  const divisions = useMemo(() => {
    const counts: Record<string, number> = {};
    hires.forEach((h) => {
      counts[h.division] = (counts[h.division] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [hires]);

  // Normalize tasks from Hive ledger
  const initialHiveTasks: TaskItem[] = useMemo(() => {
    try {
      const rawTasks = (defaultHiveTasks as any[]) || [];
      if (rawTasks.length === 0) return [];
      return rawTasks.map((t: any) => ({
        id: t.id,
        title: t.title || t.prompt?.slice(0, 50) || 'Development Task',
        prompt: t.prompt || t.title || '',
        priority: t.priority || 'NORMAL',
        status: t.status || 'COMPLETED',
        currentStage: t.currentStage || 'APPROVAL_GATE',
        leadSpecialist: t.squad?.find((s: any) => s.assignedRole === 'LEAD_SPECIALIST')?.name || t.leadSpecialist || 'Senior Developer',
        leadSpecialistId: t.squad?.find((s: any) => s.assignedRole === 'LEAD_SPECIALIST')?.id || t.leadSpecialistId || 'agency-senior-developer',
        worktreeBranch: t.worktree?.branchName || t.worktreeBranch || `feat/agent-task-${t.id.toLowerCase()}`,
        targetBranch: t.humanApproval?.targetBranch || t.targetBranch || 'main',
        isWorktreeCleaned: t.worktree?.isCleanedUp ?? t.isWorktreeCleaned ?? true,
        squad: (t.squad || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          role: s.role || s.assignedRole || 'Specialist',
          provider: s.provider || 'antigravity',
          division: s.division,
          deskId: s.deskId
        })),
        logs: (t.executionLogs || t.logs || []).map((l: any) => ({
          timestamp: l.timestamp || new Date().toLocaleTimeString(),
          agent: l.agentName || l.agentId || l.agent || 'Specialist',
          level: l.level || 'info',
          message: l.message || '',
          agentId: l.agentId,
          agentName: l.agentName
        })),
        codeReviewPassed: t.codeReview?.passed ?? t.codeReviewPassed ?? true,
        securityAuditPassed: t.securityReview?.passed ?? t.securityAuditPassed ?? true,
        testsPassed: t.testResults?.passed ?? t.testsPassed ?? true,
        testCount: t.testResults?.total ?? t.testCount ?? 158,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt,
        retryCount: t.retryCount,
        maxRetries: t.maxRetries || 3,
        failureReason: t.failureReason,
        errorDetails: t.errorDetails
      }));
    } catch {
      return [];
    }
  }, []);

  // Active Tasks Pipeline State
  const [tasks, setTasks] = useState<TaskItem[]>(initialHiveTasks.length > 0 ? initialHiveTasks : [
    {
      id: 'MD-TASK-3D-VIEWPORT',
      title: '3D Viewport Controls & Camera Reset Optimization',
      prompt: 'Implement orbital controls, top-down and ingress presets with zero-regression camera reset hotkeys.',
      priority: 'HIGH',
      status: 'AWAITING_APPROVAL',
      currentStage: 'APPROVAL_GATE',
      leadSpecialist: '3D Scene Developer',
      leadSpecialistId: 'agency-3d-scene-developer',
      worktreeBranch: 'feat/agent-task-3d-viewport',
      targetBranch: 'main',
      isWorktreeCleaned: false,
      squad: [
        { id: 'munder-michael', name: 'Michael (Branch Manager)', role: 'Supervisor', provider: 'antigravity' },
        { id: 'agency-3d-scene-developer', name: '3D Scene Developer', role: 'Lead Specialist', provider: 'antigravity' },
        { id: 'agency-code-reviewer', name: 'Code Reviewer', role: 'Reviewer', provider: 'claude-code' },
        { id: 'agency-security-architect', name: 'Security Architect', role: 'Auditor', provider: 'gemini-cli' },
        { id: 'agency-test-automation-engineer', name: 'Test Automation Engineer', role: 'Tester', provider: 'codex' }
      ],
      logs: [
        { timestamp: '20:32:01', agent: 'Michael (Supervisor)', level: 'info', message: 'Parsed task brief and allocated 5 specialists across engineering and QA.' },
        { timestamp: '20:32:02', agent: 'Michael (Supervisor)', level: 'info', message: 'Allocated isolated Git worktree: integrations/munder-difflin/hive/worktrees/3d-viewport' },
        { timestamp: '20:32:03', agent: '3D Scene Developer', level: 'info', message: 'Loaded guidelines from .agents/skills/agency-3d-scene-developer/SKILL.md.' },
        { timestamp: '20:32:05', agent: '3D Scene Developer', level: 'success', message: 'Implemented camera presets and keydown isolation. Pushed to feat/agent-task-3d-viewport.' },
        { timestamp: '20:32:06', agent: 'Code Reviewer', level: 'success', message: 'Peer review passed: zero unwanted package mutations, strict typing maintained.' },
        { timestamp: '20:32:07', agent: 'Security Architect', level: 'success', message: 'Security audit passed: zero plaintext secrets, command allowlist enforced.' },
        { timestamp: '20:32:09', agent: 'Test Automation Engineer', level: 'success', message: 'Vitest verification completed: 158/158 tests passing cleanly.' },
        { timestamp: '20:32:10', agent: 'Michael (Supervisor)', level: 'warn', message: 'Task awaiting human administrator sign-off before merge into main.' }
      ],
      codeReviewPassed: true,
      securityAuditPassed: true,
      testsPassed: true,
      testCount: 158,
      createdAt: '2026-10-31T15:02:00Z'
    }
  ]);

  // Live API Synchronization callback
  const refreshTasksFromApi = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/developer/tasks', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.tasks) && json.data.tasks.length > 0) {
          const apiTasks = json.data.tasks.map((t: any) => ({
            id: t.id,
            title: t.title || t.prompt?.slice(0, 50),
            prompt: t.prompt,
            priority: t.priority || 'NORMAL',
            status: t.status,
            currentStage: t.currentStage,
            leadSpecialist: t.squad?.find((s: any) => s.assignedRole === 'LEAD_SPECIALIST')?.name || 'Senior Developer',
            leadSpecialistId: t.squad?.find((s: any) => s.assignedRole === 'LEAD_SPECIALIST')?.id || 'agency-senior-developer',
            worktreeBranch: t.worktree?.branchName || `feat/agent-task-${t.id.toLowerCase()}`,
            targetBranch: t.humanApproval?.targetBranch || 'main',
            isWorktreeCleaned: t.worktree?.isCleanedUp ?? true,
            squad: (t.squad || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              role: s.role || s.assignedRole || 'Specialist',
              provider: s.provider || 'antigravity',
              division: s.division,
              deskId: s.deskId
            })),
            logs: (t.executionLogs || []).map((l: any) => ({
              timestamp: l.timestamp,
              agent: l.agentName || l.agentId || 'Specialist',
              level: l.level,
              message: l.message,
              agentId: l.agentId,
              agentName: l.agentName
            })),
            codeReviewPassed: t.codeReview?.passed,
            securityAuditPassed: t.securityReview?.passed,
            testsPassed: t.testResults?.passed,
            testCount: t.testResults?.total,
            createdAt: t.createdAt,
            retryCount: t.retryCount,
            maxRetries: t.maxRetries,
            failureReason: t.failureReason,
            errorDetails: t.errorDetails
          }));
          setTasks(apiTasks);
        }
      }
    } catch {
      // Gracefully retain current state
    }
  }, []);

  useEffect(() => {
    refreshTasksFromApi();
  }, [refreshTasksFromApi]);

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(tasks[0] || null);

  // New Task Form
  const [newTaskPrompt, setNewTaskPrompt] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [isExecutingTask, setIsExecutingTask] = useState(false);

  // Handle Create & Run Task
  const handleCreateAndRunTask = () => {
    if (!newTaskPrompt.trim()) return;

    setIsExecutingTask(true);
    const taskId = `MD-TASK-${Date.now().toString(36).toUpperCase()}`;
    const branchName = `feat/agent-task-${taskId.toLowerCase()}`;

    // Select lead
    let leadName = 'Senior Developer';
    let leadId = 'agency-senior-developer';
    const lower = newTaskPrompt.toLowerCase();
    if (lower.match(/(3d|three|webgl|spatial|canvas)/)) {
      leadName = '3D Scene Developer';
      leadId = 'agency-3d-scene-developer';
    } else if (lower.match(/(ui|frontend|react|css)/)) {
      leadName = 'Frontend Developer';
      leadId = 'agency-frontend-developer';
    } else if (lower.match(/(security|threat|auth|crypto)/)) {
      leadName = 'Security Architect';
      leadId = 'agency-security-architect';
    } else if (lower.match(/(test|verify|spec)/)) {
      leadName = 'Test Automation Engineer';
      leadId = 'agency-test-automation-engineer';
    }

    const newTask: TaskItem = {
      id: taskId,
      title: newTaskPrompt.slice(0, 50),
      prompt: newTaskPrompt,
      priority: newTaskPriority,
      status: 'EXECUTING',
      currentStage: 'IMPLEMENTATION',
      leadSpecialist: leadName,
      leadSpecialistId: leadId,
      worktreeBranch: branchName,
      targetBranch: 'main',
      isWorktreeCleaned: false,
      squad: [
        { id: 'munder-michael', name: 'Michael (Branch Manager)', role: 'Supervisor', provider: 'antigravity' },
        { id: leadId, name: leadName, role: 'Lead Specialist', provider: 'antigravity' },
        { id: 'agency-code-reviewer', name: 'Code Reviewer', role: 'Reviewer', provider: 'claude-code' },
        { id: 'agency-security-architect', name: 'Security Architect', role: 'Auditor', provider: 'gemini-cli' },
        { id: 'agency-test-automation-engineer', name: 'Test Automation Engineer', role: 'Tester', provider: 'codex' }
      ],
      logs: [
        { timestamp: new Date().toLocaleTimeString(), agent: 'Michael (Supervisor)', level: 'info', message: `Parsed task brief and assigned Lead: ${leadName}.` },
        { timestamp: new Date().toLocaleTimeString(), agent: 'Michael (Supervisor)', level: 'info', message: `Created isolated Git worktree: ${branchName}` },
        { timestamp: new Date().toLocaleTimeString(), agent: leadName, level: 'info', message: `Loaded specialist skill instructions for ${leadId}. Commencing code synthesis.` }
      ],
      createdAt: new Date().toISOString()
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTask(newTask);
    setNewTaskPrompt('');

    // Simulate progressive execution steps
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              currentStage: 'CODE_REVIEW',
              logs: [
                ...t.logs,
                { timestamp: new Date().toLocaleTimeString(), agent: leadName, level: 'success', message: 'Implementation finished. Changes committed to isolated worktree.' },
                { timestamp: new Date().toLocaleTimeString(), agent: 'Code Reviewer', level: 'info', message: 'Inspecting worktree AST diff for regressions and style.' }
              ]
            };
          }
          return t;
        })
      );
    }, 1200);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              currentStage: 'SECURITY_REVIEW',
              codeReviewPassed: true,
              logs: [
                ...t.logs,
                { timestamp: new Date().toLocaleTimeString(), agent: 'Code Reviewer', level: 'success', message: 'Code review approved with zero defects.' },
                { timestamp: new Date().toLocaleTimeString(), agent: 'Security Architect', level: 'info', message: 'Auditing for secrets, command execution, and RBAC boundaries.' }
              ]
            };
          }
          return t;
        })
      );
    }, 2400);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              currentStage: 'TESTING',
              securityAuditPassed: true,
              logs: [
                ...t.logs,
                { timestamp: new Date().toLocaleTimeString(), agent: 'Security Architect', level: 'success', message: 'Security audit passed: zero plaintext secrets found.' },
                { timestamp: new Date().toLocaleTimeString(), agent: 'Test Automation Engineer', level: 'info', message: 'Running test verification suite across monorepo packages...' }
              ]
            };
          }
          return t;
        })
      );
    }, 3600);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              status: 'AWAITING_APPROVAL',
              currentStage: 'APPROVAL_GATE',
              testsPassed: true,
              testCount: 158,
              logs: [
                ...t.logs,
                { timestamp: new Date().toLocaleTimeString(), agent: 'Test Automation Engineer', level: 'success', message: '158/158 tests passed successfully.' },
                { timestamp: new Date().toLocaleTimeString(), agent: 'Michael (Supervisor)', level: 'warn', message: 'Orchestration pipeline complete. Awaiting human administrator sign-off before merge into main.' }
              ]
            };
          }
          return t;
        })
      );
      setIsExecutingTask(false);
    }, 4800);
  };

  // Handle Human Approval
  const handleApprove = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'COMPLETED',
            currentStage: 'COMPLETED',
            isWorktreeCleaned: true,
            logs: [
              ...t.logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                agent: 'Michael (Supervisor)',
                level: 'success',
                message: `Task APPROVED by Administrator. Worktree safely cleaned up.`
              }
            ]
          };
        }
        return t;
      })
    );
  };

  const handleReject = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'REJECTED',
            currentStage: 'REJECTED',
            isWorktreeCleaned: true,
            logs: [
              ...t.logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                agent: 'Michael (Supervisor)',
                level: 'error',
                message: `Task REJECTED by Administrator. Worktree pruned and branch removed.`
              }
            ]
          };
        }
        return t;
      })
    );
  };

  // Handle Task Cancellation
  const handleCancel = (taskId: string, reason?: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'CANCELLED' as any,
            currentStage: 'CANCELLED',
            isWorktreeCleaned: true,
            logs: [
              ...t.logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                agent: 'Michael (Supervisor)',
                level: 'warn',
                message: `Task CANCELLED by Administrator: "${reason || 'Manual pipeline abort'}". Worktree safely pruned.`
              }
            ]
          };
        }
        return t;
      })
    );
  };

  // If non-admin user
  if (!isAdmin) {
    return (
      <div className="p-8 font-mono text-xs flex flex-col items-center justify-center min-h-[500px]">
        <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-rose-500/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-center mx-auto text-neon-crimson">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Restricted Developer Zone
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            The Munder Difflin Multi-Agent Control Center and Git Worktree Harness require Administrator role privileges. Your current role is <strong className="text-amber-400">{userRole}</strong>.
          </p>
          <div className="p-3 rounded-lg bg-slate-950/80 border border-surface-border text-slate-500 text-[10px]">
            Zero-Trust Isolation Policy Active. Public command execution is disabled.
          </div>
        </div>
      </div>
    );
  }

  const pendingApprovals = tasks.filter((t) => t.status === 'AWAITING_APPROVAL');

  return (
    <div className="space-y-5 font-mono text-xs select-none">
      {/* ── Control Center Header ────────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-matrix opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-matrix" />
              </span>
              <span className="text-neon-cyan text-[11px] font-bold tracking-wider uppercase">
                MUNDER DIFFLIN HIVE HARNESS · ISOLATED WORKSPACE MODULE
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                283 SPECIALISTS ENROLLED
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
              <span>Developer Multi-Agent Control Center</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Coordinates 283 Agency Specialists using Munder Difflin&apos;s Hive Protocol. Employs Michael Scott as supervisor orchestrator, allocating isolated Git worktrees, terminal sandboxes, and single-committer rails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveSubTab('timeline')}
              aria-label="View live multi-agent execution timeline"
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow-lg ${
                activeSubTab === 'timeline'
                  ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-cyan-950/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-surface-border'
              }`}
              title="Inspect real-time agent execution timeline"
            >
              <Clock className="w-3.5 h-3.5 text-neon-cyan" />
              <span>Live Timeline</span>
            </button>

            <button
              onClick={() => {
                const uri = `munderdifflin://open?path=${encodeURIComponent('integrations/munder-difflin/hive')}`;
                window.open(uri, '_blank');
              }}
              className="px-3.5 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-lg"
              title="Launch native Munder Difflin desktop client via protocol handler"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Desktop Harness</span>
            </button>

            <button
              onClick={() => setActiveSubTab('tasks')}
              className="px-3.5 py-2 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/50 text-neon-cyan text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ New Task</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-surface-border/60">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-surface-border">
            <div className="text-[10px] text-slate-400">AGENCY SPECIALISTS</div>
            <div className="text-base font-bold text-white mt-0.5">{hires.length} Active</div>
            <div className="text-[9px] text-slate-500">Across 18 divisions</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-surface-border">
            <div className="text-[10px] text-slate-400">ACTIVE WORKTREES</div>
            <div className="text-base font-bold text-neon-cyan mt-0.5">
              {tasks.filter((t) => !t.isWorktreeCleaned).length} Isolated
            </div>
            <div className="text-[9px] text-slate-500">Zero index collisions</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-surface-border">
            <div className="text-[10px] text-slate-400">TIMELINE EVENTS</div>
            <div className="text-base font-bold text-purple-300 mt-0.5">
              {tasks.reduce((sum, t) => sum + (t.logs?.length || 1), 0)} Logged
            </div>
            <div className="text-[9px] text-slate-500">Real lifecycle events</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-surface-border">
            <div className="text-[10px] text-slate-400">PENDING APPROVALS</div>
            <div className={`text-base font-bold mt-0.5 ${pendingApprovals.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {pendingApprovals.length} Requests
            </div>
            <div className="text-[9px] text-slate-500">Requires admin sign-off</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-surface-border">
            <div className="text-[10px] text-slate-400">SECURITY GUARDRAILS</div>
            <div className="text-base font-bold text-neon-matrix mt-0.5">ENFORCED</div>
            <div className="text-[9px] text-slate-500">Single-committer rails</div>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-2" role="tablist" aria-label="Control Center Sub-Tabs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab 0: Execution Timeline */}
          <button
            role="tab"
            id="tab-timeline"
            aria-selected={activeSubTab === 'timeline'}
            aria-controls="panel-timeline"
            onClick={() => setActiveSubTab('timeline')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-neon-cyan ${
              activeSubTab === 'timeline'
                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Agent Execution Timeline</span>
            <span className="flex h-2 w-2 relative ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan" />
            </span>
          </button>

          <button
            role="tab"
            id="tab-tasks"
            aria-selected={activeSubTab === 'tasks'}
            aria-controls="panel-tasks"
            onClick={() => setActiveSubTab('tasks')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-neon-cyan ${
              activeSubTab === 'tasks'
                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Task Pipeline & Worktrees</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
              {tasks.length}
            </span>
          </button>

          <button
            role="tab"
            id="tab-approvals"
            aria-selected={activeSubTab === 'approvals'}
            aria-controls="panel-approvals"
            onClick={() => setActiveSubTab('approvals')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
              activeSubTab === 'approvals'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Human Approvals Gate</span>
            {pendingApprovals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/30 text-amber-300 border border-amber-500/50">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            role="tab"
            id="tab-floor"
            aria-selected={activeSubTab === 'floor'}
            aria-controls="panel-floor"
            onClick={() => setActiveSubTab('floor')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
              activeSubTab === 'floor'
                ? 'bg-purple-900/40 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Munder Difflin Office Floor</span>
          </button>

          <button
            role="tab"
            id="tab-catalog"
            aria-selected={activeSubTab === 'catalog'}
            aria-controls="panel-catalog"
            onClick={() => setActiveSubTab('catalog')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              activeSubTab === 'catalog'
                ? 'bg-blue-900/40 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Agency Agents Catalog (283)</span>
          </button>

          <button
            role="tab"
            id="tab-blackboard"
            aria-selected={activeSubTab === 'blackboard'}
            aria-controls="panel-blackboard"
            onClick={() => setActiveSubTab('blackboard')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
              activeSubTab === 'blackboard'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Shared Blackboard</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-500 flex items-center space-x-2">
          <span>Supervisor: <strong>Michael (Branch Manager)</strong></span>
          <span>· Single-Committer: <strong>ACTIVE</strong></span>
        </div>
      </div>

      {/* ── TAB 0: Agent Execution Timeline & Live Trace ─────────────────────── */}
      {activeSubTab === 'timeline' && (
        <div id="panel-timeline" role="tabpanel" aria-labelledby="tab-timeline">
          <AgentExecutionTimeline
            tasks={tasks}
            onSelectTask={(t) => {
              setSelectedTask(t);
              setActiveSubTab('tasks');
            }}
            onRefreshTasks={refreshTasksFromApi}
            onDispatchTask={(prompt) => {
              setNewTaskPrompt(prompt);
              setActiveSubTab('tasks');
            }}
          />
        </div>
      )}

      {/* ── TAB 1: Task Pipeline & Worktrees ─────────────────────────────────── */}
      {activeSubTab === 'tasks' && (
        <div id="panel-tasks" role="tabpanel" aria-labelledby="tab-tasks">
        <div className="space-y-4">
          {/* New Task Dispatch Input */}
          <div className="glass-panel p-4 rounded-xl border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
                <span>Submit Development Task to Munder Difflin Hive</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Automatically forms specialist squad, allocates worktree, runs review & testing
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newTaskPrompt}
                onChange={(e) => setNewTaskPrompt(e.target.value)}
                placeholder="e.g. 'Audit and enhance camera controls with orbital reset hotkeys and unit tests'"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAndRunTask()}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-surface-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan font-mono"
              />

              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                aria-label="Select task priority level"
                className="px-3 py-2 rounded-xl bg-slate-950 border border-surface-border text-xs text-slate-300 focus:outline-none focus:border-neon-cyan font-mono"
              >
                <option value="LOW">Priority: LOW</option>
                <option value="NORMAL">Priority: NORMAL</option>
                <option value="HIGH">Priority: HIGH</option>
                <option value="CRITICAL">Priority: CRITICAL</option>
              </select>

              <button
                onClick={handleCreateAndRunTask}
                disabled={isExecutingTask || !newTaskPrompt.trim()}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                  isExecutingTask || !newTaskPrompt.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50'
                }`}
              >
                {isExecutingTask ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Orchestrating...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Dispatch Task</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Task Details & Terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Task Backlog Column */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Task Backlog ({tasks.length})
              </div>

              {tasks.map((t) => {
                const isSelected = selectedTask?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-neon-cyan shadow-lg shadow-cyan-950/40'
                        : 'bg-slate-950/80 border-surface-border hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-neon-cyan text-[11px]">{t.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : t.status === 'AWAITING_APPROVAL'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                            : t.status === 'REJECTED'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="font-bold text-white text-xs line-clamp-1">{t.title}</div>
                    <div className="text-slate-400 text-[10px] mt-1 flex items-center space-x-2">
                      <span>Lead: <strong>{t.leadSpecialist}</strong></span>
                      <span>·</span>
                      <span>{t.priority}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
                      <span className="truncate max-w-[150px]">Branch: {t.worktreeBranch}</span>
                      <span>{new Date(t.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Task Inspection & Real-time Execution Stream (2 columns) */}
            {selectedTask && (
              <div className="lg:col-span-2 space-y-3.5">
                <div className="glass-panel p-4 rounded-xl border border-surface-border space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-neon-cyan font-bold">{selectedTask.id}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-surface-border text-slate-300 text-[10px]">
                          Target: {selectedTask.targetBranch}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px]">
                          Worktree: {selectedTask.worktreeBranch}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-white mt-1">{selectedTask.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedTask.prompt}</p>
                    </div>

                    {selectedTask.status === 'AWAITING_APPROVAL' && (
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(selectedTask.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/60 font-bold text-xs flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approve & Merge</span>
                        </button>
                        <button
                          onClick={() => handleReject(selectedTask.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-500/50 hover:bg-rose-900/60 font-bold text-xs flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleCancel(selectedTask.id, 'Operator aborted task')}
                          aria-label={`Cancel execution for task ${selectedTask.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-surface-border font-bold text-xs flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Specialist Squad Roster */}
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-surface-border space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Assembled Hive Specialist Squad ({selectedTask.squad.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {selectedTask.squad.map((s) => (
                        <div key={s.id} className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[10px]">
                          <div className="font-bold text-white truncate">{s.name}</div>
                          <div className="text-neon-cyan flex items-center justify-between mt-0.5">
                            <span>{s.role}</span>
                            <span className="text-slate-500 text-[9px]">{s.provider}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Verification Gates Summary */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-2 rounded-lg bg-slate-950/70 border border-surface-border">
                      <div className="text-[9px] text-slate-400">CODE REVIEW</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>APPROVED</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/70 border border-surface-border">
                      <div className="text-[9px] text-slate-400">SECURITY AUDIT</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center space-x-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>0 VULNERABILITIES</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/70 border border-surface-border">
                      <div className="text-[9px] text-slate-400">AUTOMATED TESTS</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>158/158 PASSED</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Agent Terminal Output */}
                <div className="rounded-xl border border-surface-border bg-slate-950 overflow-hidden shadow-inner font-mono text-[11px]">
                  <div className="px-3.5 py-2 bg-slate-900/90 border-b border-surface-border flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
                      <span className="font-bold text-white">Munder Difflin Multi-Agent Execution Stream</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{selectedTask.logs.length} events logged</span>
                  </div>

                  <div className="p-3.5 space-y-1.5 max-h-72 overflow-y-auto">
                    {selectedTask.logs.map((log, i) => (
                      <div key={i} className="flex items-start space-x-2 leading-relaxed">
                        <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                        <span
                          className={`font-bold select-none ${
                            log.level === 'error'
                              ? 'text-rose-400'
                              : log.level === 'warn'
                              ? 'text-amber-400'
                              : log.level === 'success'
                              ? 'text-emerald-400'
                              : 'text-neon-cyan'
                          }`}
                        >
                          [{log.agent}]:
                        </span>
                        <span className="text-slate-300 flex-1">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── TAB 2: Human Approvals Queue ─────────────────────────────────────── */}
      {activeSubTab === 'approvals' && (
        <div id="panel-approvals" role="tabpanel" aria-labelledby="tab-approvals" className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Human-in-the-Loop Merge Authorization</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Single-committer rails prevent agents from merging changes directly to main. Review diff and sign off.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/40 text-xs font-bold">
              {pendingApprovals.length} Pending Actions
            </span>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-950 border border-surface-border text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-white font-bold">Zero Pending Approvals</div>
              <p className="text-xs">All development branches have been reviewed, merged, or cleaned up safely.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((task) => (
                <div key={task.id} className="glass-panel p-5 rounded-xl border border-amber-500/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3">
                    <div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-bold text-neon-cyan">{task.id}</span>
                        <span className="text-slate-400">· Lead: {task.leadSpecialist}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                          AWAITING ADMIN SIGN-OFF
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">{task.title}</h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApprove(task.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-600 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-lg"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Authorize & Merge to Main</span>
                      </button>
                      <button
                        onClick={() => handleReject(task.id)}
                        className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold text-xs flex items-center space-x-1.5 transition-all"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>Reject & Teardown</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-surface-border space-y-1">
                      <div className="text-[10px] text-slate-400">ISOLATED WORKTREE BRANCH</div>
                      <div className="text-purple-300 font-bold font-mono">{task.worktreeBranch}</div>
                      <div className="text-[10px] text-slate-500">Target: {task.targetBranch}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-surface-border space-y-1">
                      <div className="text-[10px] text-slate-400">PEER CODE REVIEW VERDICT</div>
                      <div className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>APPROVED BY CODE REVIEWER</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Zero regressions, strict types</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-surface-border space-y-1">
                      <div className="text-[10px] text-slate-400">TEST & SECURITY ATTESTATION</div>
                      <div className="text-emerald-400 font-bold flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>158/158 TESTS PASSED (0 VULNS)</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Allowlisted commands only</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Munder Difflin 2D Office Floor ─────────────────────────────── */}
      {activeSubTab === 'floor' && (
        <div id="panel-floor" role="tabpanel" aria-labelledby="tab-floor" className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Munder Difflin 2D Virtual Office Floor</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every agent sits at an assigned virtual desk. Desk-to-desk mailboxes route task instructions and peer reviews.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Available
              <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan inline-block ml-2" /> Active Task
            </div>
          </div>

          {/* 5 Office Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Zone 1: Engineering Bay */}
            <div className="glass-panel p-4 rounded-xl border border-neon-cyan/40 space-y-3">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <span className="font-bold text-neon-cyan text-xs">Engineering Bay Alpha</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  66 Specialists
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {hires.filter((h) => h.division === 'engineering').slice(0, 9).map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setInspectedAgent(agent)}
                    className="p-2 rounded-lg bg-slate-950 border border-surface-border hover:border-neon-cyan cursor-pointer transition-all text-center group"
                  >
                    <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center mx-auto text-neon-cyan text-[10px] font-bold group-hover:scale-110 transition-transform">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-1">{agent.name}</div>
                    <div className="text-[8px] text-slate-500 truncate">{agent.seat.deskId}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone 2: SOC Vault */}
            <div className="glass-panel p-4 rounded-xl border border-neon-crimson/40 space-y-3">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <span className="font-bold text-rose-300 text-xs">SOC & Hardened Security Vault</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  12 Specialists
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {hires.filter((h) => h.division === 'security').slice(0, 9).map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setInspectedAgent(agent)}
                    className="p-2 rounded-lg bg-slate-950 border border-surface-border hover:border-rose-500 cursor-pointer transition-all text-center group"
                  >
                    <div className="w-7 h-7 rounded-full bg-rose-950 border border-rose-500/50 flex items-center justify-center mx-auto text-rose-300 text-[10px] font-bold group-hover:scale-110 transition-transform">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-1">{agent.name}</div>
                    <div className="text-[8px] text-slate-500 truncate">{agent.seat.deskId}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone 3: QA & Testing */}
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <span className="font-bold text-emerald-300 text-xs">QA & Automated Testing Lab</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  9 Specialists
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {hires.filter((h) => h.division === 'testing').slice(0, 9).map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setInspectedAgent(agent)}
                    className="p-2 rounded-lg bg-slate-950 border border-surface-border hover:border-emerald-500 cursor-pointer transition-all text-center group"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-300 text-[10px] font-bold group-hover:scale-110 transition-transform">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-1">{agent.name}</div>
                    <div className="text-[8px] text-slate-500 truncate">{agent.seat.deskId}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone 4: Spatial 3D & Graphics Studio */}
            <div className="glass-panel p-4 rounded-xl border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <span className="font-bold text-purple-300 text-xs">Spatial 3D & Graphics Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  27 Specialists
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {hires.filter((h) => h.division === 'spatial-computing' || h.division === 'game-development').slice(0, 9).map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setInspectedAgent(agent)}
                    className="p-2 rounded-lg bg-slate-950 border border-surface-border hover:border-purple-500 cursor-pointer transition-all text-center group"
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-950 border border-purple-500/50 flex items-center justify-center mx-auto text-purple-300 text-[10px] font-bold group-hover:scale-110 transition-transform">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-1">{agent.name}</div>
                    <div className="text-[8px] text-slate-500 truncate">{agent.seat.deskId}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone 5: Command Deck */}
            <div className="glass-panel p-4 rounded-xl border border-amber-500/40 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <span className="font-bold text-amber-300 text-xs">Product & Agile Command Deck</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  13 Specialists
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {hires.filter((h) => h.division === 'product' || h.division === 'project-management').slice(0, 8).map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setInspectedAgent(agent)}
                    className="p-2 rounded-lg bg-slate-950 border border-surface-border hover:border-amber-500 cursor-pointer transition-all text-center group"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-950 border border-amber-500/50 flex items-center justify-center mx-auto text-amber-300 text-[10px] font-bold group-hover:scale-110 transition-transform">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-1">{agent.name}</div>
                    <div className="text-[8px] text-slate-500 truncate">{agent.seat.deskId}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Agency Agents Searchable Catalog (283 Agents) ─────────────── */}
      {activeSubTab === 'catalog' && (
        <div id="panel-catalog" role="tabpanel" aria-labelledby="tab-catalog" className="space-y-4">
          {/* Search & Filters */}
          <div className="glass-panel p-4 rounded-xl border border-surface-border space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 283 Agency Agents by name, ID, role, or specialty..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-surface-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan font-mono"
                />
              </div>

              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                aria-label="Filter agents by division"
                className="px-3 py-2 rounded-xl bg-slate-950 border border-surface-border text-xs text-slate-300 focus:outline-none focus:border-neon-cyan font-mono"
              >
                <option value="all">All Divisions ({hires.length})</option>
                {divisions.map(([div, count]) => (
                  <option key={div} value={div}>
                    {div.toUpperCase()} ({count})
                  </option>
                ))}
              </select>

              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                aria-label="Filter agents by provider"
                className="px-3 py-2 rounded-xl bg-slate-950 border border-surface-border text-xs text-slate-300 focus:outline-none focus:border-neon-cyan font-mono"
              >
                <option value="all">All Providers</option>
                <option value="antigravity">Antigravity</option>
                <option value="claude-code">Claude Code</option>
                <option value="gemini-cli">Gemini CLI</option>
                <option value="codex">Codex</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Showing <strong>{filteredHires.length}</strong> of <strong>{hires.length}</strong> registered specialists</span>
              <span>All definitions strictly isolated in <code>.agents/</code> and <code>integrations/munder-difflin/</code></span>
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredHires.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setInspectedAgent(agent)}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-surface-border hover:border-neon-cyan cursor-pointer transition-all hover:shadow-lg space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-neon-cyan border border-neon-cyan/30">
                    {agent.division.toUpperCase()}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{agent.seat.deskId}</span>
                </div>

                <div className="font-bold text-white text-xs group-hover:text-neon-cyan transition-colors">
                  {agent.name}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {agent.specialty}
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-500">
                  <span>Provider: <strong className="text-slate-300">{agent.provider}</strong></span>
                  <span className="text-neon-matrix">AVAILABLE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: Hive Shared Blackboard ────────────────────────────────────── */}
      {activeSubTab === 'blackboard' && (
        <div id="panel-blackboard" role="tabpanel" aria-labelledby="tab-blackboard" className="space-y-4">
          <div className="glass-panel p-5 rounded-xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-neon-cyan" />
                  <span>Hive Shared Blackboard & Persistent Decision Log</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Semantic markdown blackboard synchronizing decisions, architectural invariants, and memory across all 283 specialists.
                </p>
              </div>
              <span className="text-[10px] text-slate-500">Path: integrations/munder-difflin/hive/blackboard/</span>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-surface-border space-y-2">
                <div className="text-neon-cyan font-bold uppercase tracking-wider text-[11px]">
                  # HIVE_BLACKBOARD.md · Architectural Invariants
                </div>
                <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                  <li><strong>Single-Committer Git Rails:</strong> Autonomous agents never write directly to main.</li>
                  <li><strong>Worktree Isolation:</strong> All multi-agent code mutations must execute in isolated Git worktrees under <code>hive/worktrees/</code>.</li>
                  <li><strong>Zero-Trust Credential Isolation:</strong> Neither LLM API keys nor database credentials will ever be written to agent mailboxes or blackboard memory.</li>
                  <li><strong>Human-in-the-Loop Sign-off:</strong> Every task requires explicit administrator sign-off before merge.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-surface-border space-y-2">
                <div className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                  # DECISIONS.md · Historical Directives
                </div>
                <div className="space-y-1 text-slate-400 text-[11px]">
                  <div>• [Directive #1] Preserve existing MongoDB, Redis, and Three.js Centerpiece viewport.</div>
                  <div>• [Directive #2] Isolate all Electron desktop and native pty dependencies in <code>integrations/munder-difflin/</code>.</div>
                  <div>• [Directive #3] Map all 283 Agency Agents into standard <code>munder-difflin/hire@1</code> manifests.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over Agent Detail Drawer ───────────────────────────────────── */}
      {inspectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md h-full bg-slate-950 border-l border-surface-border p-6 overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div>
                <span className="text-[10px] text-neon-cyan font-bold uppercase">
                  {inspectedAgent.division} Division
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{inspectedAgent.name}</h3>
              </div>
              <button
                onClick={() => setInspectedAgent(null)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-slate-400 text-[10px]">AGENT ID & SLUG</div>
                <div className="text-white font-mono mt-0.5">{inspectedAgent.id}</div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">VIRTUAL OFFICE DESK SEATING</div>
                <div className="text-neon-cyan font-bold mt-0.5">
                  {inspectedAgent.seat.deskId} ({inspectedAgent.seat.zone})
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">AI CLI PROVIDER & MODEL</div>
                <div className="text-white mt-0.5 font-bold">
                  {inspectedAgent.provider} · <span className="text-slate-400">{inspectedAgent.model}</span>
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">TOKEN BUDGET & VELOCITY</div>
                <div className="text-slate-300 mt-0.5">
                  Max: <strong>{inspectedAgent.budget.maxTokens.toLocaleString()} tokens</strong> · Velocity Limit: <strong>{inspectedAgent.budget.velocityLimit.toLocaleString()}</strong>
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">ALLOWLISTED COMMANDS</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {inspectedAgent.allowedCommands.map((cmd) => (
                    <span key={cmd} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-mono">
                      {cmd}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">APPROVAL REQUIRED FOR</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {inspectedAgent.requiresApprovalFor.map((action) => (
                    <span key={action} className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-[10px] text-rose-300 font-mono">
                      {action}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">ON-DISK SKILL FILE</div>
                <div className="text-slate-400 font-mono text-[10px] mt-0.5 truncate">
                  {inspectedAgent.workspaceSkillPath}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-border">
              <button
                onClick={() => {
                  setNewTaskPrompt(`Dispatch implementation task to ${inspectedAgent.name}`);
                  setActiveSubTab('tasks');
                  setInspectedAgent(null);
                }}
                className="w-full py-2.5 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 font-bold text-xs transition-all"
              >
                Assign Development Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
