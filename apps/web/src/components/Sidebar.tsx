import React from 'react';
import {
  LayoutDashboard,
  Box,
  Bot,
  PlaySquare,
  Flame,
  Workflow,
  TrendingUp,
  Clock,
  BookOpen,
  Share2,
  Settings,
  Plus,
  Play,
  Database,
  FilePlus2,
  CheckCircle2,
  GraduationCap,
  Building2,
  ShieldAlert,
  Terminal
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'roadmap'
  | 'audit-vault'
  | 'tenants'
  | 'digital-twin'
  | 'agents'
  | 'incidents'
  | 'simulations'
  | 'learning'
  | 'workflows'
  | 'developer-agents';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: string;
  currentTenant?: { id: string; name: string; mode?: 'school' | 'office' | 'defense'; slug?: string };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, userRole, currentTenant }) => {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'digital-twin', label: 'Digital Twin', icon: Box },
    { id: 'agents', label: 'AI Agents', icon: Bot },
    { id: 'simulations', label: 'Simulations', icon: PlaySquare },
    { id: 'incidents', label: 'Cyber Security', icon: Flame },
    { id: 'workflows', label: 'Workflow Studio', icon: Workflow },
    { id: 'learning', label: 'Analytics', icon: TrendingUp },
    { id: 'incidents', label: 'Events & Timeline', icon: Clock },
    { id: 'roadmap', label: 'Knowledge Base', icon: BookOpen },
    { id: 'audit-vault', label: 'Integrations', icon: Share2 },
    { id: 'tenants', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-60 border-r border-surface-border bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-3 select-none overflow-y-auto">
      <div className="space-y-4">
        {/* Navigation Menu */}
        <div className="space-y-0.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && idx !== 7;

            return (
              <button
                key={`${item.id}-${idx}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-500/40 font-bold shadow-lg shadow-purple-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-neon-purple' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Developer Harness Section (Munder Difflin Hive) */}
          {(userRole === 'admin' || userRole === 'commander' || userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN' || userRole === 'ADMINISTRATOR') && (
            <div className="pt-2 border-t border-slate-900/80 space-y-1">
              <div className="px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Dev Harness</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neon-matrix animate-ping" />
              </div>
              <button
                onClick={() => onSelectTab('developer-agents')}
                data-testid="nav-developer-agents"
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                  activeTab === 'developer-agents'
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 font-bold shadow-lg shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-neon-cyan hover:bg-slate-900/60'
                }`}
              >
                <Terminal className="w-4 h-4 text-neon-cyan" />
                <span>Munder Difflin</span>
              </button>
            </div>
          )}
        </div>

        {/* Current World Box */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Current World</div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-900 to-indigo-900 border border-cyan-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {currentTenant?.mode === 'office' ? (
                <Building2 className="w-5 h-5 text-neon-cyan animate-pulse" />
              ) : currentTenant?.mode === 'defense' ? (
                <ShieldAlert className="w-5 h-5 text-neon-crimson animate-pulse" />
              ) : (
                <GraduationCap className="w-5 h-5 text-neon-cyan animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white font-mono leading-tight truncate">
                {currentTenant?.name || 'NEXUS Quantum Academy'}
              </div>
              <div className="text-[10px] text-neon-matrix font-mono flex items-center space-x-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-matrix animate-ping" />
                <span>Live Simulation</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('digital-twin')}
            className="w-full py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white transition-all text-center"
          >
            Switch World
          </button>
        </div>

        {/* Quick Create Menu */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider px-2 flex items-center space-x-1">
            <Plus className="w-3 h-3" />
            <span>Quick Create</span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onSelectTab('simulations')}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-900 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-all text-left"
            >
              <Play className="w-3 h-3 text-neon-cyan" />
              <span>New Simulation</span>
            </button>
            <button
              onClick={() => onSelectTab('workflows')}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-900 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-all text-left"
            >
              <Workflow className="w-3 h-3 text-neon-purple" />
              <span>Create Workflow</span>
            </button>
            <button
              onClick={() => onSelectTab('digital-twin')}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-900 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-all text-left"
            >
              <Database className="w-3 h-3 text-neon-matrix" />
              <span>Add Entities</span>
            </button>
            <button
              onClick={() => onSelectTab('audit-vault')}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-900 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-all text-left"
            >
              <FilePlus2 className="w-3 h-3 text-neon-amber" />
              <span>Import Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="pt-3 border-t border-slate-900 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center space-x-1.5 text-neon-matrix">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All Systems Operational</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-600 font-mono">
          NEXUS Core v1.0.0-PROD
        </div>
      </div>
    </aside>
  );
};
