import React from 'react';
import {
  LayoutDashboard,
  Box,
  Bot,
  Flame,
  PlaySquare,
  TrendingUp,
  Workflow,
  FileCheck2,
  Users,
  Layers
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
  | 'workflows';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, userRole: _userRole }) => {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    phase: string;
  }> = [
    { id: 'overview', label: 'Universe Cockpit', icon: LayoutDashboard, phase: 'Phase 1' },
    { id: 'digital-twin', label: '3D Living Worlds', icon: Box, phase: 'Phase 2' },
    { id: 'agents', label: 'Multi-Agent Society', icon: Bot, phase: 'Phase 3' },
    { id: 'incidents', label: 'Cyber Incidents', icon: Flame, phase: 'Phase 4' },
    { id: 'simulations', label: 'Scenario Simulator', icon: PlaySquare, phase: 'Phase 5' },
    { id: 'learning', label: 'Strategy Evaluation', icon: TrendingUp, phase: 'Phase 6' },
    { id: 'workflows', label: 'HITL Workflows', icon: Workflow, phase: 'Phase 7' },
    { id: 'audit-vault', label: 'Tamper Audit Vault', icon: FileCheck2, phase: 'Phase 8' },
    { id: 'tenants', label: 'Tenants & RBAC', icon: Users, phase: 'Admin' },
    { id: 'roadmap', label: 'Phased Checklist', icon: Layers, phase: '134 Tests' }
  ];

  return (
    <aside className="w-64 border-r border-surface-border bg-void-darker/60 backdrop-blur-md flex flex-col justify-between p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
          System Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${
                isActive
                  ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 glow-cyan font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-neon-cyan' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/30">
                {item.phase}
              </span>
            </button>
          );
        })}
      </div>

      {/* Security Status Box */}
      <div className="p-3 rounded-lg bg-surface-card/60 border border-slate-800 text-xs font-mono">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-400">Security Guard:</span>
          <span className="text-neon-matrix">ACTIVE</span>
        </div>
        <div className="text-[10px] text-slate-500 leading-tight">
          Arbitrary Code: <span className="text-neon-alert">BLOCKED</span><br />
          Tool Allowlists: <span className="text-neon-matrix">ENFORCED</span>
        </div>
      </div>
    </aside>
  );
};
