import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Mic,
  Sun,
  Bell,
  ChevronDown
} from 'lucide-react';

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
  onOpenCommandMenu
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const timePart = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setCurrentTime(`${datePart} · ${timePart}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-surface-border bg-slate-950/95 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-50">
      {/* Brand: NEXUS Ω X */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-purple-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <span className="text-white font-black text-base font-mono tracking-tighter">Ω</span>
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm tracking-wider text-white font-extrabold flex items-center space-x-1">
              <span>NEXUS</span>
              <span className="text-neon-purple">Ω</span>
              <span>X</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
            Autonomous Intelligence Universe
          </p>
        </div>
      </div>

      {/* Global Command / Natural Language Search Input */}
      <div className="flex-1 max-w-xl mx-4 hidden md:block">
        <div
          onClick={onOpenCommandMenu}
          className="relative flex items-center w-full px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-neon-cyan/50 text-slate-400 hover:text-slate-200 transition-all font-mono text-xs cursor-pointer group shadow-inner"
        >
          <Search className="w-4 h-4 text-slate-500 group-hover:text-neon-cyan transition-colors mr-2.5 flex-shrink-0" />
          <span className="truncate text-slate-400 text-[11px]">
            Search anything... (e.g. &quot;why is main server down?&quot;, &quot;simulate bus delay&quot;)
          </span>
          <div className="flex items-center space-x-2 ml-auto flex-shrink-0 pl-2">
            <Mic className="w-3.5 h-3.5 text-slate-500 group-hover:text-neon-purple transition-colors" />
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-mono">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls: Time, Weather, Notification, User */}
      <div className="flex items-center space-x-3.5">
        {/* Live Date / Time */}
        <div className="hidden xl:flex items-center text-xs font-mono text-slate-300">
          <span>{currentTime || 'Mon, 27 Oct 2025 · 10:24 AM'}</span>
        </div>

        {/* Weather Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300">
          <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span>28°C Clear</span>
        </div>

        {/* Notification Bell with Badge */}
        <div className="relative cursor-pointer p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-crimson text-white text-[9px] font-bold font-mono flex items-center justify-center animate-pulse">
            3
          </span>
        </div>

        {/* User Profile Card & Switchers */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-900/80 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neon-purple to-neon-cyan p-[1.5px]">
              <div className="w-full h-full bg-slate-900 rounded-[7px] flex items-center justify-center text-white text-xs font-bold font-mono">
                {currentUser.firstName?.[0] || 'A'}{currentUser.lastName?.[0] || 'K'}
              </div>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-white font-mono leading-none">
                {currentUser.firstName} {currentUser.lastName}
              </div>
              <div className="text-[10px] text-neon-cyan font-mono mt-0.5">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          </button>

          {/* User & Org Switcher Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl z-50 font-mono text-xs space-y-3 backdrop-blur-xl">
              <div className="border-b border-slate-800 pb-2">
                <div className="text-slate-400 text-[10px] uppercase">Active User</div>
                <div className="text-white font-bold">{currentUser.email}</div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] uppercase mb-1 flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-neon-cyan" />
                  <span>Tenant Organization</span>
                </div>
                <select
                  value={currentTenant.id}
                  onChange={(e) => onSwitchTenant(e.target.value)}
                  className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] uppercase mb-1">Simulated Role</div>
                <select
                  value={currentUser.role}
                  onChange={(e) => onSwitchRole(e.target.value)}
                  className="w-full bg-slate-900 text-neon-matrix border border-slate-800 rounded px-2 py-1 text-xs focus:outline-none font-bold"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ORG_ADMIN">ORG_ADMIN</option>
                  <option value="SECURITY_ANALYST">SECURITY_ANALYST</option>
                  <option value="SIMULATION_ENGINEER">SIMULATION_ENGINEER</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
