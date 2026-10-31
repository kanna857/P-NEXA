import { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Sidebar, ActiveTab } from './components/Sidebar.js';
import { CommandMenu } from './components/CommandMenu.js';
import { OverviewView } from './components/OverviewView.js';
import { AuditVaultView } from './components/AuditVaultView.js';
import { TenantManagementView } from './components/TenantManagementView.js';
import { PhasedRoadmapView } from './components/PhasedRoadmapView.js';
import { DigitalTwinWorldView } from './components/DigitalTwinWorldView.js';
import { AgentsSocietyView } from './components/AgentsSocietyView.js';
import { IncidentsView } from './components/IncidentsView.js';
import { SimulatorView } from './components/SimulatorView.js';
import { PolicyEvaluationView } from './components/PolicyEvaluationView.js';
import { WorkflowAutomationView } from './components/WorkflowAutomationView.js';

export interface AuditLogItem {
  sequenceNumber: number;
  previousHash: string;
  currentHash: string;
  action: string;
  actor: { systemService?: string; userId?: string; ipAddress?: string; agentId?: string };
  payload: Record<string, unknown>;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener (shadcn-admin pattern)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preloaded mock data matching the seeded state
  const [availableTenants] = useState([
    { id: 'tenant_cyberdyne', name: 'CyberDyne Orbital', slug: 'cyberdyne-orbital' },
    { id: 'tenant_aegis', name: 'Aegis Defense Grid', slug: 'aegis-defense' },
    { id: 'tenant_synthetix', name: 'Synthetix Labs', slug: 'synthetix-labs' }
  ]);

  const [currentTenantId, setCurrentTenantId] = useState('tenant_cyberdyne');
  const currentTenant = availableTenants.find((t) => t.id === currentTenantId) || availableTenants[0]!;

  const [currentUser, setCurrentUser] = useState({
    email: 'admin@cyberdyne.ai',
    role: 'ORG_ADMIN',
    firstName: 'Sarah',
    lastName: 'Connor'
  });

  const [users, setUsers] = useState([
    { id: 'u1', email: 'superadmin@nexus.ai', firstName: 'Nexus', lastName: 'Prime', role: 'SUPER_ADMIN', status: 'active' },
    { id: 'u2', email: 'admin@cyberdyne.ai', firstName: 'Sarah', lastName: 'Connor', role: 'ORG_ADMIN', status: 'active' },
    { id: 'u3', email: 'analyst@cyberdyne.ai', firstName: 'Miles', lastName: 'Dyson', role: 'SECURITY_ANALYST', status: 'active' },
    { id: 'u4', email: 'sim.engineer@cyberdyne.ai', firstName: 'John', lastName: 'Vance', role: 'SIMULATION_ENGINEER', status: 'active' },
    { id: 'u5', email: 'auditor@cyberdyne.ai', firstName: 'Elena', lastName: 'Rostova', role: 'AUDITOR', status: 'active' }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    {
      sequenceNumber: 1,
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      currentHash: 'b4a83f12a9e223910f5438da1cf4d88e0ab326c7104b2811467cb484cfbc5832',
      action: 'TENANT_INITIALIZED',
      actor: { systemService: 'seed-engine' },
      payload: { name: 'CyberDyne Orbital', plan: 'defense_grade' },
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      sequenceNumber: 2,
      previousHash: 'b4a83f12a9e223910f5438da1cf4d88e0ab326c7104b2811467cb484cfbc5832',
      currentHash: '7c8d9283e40fa31291b2c4581290384aa9203948123049281230498120394812',
      action: 'POLICY_BASELINES_LOADED',
      actor: { systemService: 'seed-engine' },
      payload: { defaultMode: 'ENFORCED', mitreCoverage: ['TA0001', 'TA0002'] },
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      sequenceNumber: 3,
      previousHash: '7c8d9283e40fa31291b2c4581290384aa9203948123049281230498120394812',
      currentHash: '4392019284019283019284019283019284019283019284019283019284019283',
      action: 'AGENT_SOC_TRIAGE_SPAWNED',
      actor: { systemService: 'agent-engine' },
      payload: { role: 'SOC_TRIAGE', allowlist: ['query_siem', 'isolate_node'] },
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      sequenceNumber: 4,
      previousHash: '4392019284019283019284019283019284019283019284019283019284019283',
      currentHash: 'e928103948102938401928301928401928301928401928301928401928301928',
      action: 'DIGITAL_TWIN_SEEDED',
      actor: { systemService: 'world-engine' },
      payload: { nodesCount: 24, edgesCount: 38 },
      timestamp: new Date(Date.now() - 600000).toISOString()
    }
  ]);

  const handleInviteUser = (email: string, firstName: string, lastName: string, role: string) => {
    const newUser = {
      id: `u_${Date.now()}`,
      email,
      firstName,
      lastName,
      role,
      status: 'active'
    };
    setUsers([...users, newUser]);

    // Append audit log for user invitation
    const last = auditLogs[auditLogs.length - 1]!;
    const newSeq = last.sequenceNumber + 1;
    const newLog = {
      sequenceNumber: newSeq,
      previousHash: last.currentHash,
      currentHash: `sha256_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      action: 'USER_INVITED',
      actor: { userId: currentUser.email },
      payload: { email, role },
      timestamp: new Date().toISOString()
    };
    setAuditLogs([...auditLogs, newLog]);
  };

  return (
    <div className="min-h-screen bg-void flex flex-col font-sans">
      <Header
        currentTenant={currentTenant}
        availableTenants={availableTenants}
        onSwitchTenant={(id) => setCurrentTenantId(id)}
        currentUser={currentUser}
        onSwitchRole={(role) => setCurrentUser({ ...currentUser, role })}
        health={{ isOnline: true, isMock: true, uptime: 1420 }}
        onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          userRole={currentUser.role}
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewView
              currentTenant={currentTenant}
              auditStats={{ totalRecords: auditLogs.length, isVerified: true }}
              onNavigateToAudit={() => setActiveTab('audit-vault')}
              onNavigateToRoadmap={() => setActiveTab('roadmap')}
            />
          )}

          {activeTab === 'audit-vault' && (
            <AuditVaultView
              logs={auditLogs}
              tenantId={currentTenant.id}
              onRefresh={() => {}}
            />
          )}

          {activeTab === 'tenants' && (
            <TenantManagementView
              currentTenant={currentTenant}
              users={users}
              onInviteUser={handleInviteUser}
            />
          )}

          {activeTab === 'roadmap' && <PhasedRoadmapView />}

          {/* Phase 2: Living 3D Digital Twin Worlds */}
          {activeTab === 'digital-twin' && <DigitalTwinWorldView />}

          {/* Phase 3: Multi-Agent AI Society */}
          {activeTab === 'agents' && <AgentsSocietyView />}

          {/* Phase 4: Cyber Incidents & Event Ingestion */}
          {activeTab === 'incidents' && <IncidentsView />}

          {/* Phase 5: Deterministic Scenario Simulation */}
          {activeTab === 'simulations' && <SimulatorView />}

          {/* Phase 6: Strategy Evaluation & Self-Improvement */}
          {activeTab === 'learning' && <PolicyEvaluationView />}

          {/* Phase 7: Natural-Language World Synthesis & Dual-Custody Workflows */}
          {activeTab === 'workflows' && <WorkflowAutomationView />}
        </main>
      </div>

      {/* Global Command Palette (shadcn-admin pattern) */}
      <CommandMenu
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        availableTenants={availableTenants}
        onSwitchTenant={(id) => setCurrentTenantId(id)}
      />
    </div>
  );
}
