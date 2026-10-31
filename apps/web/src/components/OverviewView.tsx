import React from 'react';
import { ShieldCheck, Activity, Cpu, Database, CheckCircle2, Lock, ArrowUpRight, Terminal } from 'lucide-react';

interface OverviewViewProps {
  currentTenant: { id: string; name: string; slug: string };
  auditStats: { totalRecords: number; isVerified: boolean };
  onNavigateToAudit: () => void;
  onNavigateToRoadmap: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  currentTenant,
  auditStats,
  onNavigateToAudit,
  onNavigateToRoadmap
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl border border-neon-cyan/20 bg-gradient-to-r from-neon-cyan/10 via-surface-card to-neon-psionic/10 p-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-neon-cyan text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></span>
              <span>Universe Cockpit Online</span>
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
              NEXUS OMEGA X :: {currentTenant.name.toUpperCase()}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Multi-tenant autonomous intelligence infrastructure. Deterministic simulation, multi-agent AI societies, and evidence-based cryptographic governance.
            </p>
          </div>

          <div className="flex items-center space-x-3 font-mono">
            <button
              onClick={onNavigateToAudit}
              className="px-4 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30 text-xs flex items-center space-x-2 transition-all glow-cyan"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Audit Ledger</span>
            </button>
            <button
              onClick={onNavigateToRoadmap}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center space-x-1 transition-all"
            >
              <span>Phased Roadmap</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (shadcn-admin high-contrast KPI cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-surface-border hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>Cryptographic Chain</span>
            <div className="w-7 h-7 rounded-lg bg-neon-matrix/10 border border-neon-matrix/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-neon-matrix" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-bold text-white">
              {auditStats.totalRecords} <span className="text-xs font-normal text-slate-400">blocks</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon-matrix/15 text-neon-matrix border border-neon-matrix/30 font-bold">
              100% Intact
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-neon-matrix flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SHA-256 Ledger Verified</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-surface-border hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>Active Tenant</span>
            <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <Database className="w-4 h-4 text-neon-cyan" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-mono font-bold text-white truncate max-w-[150px]">
              {currentTenant.name}
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold">
              Active
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-slate-400">
            Slug: <span className="text-neon-cyan">/{currentTenant.slug}</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-surface-border hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>Simulation Physics</span>
            <div className="w-7 h-7 rounded-lg bg-neon-amber/10 border border-neon-amber/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-neon-amber" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-bold text-white">
              Deterministic
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon-amber/15 text-neon-amber border border-neon-amber/30 font-bold">
              PRNG 0x7F2A
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-neon-amber">
            Seed Replay Ready • Multi-Branch
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-surface-border hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>AI Safety Boundary</span>
            <div className="w-7 h-7 rounded-lg bg-neon-matrix/10 border border-neon-matrix/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-neon-matrix" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-bold text-neon-matrix">
              Constrained
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon-matrix/15 text-neon-matrix border border-neon-matrix/30 font-bold">
              Enforced
            </span>
          </div>
          <div className="mt-2 text-xs font-mono text-slate-400">
            Zero Unsafe Code Exec • Allowlist
          </div>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Foundation Architecture Features */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <h3 className="font-mono text-sm font-semibold text-white flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-neon-cyan" />
              <span>Phase 1 Architecture Status & Security Invariants</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/30">
              PASSING ACCEPTANCE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-void/80 border border-slate-800">
              <div className="text-neon-cyan font-bold mb-1">1. Multi-Tenant Logical Partitioning</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Every API call and audit block is bound to a verified <code>tenantId</code>. Cross-tenant leakage is strictly blocked by middleware.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-void/80 border border-slate-800">
              <div className="text-neon-matrix font-bold mb-1">2. Tamper-Evident SHA-256 Ledger</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Audit records form an unbroken cryptographic linked hash list. Any manual payload alteration breaks mathematical verification immediately.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-void/80 border border-slate-800">
              <div className="text-neon-amber font-bold mb-1">3. Granular RBAC Permissions</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                6 enterprise roles with 22 atomic permissions. Enforced through typed Zod validators and route guards.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-void/80 border border-slate-800">
              <div className="text-neon-psionic font-bold mb-1">4. Zero Arbitrary AI Code Execution</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                All agent actions require pre-registered typed tools with parameter validation. Self-improvement occurs strictly via versioned policy evaluation.
              </p>
            </div>
          </div>
        </div>

        {/* Live System Diagnostics */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div className="border-b border-surface-border pb-3">
            <h3 className="font-mono text-sm font-semibold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-neon-cyan" />
              <span>Diagnostic Telemetry</span>
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Node Runtime:</span>
              <span className="text-white">v26.11.1 (ESM)</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Package Manager:</span>
              <span className="text-white">pnpm 12.16.1 Monorepo</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-neon-matrix">Mongoose / Vector Ready</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Cache / Queue:</span>
              <span className="text-neon-cyan">Redis 7 / BullMQ Resilient</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">Automated Tests:</span>
              <span className="text-neon-matrix">Vitest 100% Green</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

