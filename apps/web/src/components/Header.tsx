import React from 'react';
import { Shield, Activity, Database, Server, UserCheck, Search } from 'lucide-react';

interface HeaderProps {
  currentTenant: { id: string; name: string; slug: string };
  availableTenants: Array<{ id: string; name: string; slug: string }>;
  onSwitchTenant: (id: string) => void;
  currentUser: { email: string; role: string; firstName: string; lastName: string };
  onSwitchRole: (role: string) => void;
  health: { isOnline: boolean; isMock: boolean; uptime: number };
  onOpenCommandMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTenant,
  availableTenants,
  onSwitchTenant,
  currentUser,
  onSwitchRole,
  health,
  onOpenCommandMenu
}) => {
  return (
    <header className="h-16 border-b border-surface-border bg-void-darker/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Universe Title */}
      <div className="flex items-center space-x-4">
        <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center glow-cyan">
          <Shield className="w-5 h-5 text-neon-cyan" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm tracking-widest text-neon-cyan font-bold">NEXUS OMEGA X</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 font-mono">
              v1.0.0-PHASE1
            </span>
          </div>
          <p className="text-xs text-slate-400">Autonomous Intelligence Universe</p>
        </div>
      </div>

      {/* Global Command Menu Search Trigger (shadcn-admin pattern) */}
      {onOpenCommandMenu && (
        <button
          onClick={onOpenCommandMenu}
          className="hidden md:flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-neon-cyan/50 text-slate-400 hover:text-slate-200 transition-all font-mono text-xs group"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-neon-cyan transition-colors" />
          <span className="text-[11px]">Command Palette...</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
            Ctrl+K
          </span>
        </button>
      )}

      {/* Real-time System Status Pills */}
      <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          <Server className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-slate-400">API:</span>
          <span className={health.isOnline ? "text-neon-matrix" : "text-neon-alert"}>
            {health.isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          <Database className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-slate-400">DB:</span>
          <span className="text-neon-matrix">
            {health.isMock ? "IN-MEMORY READY" : "MONGODB 7"}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-slate-400">LEDGER:</span>
          <span className="text-neon-matrix">SHA-256 VERIFIED</span>
        </div>
      </div>

      {/* Tenant & User Switchers */}
      <div className="flex items-center space-x-4">
        {/* Tenant Selector */}
        <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">ORG:</span>
          <select
            value={currentTenant.id}
            onChange={(e) => onSwitchTenant(e.target.value)}
            className="bg-transparent text-xs text-neon-cyan font-mono focus:outline-none cursor-pointer"
          >
            {availableTenants.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Persona Switcher (Live RBAC demonstration) */}
        <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <UserCheck className="w-3.5 h-3.5 text-neon-cyan" />
          <select
            value={currentUser.role}
            onChange={(e) => onSwitchRole(e.target.value)}
            className="bg-transparent text-xs text-neon-matrix font-mono font-semibold focus:outline-none cursor-pointer"
          >
            <option value="SUPER_ADMIN" className="bg-slate-900 text-slate-100">SUPER_ADMIN</option>
            <option value="ORG_ADMIN" className="bg-slate-900 text-slate-100">ORG_ADMIN</option>
            <option value="SECURITY_ANALYST" className="bg-slate-900 text-slate-100">SECURITY_ANALYST</option>
            <option value="SIMULATION_ENGINEER" className="bg-slate-900 text-slate-100">SIMULATION_ENGINEER</option>
            <option value="AUDITOR" className="bg-slate-900 text-slate-100">AUDITOR</option>
            <option value="VIEWER" className="bg-slate-900 text-slate-100">VIEWER</option>
          </select>
        </div>
      </div>
    </header>
  );
};
