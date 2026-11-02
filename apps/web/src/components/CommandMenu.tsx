import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutDashboard,
  Box,
  Bot,
  Flame,
  PlaySquare,
  TrendingUp,
  Workflow,
  FileCheck2,
  Users,
  Layers,
  Building,
  ArrowRight,
  X,
  Terminal,
  ShieldAlert
} from 'lucide-react';
import { ActiveTab } from './Sidebar.js';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  availableTenants?: Array<{ id: string; name: string; slug: string }>;
  onSwitchTenant?: (tenantId: string) => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  availableTenants = [],
  onSwitchTenant
}) => {
  const [query, setQuery] = useState('');

  // Handle Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigationItems: Array<{
    id: ActiveTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
  }> = [
    {
      id: 'overview',
      label: 'Universe Cockpit (Overview)',
      description: 'System health, cryptographic chain verification, and core telemetry',
      icon: LayoutDashboard,
      category: 'Core Navigation'
    },
    {
      id: 'digital-twin',
      label: '3D Living Worlds (Digital Twin)',
      description: '3D WebGL viewport, tier layer filtering, and blast radius calculation',
      icon: Box,
      category: 'Core Navigation'
    },
    {
      id: 'ai-council',
      label: 'AI Council Command Center',
      description: 'Autonomous runtime AI council investigation, what-if simulations, and human approval gates',
      icon: ShieldAlert,
      category: 'AI & Intelligence'
    },
    {
      id: 'agents',
      label: 'Multi-Agent Society',
      description: '5 specialized agent personas, episodic memory recall, and dual-custody gates',
      icon: Bot,
      category: 'AI & Intelligence'
    },
    {
      id: 'incidents',
      label: 'Cyber Incidents & Telemetry Ingestion',
      description: 'MITRE ATT&CK taxonomy, IoC correlation, and incident triage',
      icon: Flame,
      category: 'Cyber Security'
    },
    {
      id: 'simulations',
      label: 'Scenario Simulator',
      description: 'Deterministic Monte Carlo PRNG seed replay & blast radius reduction',
      icon: PlaySquare,
      category: 'Simulation & Strategy'
    },
    {
      id: 'learning',
      label: 'Strategy Evaluation & Self-Improvement',
      description: 'Branch resilience comparison and policy optimization',
      icon: TrendingUp,
      category: 'Simulation & Strategy'
    },
    {
      id: 'workflows',
      label: 'Workflow Studio & HITL Playbooks',
      description: 'Interactive node-based incident response playbooks with dual-custody gates',
      icon: Workflow,
      category: 'Workflows & Automation'
    },
    {
      id: 'audit-vault',
      label: 'Tamper-Evident Audit Vault',
      description: 'SHA-256 cryptographic hash-chained immutable security ledger',
      icon: FileCheck2,
      category: 'Governance & Security'
    },
    {
      id: 'tenants',
      label: 'Tenants & RBAC Management',
      description: 'User access control, role personas, and organization isolation',
      icon: Users,
      category: 'Administration'
    },
    {
      id: 'roadmap',
      label: 'Phased Roadmap & Test Matrix',
      description: '134 automated unit & integration test coverage verification',
      icon: Layers,
      category: 'Administration'
    },
    {
      id: 'developer-agents',
      label: 'Munder Difflin Developer Control Center',
      description: 'Hive harness coordinating 283 Agency Specialists with Git worktree isolation',
      icon: Terminal,
      category: 'Developer & AI Harness'
    }
  ];

  const filteredNav = navigationItems.filter(
    (n) =>
      n.label.toLowerCase().includes(query.toLowerCase()) ||
      n.description.toLowerCase().includes(query.toLowerCase()) ||
      n.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTenants = availableTenants.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[75vh]">
        {/* Search Input Bar (shadcn-admin command pattern) */}
        <div className="p-3.5 border-b border-slate-800 flex items-center space-x-3 bg-slate-900/80">
          <Search className="w-4 h-4 text-neon-cyan flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, module name, or search action... (Press Esc to close)"
            className="w-full bg-transparent text-white placeholder-slate-500 text-xs focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Navigation Items */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
              System Modules ({filteredNav.length})
            </div>
            <div className="space-y-1">
              {filteredNav.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-700 text-left transition-all group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:border-neon-cyan/40">
                        <ItemIcon className="w-3.5 h-3.5 text-neon-cyan group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-neon-cyan group-hover:translate-x-0.5 transition-all ml-2 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tenant Switcher options */}
          {filteredTenants.length > 0 && onSwitchTenant && (
            <div>
              <div className="px-2 pb-1.5 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                Switch Organization / World
              </div>
              <div className="space-y-1">
                {filteredTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSwitchTenant(t.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-700 text-left transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <Building className="w-4 h-4 text-neon-purple" />
                      <div>
                        <div className="text-xs font-bold text-white">{t.name}</div>
                        <div className="text-[10px] text-slate-400">Slug: /{t.slug}</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple border border-neon-purple/30">
                      SWITCH
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>Select: ↵</span>
            <span>Navigate: ↑↓</span>
            <span>Close: Esc</span>
          </div>
          <span className="text-neon-cyan">shadcn-admin command palette</span>
        </div>
      </div>
    </div>
  );
};

