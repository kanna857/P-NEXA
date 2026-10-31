import React, { useState } from 'react';
import {
  ShieldAlert,
  TrendingUp,
  Clock,
  Server,
  GitBranch,
  Bot
} from 'lucide-react';

interface CommandGridProps {
  onNavigateTab?: (tab: string) => void;
  worldMode?: 'school' | 'office' | 'defense';
  onInvestigateIncident?: () => void;
}

export const CommandGrid: React.FC<CommandGridProps> = ({
  onNavigateTab,
  worldMode = 'school',
  onInvestigateIncident
}) => {
  const [incidentTimer, setIncidentTimer] = useState('00:12:45');
  const [approvalRequested, setApprovalRequested] = useState(false);

  // Live timer tick
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const secs = String(now.getSeconds()).padStart(2, '0');
      setIncidentTimer(`00:12:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const agents = [
    {
      name: 'Investigator',
      role: 'Analyzing incidents',
      status: 'Active',
      color: 'border-blue-500/50 text-blue-400 bg-blue-950/20'
    },
    {
      name: 'Security Agent',
      role: 'Threat detection',
      status: 'Active',
      color: 'border-pink-500/50 text-pink-400 bg-pink-950/20'
    },
    {
      name: 'Planner',
      role: 'Generating solutions',
      status: 'Active',
      color: 'border-purple-500/50 text-purple-400 bg-purple-950/20'
    },
    {
      name: 'Simulation Agent',
      role: 'Testing scenarios',
      status: 'Active',
      color: 'border-amber-500/50 text-amber-400 bg-amber-950/20'
    },
    {
      name: 'Reviewer',
      role: 'Verifying & checking',
      status: 'Active',
      color: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20'
    }
  ];

  const simulationScenarios = [
    {
      id: 'A',
      name: 'Use Backup Server',
      status: 'Recommended',
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-500/40',
      downtime: '15 min',
      affected: '600',
      successRate: '92%',
      cost: '$500'
    },
    {
      id: 'B',
      name: 'Load Distribution',
      status: 'Moderate Risk',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-500/40',
      downtime: '30 min',
      affected: '1,200',
      successRate: '78%',
      cost: '$900'
    },
    {
      id: 'C',
      name: 'Wait & Monitor',
      status: 'High Risk',
      badgeColor: 'bg-rose-950 text-rose-400 border-rose-500/40',
      downtime: '2-4 hours',
      affected: '3,842',
      successRate: '45%',
      cost: '$0'
    }
  ];

  const events = [
    {
      time: '10:24 AM',
      title: 'Main server goes offline',
      subtitle: 'Authentication server not responding',
      severity: 'High',
      sevColor: 'bg-rose-950 text-rose-400 border-rose-500/40'
    },
    {
      time: '10:22 AM',
      title: 'Unusual traffic detected',
      subtitle: 'Multiple failed login attempts',
      severity: 'Medium',
      sevColor: 'bg-amber-950 text-amber-400 border-amber-500/40'
    },
    {
      time: '10:18 AM',
      title: 'AI investigation started',
      subtitle: 'Security agent analyzing logs',
      severity: 'Info',
      sevColor: 'bg-blue-950 text-blue-400 border-blue-500/40'
    },
    {
      time: '10:15 AM',
      title: 'Simulation scenarios created',
      subtitle: '3 alternative solutions generated',
      severity: 'Info',
      sevColor: 'bg-purple-950 text-purple-400 border-purple-500/40'
    },
    {
      time: '10:10 AM',
      title: 'Bus delay reported',
      subtitle: '5 buses delayed by 30 minutes',
      severity: 'Low',
      sevColor: 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
    }
  ];

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* Row 1: AI Agent Council + Active Incident */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* AI Agent Council (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-4 rounded-xl border border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-neon-purple" />
              <span className="font-bold text-white tracking-wide">AI Agent Council</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/30 font-semibold">
                48 agents active
              </span>
            </div>
            <button
              onClick={() => onNavigateTab?.('agents')}
              className="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              Manage Agents &rarr;
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {agents.map((ag) => (
              <div
                key={ag.name}
                className={`p-2.5 rounded-xl border ${ag.color} flex flex-col justify-between transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-950 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950/80 font-bold">
                    {ag.status}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white truncate">{ag.name}</div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">{ag.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Incident Panel (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-rose-950/40 pb-2">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-neon-crimson animate-pulse" />
              <span className="font-bold text-white">Active Incident</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-400 border border-rose-500/40">
                High Severity
              </span>
            </div>
            <div className="text-neon-crimson font-bold text-xs">{incidentTimer}</div>
          </div>

          <div className="my-2.5 flex items-start space-x-3">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
              <Server className="w-6 h-6 text-neon-crimson animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {worldMode === 'school' && 'Main Authentication Server Down'}
                {worldMode === 'office' && 'Enterprise SSO & Okta Identity Node Outage'}
                {worldMode === 'defense' && 'Cryptographic Key Vault Desynchronization'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                {worldMode === 'school' && 'Students and faculty are unable to access the academy portal.'}
                {worldMode === 'office' && 'Corporate staff and trading clients cannot authenticate to enterprise SSO.'}
                {worldMode === 'defense' && 'Tactical units and operators cannot decrypt mission control telemetry.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-[10px] py-1 border-t border-b border-slate-900">
            <div>
              <span className="text-slate-500">Affected Users</span>
              <div className="text-white font-bold">3,842</div>
            </div>
            <div>
              <span className="text-slate-500">Systems</span>
              <div className="text-neon-crimson font-bold">12</div>
            </div>
            <div>
              <span className="text-slate-500">Est. Down</span>
              <div className="text-amber-400 font-bold">45 min</div>
            </div>
            <div>
              <span className="text-slate-500">Risk Level</span>
              <div className="text-neon-crimson font-bold">High</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={() => onNavigateTab?.('incidents')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300"
            >
              View Details
            </button>
            <button
              onClick={() => {
                if (onInvestigateIncident) {
                  onInvestigateIncident();
                } else {
                  onNavigateTab?.('agents');
                }
              }}
              data-testid="run-incident-investigation-btn"
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-[10px] text-purple-200 font-bold transition-all shadow-sm"
            >
              Run Investigation
            </button>
            <button
              onClick={() => onNavigateTab?.('simulations')}
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-[10px] text-purple-300"
            >
              Simulate Solutions
            </button>
            <button
              onClick={() => setApprovalRequested(true)}
              className="flex-1 py-1.5 rounded-lg bg-neon-crimson hover:bg-rose-600 text-white font-bold text-[10px] transition-all shadow-md shadow-rose-900/50 text-center"
            >
              {approvalRequested ? 'Sign-Off Requested' : 'Request Approval'}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Simulation Lab (4 cols) + Analytics (4 cols) + Events & Timeline (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Simulation Lab (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-4 rounded-xl border border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-neon-purple" />
              <span className="font-bold text-white">Simulation Lab</span>
            </div>
            <button
              onClick={() => onNavigateTab?.('simulations')}
              className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800"
            >
              + New Scenario
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {simulationScenarios.map((sc) => (
              <div
                key={sc.id}
                className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-1.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px]">Scenario {sc.id}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 truncate mt-0.5">{sc.name}</div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold inline-block mt-1 ${sc.badgeColor}`}>
                    {sc.status}
                  </span>
                </div>

                <div className="text-[9px] space-y-0.5 pt-1 border-t border-slate-900 text-slate-400">
                  <div className="flex justify-between">
                    <span>Down:</span> <span className="text-white font-bold">{sc.downtime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users:</span> <span className="text-white font-bold">{sc.affected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span> <span className="text-neon-matrix font-bold">{sc.successRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span> <span className="text-amber-400 font-bold">{sc.cost}</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab?.('simulations')}
                  className="w-full py-1 rounded bg-slate-900 hover:bg-slate-800 text-[9px] text-slate-300 text-center"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-4 rounded-xl border border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-neon-cyan" />
              <span className="font-bold text-white">Analytics Dashboard</span>
            </div>
            <span className="text-[10px] text-slate-500">Last 24 Hours</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center py-1">
            <div className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-900">
              <div className="text-slate-500 text-[9px]">TOTAL EVENTS</div>
              <div className="text-white font-bold text-xs mt-0.5">12,428</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-900">
              <div className="text-slate-500 text-[9px]">INCIDENTS</div>
              <div className="text-neon-crimson font-bold text-xs mt-0.5">24</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-900">
              <div className="text-slate-500 text-[9px]">UPTIME</div>
              <div className="text-neon-matrix font-bold text-xs mt-0.5">99.8%</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-900">
              <div className="text-slate-500 text-[9px]">ACTIVE AGENTS</div>
              <div className="text-neon-purple font-bold text-xs mt-0.5">48</div>
            </div>
          </div>

          {/* Mini Event Trend visualization bar */}
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-900 space-y-1 mt-1">
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>Event Activity Waves</span>
              <span className="text-neon-cyan">Normal Traffic Curve</span>
            </div>
            <div className="h-9 flex items-end space-x-1 pt-1">
              {[40, 65, 30, 85, 45, 95, 60, 80, 50, 70, 90, 100, 75, 60, 85].map((val, idx) => (
                <div
                  key={idx}
                  style={{ height: `${val}%` }}
                  className={`flex-1 rounded-t ${
                    idx === 11 ? 'bg-neon-crimson' : 'bg-gradient-to-t from-cyan-600 to-purple-500 opacity-80'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Events & Timeline (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-4 rounded-xl border border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-neon-matrix" />
              <span className="font-bold text-white">Events & Timeline</span>
            </div>
            <span className="text-[10px] text-slate-500">Live Feed</span>
          </div>

          <div className="space-y-1.5 overflow-hidden">
            {events.slice(0, 4).map((ev, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-900"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-[9px] text-slate-500 font-bold">{ev.time}</span>
                  <div className="truncate">
                    <div className="text-[10px] font-bold text-slate-200 truncate">{ev.title}</div>
                    <div className="text-[9px] text-slate-500 truncate">{ev.subtitle}</div>
                  </div>
                </div>
                <span className={`text-[8px] px-1.5 py-0.2 rounded border font-bold flex-shrink-0 ${ev.sevColor}`}>
                  {ev.severity}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab?.('incidents')}
            className="w-full mt-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-center"
          >
            View Full Timeline &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
