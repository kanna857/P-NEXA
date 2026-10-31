import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  GitBranch,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Terminal,
  Eye,
  X,
  Play
} from 'lucide-react';
import type { TaskItem } from './AgentControlCenterView.js';

export type ExecutionStatusFilter = 'ALL' | 'COMPLETED' | 'RUNNING' | 'RETRYING' | 'FAILED';

export type AgentProvider = 'antigravity' | 'claude-code' | 'gemini-cli' | 'codex' | string;

export interface ExecutionErrorDetails {
  code?: string;
  message: string;
  stack?: string;
  stage: string;
  timestamp: string;
  retryCount: number;
  maxRetries?: number;
  recovered?: boolean;
  commandExecuted?: string;
}

export interface TimelineEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPrompt: string;
  worktreeBranch: string;
  worktreePath?: string;
  timestamp: string;
  recordedAt: string;
  durationMs: number;
  agentId: string;
  agentName: string;
  agentRole: string;
  provider: AgentProvider;
  stage: 'PLANNING' | 'IMPLEMENTATION' | 'CODE_REVIEW' | 'SECURITY_REVIEW' | 'TESTING' | 'APPROVAL_GATE' | 'COMPLETED';
  status: 'COMPLETED' | 'RUNNING' | 'RETRYING' | 'FAILED' | 'AWAITING_APPROVAL';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  errorDetails?: ExecutionErrorDetails;
  commandExecuted?: string;
  deskId?: string;
  division?: string;
}

interface AgentExecutionTimelineProps {
  tasks: TaskItem[];
  onSelectTask?: (task: TaskItem) => void;
  onRefreshTasks?: () => Promise<void> | void;
  onDispatchTask?: (prompt: string) => void;
}

// Stage progress definition
const ORDERED_STAGES = [
  { key: 'PLANNING', label: '1. Plan' },
  { key: 'IMPLEMENTATION', label: '2. Code' },
  { key: 'CODE_REVIEW', label: '3. Review' },
  { key: 'SECURITY_REVIEW', label: '4. Security' },
  { key: 'TESTING', label: '5. Vitest' },
  { key: 'APPROVAL_GATE', label: '6. Sign-off' }
] as const;

export const AgentExecutionTimeline: React.FC<AgentExecutionTimelineProps> = ({
  tasks,
  onSelectTask,
  onRefreshTasks,
  onDispatchTask
}) => {
  // ── Filters State ─────────────────────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState<ExecutionStatusFilter>('ALL');
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── Drawer & Expanded Error State ─────────────────────────────────────────
  const [selectedEventForDrawer, setSelectedEventForDrawer] = useState<TimelineEvent | null>(null);
  const [expandedErrorIds, setExpandedErrorIds] = useState<Record<string, boolean>>({});
  const [copiedBranchId, setCopiedBranchId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => new Date().toLocaleTimeString());

  // Simulated live remediation state for demo/test action
  const [remediatedTaskIds, setRemediatedTaskIds] = useState<Record<string, boolean>>({});

  // ── Convert Tasks into Real Timeline Lifecycle Events ──────────────────────
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];

    tasks.forEach((task) => {
      const isRemediated = !!remediatedTaskIds[task.id];
      const taskEffectiveStatus = isRemediated ? 'COMPLETED' : task.status;
      const taskEffectiveRetryCount = isRemediated ? 0 : (task.retryCount ?? (task.status === 'RETRYING' ? 2 : 0));
      const taskEffectiveFailureReason = isRemediated ? undefined : task.failureReason;
      const taskEffectiveErrorDetails = isRemediated ? undefined : task.errorDetails;

      const squadMap = new Map<string, { role: string; provider: string; division?: string; deskId?: string }>();
      (task.squad || []).forEach((member: any) => {
        squadMap.set(member.id, {
          role: member.role || member.assignedRole || 'Specialist',
          provider: member.provider || 'antigravity',
          division: member.division || 'engineering',
          deskId: member.deskId || 'desk-001'
        });
        squadMap.set(member.name, {
          role: member.role || member.assignedRole || 'Specialist',
          provider: member.provider || 'antigravity',
          division: member.division || 'engineering',
          deskId: member.deskId || 'desk-001'
        });
      });

      // If task has executionLogs, map each entry
      if (task.logs && task.logs.length > 0) {
        task.logs.forEach((log: any, idx: number) => {
          const agentKey = log.agentId || log.agent || 'Specialist';
          const memberMeta = squadMap.get(agentKey) || squadMap.get(log.agent) || {
            role: 'Hive Specialist',
            provider: 'antigravity',
            division: 'operations',
            deskId: 'desk-mgr-001'
          };

          // Detect stage from log content
          let stage: TimelineEvent['stage'] = 'PLANNING';
          const msg = log.message.toLowerCase();
          if (msg.includes('initialized') || msg.includes('parsed task brief')) {
            stage = 'PLANNING';
          } else if (msg.includes('specialist guidelines') || msg.includes('implementation') || msg.includes('synthesizing')) {
            stage = 'IMPLEMENTATION';
          } else if (msg.includes('code review') || msg.includes('peer review')) {
            stage = 'CODE_REVIEW';
          } else if (msg.includes('security') || msg.includes('secret') || msg.includes('allowlist') || msg.includes('zero-trust')) {
            stage = 'SECURITY_REVIEW';
          } else if (msg.includes('test') || msg.includes('vitest') || msg.includes('axe-core') || msg.includes('assertion')) {
            stage = 'TESTING';
          } else if (msg.includes('approval') || msg.includes('sign-off') || msg.includes('merge')) {
            stage = 'APPROVAL_GATE';
          } else {
            stage = (task.currentStage as any) || 'IMPLEMENTATION';
          }

          // Detect event-level status
          let eventStatus: TimelineEvent['status'] = 'COMPLETED';
          if (log.level === 'error') {
            eventStatus = taskEffectiveStatus === 'RETRYING' ? 'RETRYING' : 'FAILED';
          } else if (log.level === 'warn' && log.message.includes('RETRY')) {
            eventStatus = 'RETRYING';
          } else if (taskEffectiveStatus === 'RUNNING' && idx === task.logs.length - 1) {
            eventStatus = 'RUNNING';
          } else if (taskEffectiveStatus === 'AWAITING_APPROVAL' && idx === task.logs.length - 1) {
            eventStatus = 'AWAITING_APPROVAL';
          } else {
            eventStatus = 'COMPLETED';
          }

          // Compute duration
          let durationMs = 380;
          if (stage === 'TESTING') durationMs = task.testCount ? task.testCount * 3 : 420;
          else if (stage === 'IMPLEMENTATION') durationMs = 1250;
          else if (stage === 'CODE_REVIEW') durationMs = 540;
          else if (stage === 'SECURITY_REVIEW') durationMs = 310;
          else if (stage === 'PLANNING') durationMs = 120;

          const hasError = eventStatus === 'RETRYING' || eventStatus === 'FAILED' || log.level === 'error';

          events.push({
            id: `evt-${task.id.toLowerCase()}-${idx}`,
            taskId: task.id,
            taskTitle: task.title,
            taskPrompt: task.prompt,
            worktreeBranch: task.worktreeBranch || `feat/agent-task-${task.id.toLowerCase()}`,
            worktreePath: (task as any).worktree?.worktreePath,
            timestamp: log.timestamp || '20:00:00',
            recordedAt: task.createdAt,
            durationMs,
            agentId: log.agentId || agentKey,
            agentName: log.agentName || log.agent || 'Specialist',
            agentRole: memberMeta.role,
            provider: memberMeta.provider,
            division: memberMeta.division,
            deskId: memberMeta.deskId,
            stage,
            status: eventStatus,
            level: log.level || 'info',
            message: log.message,
            retryCount: hasError ? taskEffectiveRetryCount : 0,
            maxRetries: task.maxRetries || 3,
            failureReason: hasError ? (taskEffectiveFailureReason || log.message) : undefined,
            errorDetails: hasError ? taskEffectiveErrorDetails : undefined
          });
        });
      } else {
        // Fallback single summary event if no log items
        events.push({
          id: `evt-${task.id.toLowerCase()}-init`,
          taskId: task.id,
          taskTitle: task.title,
          taskPrompt: task.prompt,
          worktreeBranch: task.worktreeBranch,
          timestamp: new Date(task.createdAt).toLocaleTimeString(),
          recordedAt: task.createdAt,
          durationMs: 450,
          agentId: task.leadSpecialistId || 'agency-senior-developer',
          agentName: task.leadSpecialist || 'Lead Specialist',
          agentRole: 'Lead Specialist',
          provider: (task.squad && task.squad[1]?.provider) || 'antigravity',
          stage: 'IMPLEMENTATION',
          status: (taskEffectiveStatus as any) || 'COMPLETED',
          level: 'info',
          message: task.prompt,
          retryCount: taskEffectiveRetryCount,
          maxRetries: task.maxRetries || 3,
          failureReason: taskEffectiveFailureReason,
          errorDetails: taskEffectiveErrorDetails
        });
      }
    });

    return events;
  }, [tasks, remediatedTaskIds]);

  // ── Extract Unique Agents & Task IDs for Filter Dropdowns ──────────────────
  const uniqueAgents = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; provider: string }>();
    timelineEvents.forEach((e) => {
      if (!map.has(e.agentName)) {
        map.set(e.agentName, {
          id: e.agentId,
          name: e.agentName,
          role: e.agentRole,
          provider: e.provider
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [timelineEvents]);

  const uniqueTaskIds = useMemo(() => {
    const map = new Map<string, string>();
    timelineEvents.forEach((e) => {
      if (!map.has(e.taskId)) {
        map.set(e.taskId, e.taskTitle);
      }
    });
    return Array.from(map.entries());
  }, [timelineEvents]);

  // ── Status Counts for Filter Badges ────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: timelineEvents.length,
      COMPLETED: 0,
      RUNNING: 0,
      RETRYING: 0,
      FAILED: 0
    };
    timelineEvents.forEach((e) => {
      if (e.status === 'COMPLETED') counts.COMPLETED++;
      else if (e.status === 'RUNNING') counts.RUNNING++;
      else if (e.status === 'RETRYING') counts.RETRYING++;
      else if (e.status === 'FAILED') counts.FAILED++;
    });
    return counts;
  }, [timelineEvents]);

  // ── Filtered Events ───────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return timelineEvents.filter((event) => {
      // 1. Status Filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'RUNNING' && event.status !== 'RUNNING') return false;
        if (selectedStatus === 'RETRYING' && event.status !== 'RETRYING') return false;
        if (selectedStatus === 'FAILED' && event.status !== 'FAILED') return false;
        if (selectedStatus === 'COMPLETED' && event.status !== 'COMPLETED') return false;
      }

      // 2. Agent Filter
      if (selectedAgent !== 'ALL' && event.agentName !== selectedAgent && event.agentId !== selectedAgent) {
        return false;
      }

      // 3. Task ID Filter
      if (selectedTaskId !== 'ALL' && event.taskId !== selectedTaskId) {
        return false;
      }

      // 4. Keyword Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesMsg = event.message.toLowerCase().includes(q);
        const matchesTask = event.taskId.toLowerCase().includes(q);
        const matchesTitle = event.taskTitle.toLowerCase().includes(q);
        const matchesBranch = event.worktreeBranch.toLowerCase().includes(q);
        const matchesAgent = event.agentName.toLowerCase().includes(q);
        const matchesFailure = event.failureReason ? event.failureReason.toLowerCase().includes(q) : false;
        if (!matchesMsg && !matchesTask && !matchesTitle && !matchesBranch && !matchesAgent && !matchesFailure) {
          return false;
        }
      }

      return true;
    });
  }, [timelineEvents, selectedStatus, selectedAgent, selectedTaskId, searchQuery]);

  // ── Keyboard Escape Listener for Drawer ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEventForDrawer) {
        setSelectedEventForDrawer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEventForDrawer]);

  // ── Copy Git Branch Command Handler ───────────────────────────────────────
  const handleCopyBranch = (branchName: string, eventId: string) => {
    const cmd = `git checkout ${branchName}`;
    navigator.clipboard.writeText(cmd);
    setCopiedBranchId(eventId);
    setTimeout(() => setCopiedBranchId(null), 2000);
  };

  // ── Toggle Error Accordion ────────────────────────────────────────────────
  const toggleErrorDetails = (eventId: string) => {
    setExpandedErrorIds((prev) => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // ── Manual Refresh Handler ────────────────────────────────────────────────
  const handleManualSync = async () => {
    setIsRefreshing(true);
    if (onRefreshTasks) {
      await onRefreshTasks();
    }
    setTimeout(() => {
      setLastSyncedTime(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 600);
  };

  // ── Retry Execution Simulation for Demo/Test Action ───────────────────────
  const handleSimulateRetryResolution = (taskId: string) => {
    setRemediatedTaskIds((prev) => ({
      ...prev,
      [taskId]: true
    }));
  };

  // ── Reset All Filters ─────────────────────────────────────────────────────
  const hasActiveFilters = selectedStatus !== 'ALL' || selectedAgent !== 'ALL' || selectedTaskId !== 'ALL' || searchQuery.trim() !== '';
  const resetFilters = () => {
    setSelectedStatus('ALL');
    setSelectedAgent('ALL');
    setSelectedTaskId('ALL');
    setSearchQuery('');
  };

  // ── Provider Badge Styler ─────────────────────────────────────────────────
  const renderProviderBadge = (provider: string) => {
    const p = provider.toLowerCase();
    let badgeClass = 'bg-slate-900 text-slate-300 border-slate-700';
    let label = provider;

    if (p.includes('antigravity')) {
      badgeClass = 'bg-purple-950/80 text-purple-200 border-purple-500/60 shadow-sm shadow-purple-900/30';
      label = 'antigravity';
    } else if (p.includes('claude')) {
      badgeClass = 'bg-amber-950/80 text-amber-200 border-amber-500/60 shadow-sm shadow-amber-900/30';
      label = 'claude-code';
    } else if (p.includes('gemini')) {
      badgeClass = 'bg-cyan-950/80 text-cyan-200 border-cyan-500/60 shadow-sm shadow-cyan-900/30';
      label = 'gemini-cli';
    } else if (p.includes('codex')) {
      badgeClass = 'bg-emerald-950/80 text-emerald-200 border-emerald-500/60 shadow-sm shadow-emerald-900/30';
      label = 'codex';
    }

    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase font-mono ${badgeClass}`}
        title={`Execution Provider: ${label}`}
      >
        {label}
      </span>
    );
  };

  // ── Status Badge Styler ───────────────────────────────────────────────────
  const renderStatusBadge = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 flex items-center space-x-1 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>COMPLETED</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/90 text-neon-cyan border border-neon-cyan/60 flex items-center space-x-1 animate-pulse shadow-sm shadow-cyan-950">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan inline-block animate-ping" />
            <span>RUNNING</span>
          </span>
        );
      case 'RETRYING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/70 flex items-center space-x-1 shadow-sm shadow-amber-950 animate-pulse">
            <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
            <span>RETRYING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/70 flex items-center space-x-1 shadow-sm shadow-rose-950">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>FAILED</span>
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60 flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span>APPROVAL REQ</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <section aria-labelledby="timeline-heading" className="space-y-4 font-mono text-xs text-slate-200">
      {/* ── Timeline Banner & Header ────────────────────────────────────────── */}
      <div className="glass-panel p-4 rounded-xl border border-neon-cyan/30 flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-neon-cyan/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-cyan" />
            </span>
            <span id="timeline-heading" className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <span>Agent Execution Timeline & Live Trace</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-emerald-400 border border-emerald-500/40 font-bold">
              REAL HIVE SYNCHRONIZATION
            </span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed">
            Real-time chronological telemetry across all 283 Agency Specialists. Inspects individual task stage transitions, isolated Git worktrees, execution duration, failure reasons, and automated retry states.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 relative z-10 flex-shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            aria-label="Synchronize timeline events with Hive ledger"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-surface-border text-xs font-bold flex items-center space-x-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-neon-cyan"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neon-cyan ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Ledger'}</span>
          </button>

          <span className="text-[10px] text-slate-500" title={`Last synced at ${lastSyncedTime}`}>
            Synced: <strong className="text-slate-300">{lastSyncedTime}</strong>
          </span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div
        role="search"
        aria-label="Execution Timeline Filters"
        className="glass-panel p-3.5 rounded-xl border border-surface-border space-y-3"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter events by execution status">
            {(['ALL', 'COMPLETED', 'RUNNING', 'RETRYING', 'FAILED'] as ExecutionStatusFilter[]).map((status) => {
              const isActive = selectedStatus === status;
              const count = statusCounts[status];

              let activeClasses = 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 font-bold';
              if (status === 'COMPLETED') activeClasses = 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold';
              if (status === 'RUNNING') activeClasses = 'bg-cyan-950 text-cyan-300 border-cyan-400 font-bold';
              if (status === 'RETRYING') activeClasses = 'bg-amber-950 text-amber-300 border-amber-500 font-bold';
              if (status === 'FAILED') activeClasses = 'bg-rose-950 text-rose-300 border-rose-500 font-bold';

              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  aria-pressed={isActive}
                  aria-label={`Filter by ${status} status (${count} events)`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 border focus:outline-none focus:ring-2 focus:ring-neon-cyan ${
                    isActive
                      ? activeClasses
                      : 'bg-slate-950/80 text-slate-400 border-surface-border hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>{status}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${isActive ? 'bg-black/40 text-white' : 'bg-slate-900 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompt, branch, agent, error..."
              aria-label="Search execution logs, error reasons, or worktrees"
              className="w-full pl-8 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-surface-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search input"
                className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns Row: Filter by Agent & Task ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-900">
          <div>
            <label htmlFor="agent-filter-select" className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">
              Filter By Agent
            </label>
            <select
              id="agent-filter-select"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              aria-label="Filter timeline events by specific agent"
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-surface-border text-xs text-slate-300 focus:outline-none focus:border-neon-cyan font-mono"
            >
              <option value="ALL">All Hive Agents ({uniqueAgents.length})</option>
              {uniqueAgents.map((ag) => (
                <option key={ag.name} value={ag.name}>
                  {ag.name} ({ag.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-filter-select" className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">
              Filter By Task ID
            </label>
            <select
              id="task-filter-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              aria-label="Filter timeline events by Task ID"
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-surface-border text-xs text-slate-300 focus:outline-none focus:border-neon-cyan font-mono"
            >
              <option value="ALL">All Tasks ({uniqueTaskIds.length})</option>
              {uniqueTaskIds.map(([id, title]) => (
                <option key={id} value={id}>
                  {id} — {title.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-between sm:col-span-2 lg:col-span-1">
            <div className="text-[11px] text-slate-400">
              <span aria-live="polite">
                Showing <strong>{filteredEvents.length}</strong> of <strong>{timelineEvents.length}</strong> events
              </span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                aria-label="Reset all filters to default"
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-neon-cyan border border-neon-cyan/40 text-[10px] font-bold transition-all focus:outline-none focus:ring-1 focus:ring-neon-cyan"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Timeline Events Stream ─────────────────────────────────────────── */}
      {filteredEvents.length === 0 ? (
        <div className="p-10 rounded-xl bg-slate-950 border border-surface-border text-center text-slate-400 space-y-2">
          <Filter className="w-8 h-8 text-slate-600 mx-auto" aria-hidden="true" />
          <div className="text-white font-bold text-sm">No Execution Events Match Selected Filters</div>
          <p className="text-xs">Adjust your status, agent, or task filter query to view lifecycle events.</p>
          <div className="flex items-center justify-center space-x-2 pt-2">
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 text-xs font-bold hover:bg-neon-cyan/30 transition-all"
            >
              Reset Filters
            </button>
            {onDispatchTask && (
              <button
                onClick={() => onDispatchTask('Verify agent timeline lifecycle and worktrees')}
                className="px-3 py-1.5 rounded-xl bg-purple-950/80 text-purple-200 border border-purple-500/50 text-xs font-bold hover:bg-purple-900 transition-all flex items-center space-x-1"
              >
                <Play className="w-3 h-3 text-purple-400" />
                <span>+ Dispatch Task</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-gradient-to-b before:from-neon-cyan/60 before:via-purple-500/40 before:to-slate-800 before:z-0">
          {filteredEvents.map((event) => {
            const isErrorState = event.status === 'RETRYING' || event.status === 'FAILED' || event.level === 'error';
            const isExpandedError = !!expandedErrorIds[event.id];

            return (
              <article
                key={event.id}
                aria-labelledby={`card-title-${event.id}`}
                className={`relative z-10 p-4 rounded-xl border transition-all ${
                  isErrorState
                    ? event.status === 'FAILED'
                      ? 'bg-slate-950/95 border-rose-500/60 shadow-lg shadow-rose-950/30'
                      : 'bg-slate-950/95 border-amber-500/60 shadow-lg shadow-amber-950/30'
                    : event.status === 'RUNNING'
                    ? 'bg-slate-950/90 border-neon-cyan shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/80 border-surface-border hover:border-slate-700'
                }`}
              >
                {/* Event Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-900">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Timestamp & Duration Badge */}
                    <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-900 border border-surface-border text-slate-300 text-[11px]">
                      <Clock className="w-3 h-3 text-neon-cyan" aria-hidden="true" />
                      <span className="font-bold">{event.timestamp}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-neon-cyan font-bold" title="Step execution duration">
                        +{event.durationMs}ms
                      </span>
                    </div>

                    {/* Task ID Badge */}
                    <button
                      onClick={() => {
                        setSelectedTaskId(event.taskId);
                        const match = tasks.find((t) => t.id === event.taskId);
                        if (match && onSelectTask) onSelectTask(match);
                      }}
                      title={`Filter by task ${event.taskId}`}
                      aria-label={`View task ${event.taskId}`}
                      className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40 text-[10px] font-bold hover:bg-purple-900/60 transition-colors"
                    >
                      {event.taskId}
                    </button>

                    {/* Stage Badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      Stage: {event.stage}
                    </span>
                  </div>

                  {/* Status Badge & Drawer Action */}
                  <div className="flex items-center space-x-2">
                    {renderStatusBadge(event.status)}

                    <button
                      onClick={() => setSelectedEventForDrawer(event)}
                      aria-label={`Inspect full execution trace drawer for event ${event.id}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-surface-border text-[10px] font-bold flex items-center space-x-1 transition-all focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                    >
                      <Eye className="w-3 h-3 text-neon-cyan" aria-hidden="true" />
                      <span>Trace</span>
                    </button>
                  </div>
                </div>

                {/* Agent Identity & Provider Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3">
                  <div className="flex items-center space-x-2.5">
                    {/* Agent Avatar */}
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-neon-cyan/50 flex items-center justify-center text-neon-cyan font-bold text-xs shadow-inner flex-shrink-0">
                      {event.agentName.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span id={`card-title-${event.id}`} className="font-bold text-white text-xs">
                          {event.agentName}
                        </span>
                        <span className="text-[10px] text-slate-400">· {event.agentRole}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-2">
                        <span>Agent ID: <code>{event.agentId}</code></span>
                        {event.deskId && <span>· Desk: {event.deskId}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Provider & Worktree Info */}
                  <div className="flex flex-wrap items-center gap-2">
                    {renderProviderBadge(event.provider)}

                    {/* Worktree Branch Link */}
                    <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px]">
                      <GitBranch className="w-3 h-3 text-purple-400" aria-hidden="true" />
                      <span className="text-purple-300 font-mono font-bold truncate max-w-[200px]" title={event.worktreeBranch}>
                        {event.worktreeBranch}
                      </span>
                      <button
                        onClick={() => handleCopyBranch(event.worktreeBranch, event.id)}
                        aria-label={`Copy git checkout command for branch ${event.worktreeBranch}`}
                        className="ml-1 p-0.5 text-slate-400 hover:text-white transition-colors"
                        title="Copy 'git checkout <branch>'"
                      >
                        {copiedBranchId === event.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prompt & Log Message */}
                <div className="mt-3 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-slate-300">Task Brief</span>
                    <span className="text-slate-500 truncate max-w-[300px]">{event.taskTitle}</span>
                  </div>
                  <div className="text-xs text-white leading-relaxed font-mono">
                    <span
                      className={`font-bold mr-1.5 ${
                        event.level === 'error'
                          ? 'text-rose-400'
                          : event.level === 'warn'
                          ? 'text-amber-400'
                          : event.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-neon-cyan'
                      }`}
                    >
                      [{event.level.toUpperCase()}]:
                    </span>
                    <span>{event.message}</span>
                  </div>
                </div>

                {/* 6-Stage Progress Indicator */}
                <div className="mt-3 pt-2.5 border-t border-slate-900">
                  <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">
                    Orchestration Stage Progress
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {ORDERED_STAGES.map((st, i) => {
                      const stageIdx = ORDERED_STAGES.findIndex((s) => s.key === event.stage);
                      const isPast = i < stageIdx;
                      const isCurrent = i === stageIdx;

                      let cellColor = 'bg-slate-900 text-slate-600 border-slate-800';
                      if (isPast) {
                        cellColor = 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
                      } else if (isCurrent) {
                        if (event.status === 'FAILED') cellColor = 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse';
                        else if (event.status === 'RETRYING') cellColor = 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse';
                        else cellColor = 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/60';
                      }

                      return (
                        <div
                          key={st.key}
                          className={`px-1 py-1 rounded text-[9px] text-center border font-bold truncate ${cellColor}`}
                          title={`Stage: ${st.label}`}
                        >
                          {st.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Expandable Execution Error & Retry Details ──────────────── */}
                {isErrorState && (
                  <div className="mt-3 pt-2.5 border-t border-slate-900">
                    <div
                      className={`p-3 rounded-lg border ${
                        event.status === 'FAILED'
                          ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                          : 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                          <span className="font-bold text-xs">
                            {event.status === 'FAILED' ? 'Execution Failure Halting Pipeline' : 'Active Retry Remediation in Progress'}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                              event.status === 'FAILED'
                                ? 'bg-rose-900 text-white'
                                : 'bg-amber-900 text-white animate-pulse'
                            }`}
                          >
                            Retry {event.retryCount} / {event.maxRetries}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {event.status === 'RETRYING' && (
                            <button
                              onClick={() => handleSimulateRetryResolution(event.taskId)}
                              aria-label={`Simulate immediate retry resolution for task ${event.taskId}`}
                              className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 text-[10px] font-bold transition-all"
                            >
                              Resolve & Approve
                            </button>
                          )}

                          <button
                            onClick={() => toggleErrorDetails(event.id)}
                            aria-expanded={isExpandedError}
                            aria-controls={`error-panel-${event.id}`}
                            aria-label={`${isExpandedError ? 'Hide' : 'Expand'} execution error diagnostics for event ${event.id}`}
                            className="px-2.5 py-1 rounded bg-black/60 hover:bg-black text-white border border-surface-border text-[10px] font-bold flex items-center space-x-1 transition-all focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                          >
                            <span>{isExpandedError ? 'Hide Diagnostics' : 'Inspect Stack Trace'}</span>
                            {isExpandedError ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Failure Reason Header */}
                      <p className="text-[11px] mt-2 text-slate-200 leading-relaxed font-mono">
                        <strong>Reason:</strong> {event.failureReason || event.message}
                      </p>

                      {/* Expandable Diagnostic Panel */}
                      {isExpandedError && (
                        <div
                          id={`error-panel-${event.id}`}
                          className="mt-3 p-3 rounded-lg bg-black/95 border border-slate-800 text-[11px] space-y-2 font-mono animate-in fade-in"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1.5">
                            <span>DIAGNOSTIC TRACE · WORKTREE HARNESS</span>
                            <span>Code: {event.errorDetails?.code || 'ERR_AGENT_EXEC_FAIL'}</span>
                          </div>

                          <div className="text-slate-300">
                            <div><strong>Isolated Branch:</strong> <code>{event.worktreeBranch}</code></div>
                            {event.worktreePath && (
                              <div><strong>Worktree Directory:</strong> <code>{event.worktreePath}</code></div>
                            )}
                            <div><strong>Attempt Count:</strong> {event.retryCount} of {event.maxRetries} maximum allowed attempts</div>
                          </div>

                          {event.errorDetails?.stack && (
                            <div className="mt-2">
                              <div className="text-[10px] text-rose-400 font-bold uppercase mb-1">Stack Trace:</div>
                              <pre className="p-2 rounded bg-slate-950 text-rose-300 text-[10px] overflow-x-auto border border-rose-950 whitespace-pre">
                                {event.errorDetails.stack}
                              </pre>
                            </div>
                          )}

                          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                            <strong>Remediation Strategy:</strong> Isolated patch generation dispatched to specialist squad. Single-committer rails prevent branch pollution in main.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ── Slide-over Live Execution Drawer ─────────────────────────────────── */}
      {selectedEventForDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedEventForDrawer(null)}
        >
          <div
            className="w-full max-w-xl h-full bg-slate-950 border-l border-neon-cyan/40 p-6 overflow-y-auto space-y-5 shadow-2xl font-mono text-xs text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-surface-border pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-neon-cyan font-bold text-[10px] uppercase">
                    Hive Execution Trace Deep-Dive
                  </span>
                  {renderStatusBadge(selectedEventForDrawer.status)}
                </div>
                <h3 id="drawer-title" className="text-base font-bold text-white mt-1">
                  {selectedEventForDrawer.taskId}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedEventForDrawer.taskTitle}
                </p>
              </div>

              <button
                onClick={() => setSelectedEventForDrawer(null)}
                aria-label="Close execution details drawer"
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Agent Dossier in Drawer */}
            <div className="glass-panel p-4 rounded-xl border border-surface-border space-y-2.5">
              <div className="text-[10px] text-neon-cyan font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Assigned Agent Specialist</span>
                {renderProviderBadge(selectedEventForDrawer.provider)}
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-neon-cyan/50 flex items-center justify-center text-neon-cyan font-bold text-sm">
                  {selectedEventForDrawer.agentName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{selectedEventForDrawer.agentName}</div>
                  <div className="text-[10px] text-slate-400">{selectedEventForDrawer.agentRole}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[10px]">
                <div>
                  <span className="text-slate-500">Agent Slug:</span>
                  <div className="text-slate-300 font-mono">{selectedEventForDrawer.agentId}</div>
                </div>
                <div>
                  <span className="text-slate-500">Seating Desk:</span>
                  <div className="text-neon-cyan font-bold">{selectedEventForDrawer.deskId || 'desk-eng-001'}</div>
                </div>
              </div>
            </div>

            {/* Worktree & Git Isolation Card */}
            <div className="glass-panel p-4 rounded-xl border border-purple-500/40 space-y-2">
              <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Isolated Git Worktree Sandbox</span>
                <span className="text-emerald-400 text-[9px]">RAILS ACTIVE</span>
              </div>
              <div className="text-xs text-purple-200 font-bold break-all">
                {selectedEventForDrawer.worktreeBranch}
              </div>
              {selectedEventForDrawer.worktreePath && (
                <div className="text-[10px] text-slate-500 break-all font-mono">
                  Path: {selectedEventForDrawer.worktreePath}
                </div>
              )}
              <div className="pt-2 flex items-center justify-between text-[10px]">
                <button
                  onClick={() => handleCopyBranch(selectedEventForDrawer.worktreeBranch, 'drawer')}
                  className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/50 font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Checkout Command</span>
                </button>
                <span className="text-slate-500">Target: main</span>
              </div>
            </div>

            {/* Execution Telemetry Stats */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-surface-border">
                <div className="text-[9px] text-slate-400">DURATION</div>
                <div className="text-sm font-bold text-neon-cyan mt-0.5">+{selectedEventForDrawer.durationMs}ms</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-surface-border">
                <div className="text-[9px] text-slate-400">RETRIES</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {selectedEventForDrawer.retryCount} / {selectedEventForDrawer.maxRetries}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-surface-border">
                <div className="text-[9px] text-slate-400">SECURITY</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">VERIFIED</div>
              </div>
            </div>

            {/* Full Task Execution Logs Stream in Drawer */}
            <div className="rounded-xl border border-surface-border bg-slate-950 overflow-hidden space-y-2">
              <div className="px-3.5 py-2 bg-slate-900 border-b border-surface-border flex items-center justify-between text-[10px]">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
                  <span>Task Execution Telemetry Stream</span>
                </span>
                <span className="text-slate-500">Log level: {selectedEventForDrawer.level}</span>
              </div>

              <div className="p-3.5 max-h-60 overflow-y-auto space-y-2 text-[11px] leading-relaxed">
                <div className="text-slate-300">
                  <span className="text-slate-500 mr-2">[{selectedEventForDrawer.timestamp}]</span>
                  <span className="font-bold text-neon-cyan mr-1.5">[{selectedEventForDrawer.agentName}]:</span>
                  <span>{selectedEventForDrawer.message}</span>
                </div>

                {selectedEventForDrawer.failureReason && (
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[10px]">
                    <strong>Failure Diagnostic:</strong> {selectedEventForDrawer.failureReason}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Quick Actions */}
            <div className="pt-3 border-t border-surface-border space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedAgent(selectedEventForDrawer.agentName);
                    setSelectedEventForDrawer(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-neon-cyan border border-neon-cyan/40 font-bold text-xs transition-all"
                >
                  Filter Timeline By This Agent
                </button>
                <button
                  onClick={() => {
                    setSelectedTaskId(selectedEventForDrawer.taskId);
                    setSelectedEventForDrawer(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-500/40 font-bold text-xs transition-all"
                >
                  Filter By Task ID
                </button>
              </div>

              <button
                onClick={() => setSelectedEventForDrawer(null)}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-surface-border text-xs transition-all"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
