import React, { useState } from 'react';
import { UserPlus, KeyRound, Building, CheckCircle2 } from 'lucide-react';

interface TenantManagementProps {
  currentTenant: { id: string; name: string; slug: string };
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  }>;
  onInviteUser: (email: string, firstName: string, lastName: string, role: string) => void;
}

export const TenantManagementView: React.FC<TenantManagementProps> = ({
  currentTenant,
  users,
  onInviteUser
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');
  const [inviteRole, setInviteRole] = useState('SECURITY_ANALYST');

  const handleSubmitInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFirst || !inviteLast) return;
    onInviteUser(inviteEmail, inviteFirst, inviteLast, inviteRole);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteFirst('');
    setInviteLast('');
  };

  return (
    <div className="space-y-6">
      {/* Organization Card */}
      <div className="glass-panel p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-neon-cyan text-xs font-mono mb-1">
            <Building className="w-4 h-4" />
            <span>TENANT SPECIFICATION & ISOLATION BOUNDARY</span>
          </div>
          <h2 className="text-xl font-bold font-mono text-white">
            {currentTenant.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Slug: <code className="text-neon-cyan">/{currentTenant.slug}</code> | Plan: <span className="text-neon-matrix">DEFENSE_GRADE</span> | Quota: 50 Agents / 32 Scenarios
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30 text-xs font-mono flex items-center space-x-2 transition-all glow-cyan"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Identity</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">ASSIGNED IDENTITY ACCOUNTS ({users.length})</span>
          <span className="text-neon-matrix">RBAC ENFORCED</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-void/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Key Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {u.email}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center space-x-1 text-neon-matrix text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400">
                    {u.role === 'SUPER_ADMIN'
                      ? 'ALL (*)'
                      : u.role === 'ORG_ADMIN'
                      ? 'tenant:*, user:*, sim:*, agent:*'
                      : u.role === 'SECURITY_ANALYST'
                      ? 'incident:*, sim:read, audit:read'
                      : 'world:read, audit:read'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md p-6 rounded-xl border border-neon-cyan/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-neon-cyan" />
                <span>Provision Identity Account</span>
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInvite} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="analyst@cyberdyne.ai"
                  required
                  className="w-full bg-void px-3 py-2 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    value={inviteFirst}
                    onChange={(e) => setInviteFirst(e.target.value)}
                    placeholder="Alex"
                    required
                    className="w-full bg-void px-3 py-2 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-neon-cyan"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={inviteLast}
                    onChange={(e) => setInviteLast(e.target.value)}
                    placeholder="Vance"
                    required
                    className="w-full bg-void px-3 py-2 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-neon-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-void px-3 py-2 rounded-lg border border-slate-700 text-neon-cyan focus:outline-none focus:border-neon-cyan"
                >
                  <option value="ORG_ADMIN">ORG_ADMIN</option>
                  <option value="SECURITY_ANALYST">SECURITY_ANALYST</option>
                  <option value="SIMULATION_ENGINEER">SIMULATION_ENGINEER</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-neon-cyan text-black font-bold hover:bg-neon-cyan/90 glow-cyan"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
