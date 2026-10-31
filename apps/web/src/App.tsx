import { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Sidebar, ActiveTab } from './components/Sidebar.js';
import { CommandMenu } from './components/CommandMenu.js';
import { NexusAIAssistant } from './components/NexusAIAssistant.js';
import { CommandGrid } from './components/CommandGrid.js';
import { AuditVaultView } from './components/AuditVaultView.js';
import { TenantManagementView } from './components/TenantManagementView.js';
import { PhasedRoadmapView } from './components/PhasedRoadmapView.js';
import { DigitalTwinWorldView } from './components/DigitalTwinWorldView.js';
import { AgentsSocietyView } from './components/AgentsSocietyView.js';
import { IncidentsView } from './components/IncidentsView.js';
import { SimulatorView } from './components/SimulatorView.js';
import { PolicyEvaluationView } from './components/PolicyEvaluationView.js';
import { WorkflowAutomationView } from './components/WorkflowAutomationView.js';
import { AgentInvestigationModal } from './components/AgentInvestigationModal.js';
import { TwinNode } from '@nexus/twin-graph';

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
  const [availableTenants] = useState<Array<{ id: string; name: string; slug: string; mode: 'school' | 'office' | 'defense' }>>([
    { id: 'tenant_school', name: 'NEXUS Quantum Academy', slug: 'nexus-academy', mode: 'school' },
    { id: 'tenant_office', name: 'CyberDyne Enterprise HQ', slug: 'cyberdyne-hq', mode: 'office' },
    { id: 'tenant_defense', name: 'Aegis Cyber Defense Complex', slug: 'aegis-defense', mode: 'defense' }
  ]);

  const [currentTenantId, setCurrentTenantId] = useState('tenant_school');
  const currentTenant = availableTenants.find((t) => t.id === currentTenantId) || availableTenants[0]!;

  const [currentUser, setCurrentUser] = useState({
    email: 'alex.kumar@nexus.ai',
    role: 'ADMINISTRATOR',
    firstName: 'Alex',
    lastName: 'Kumar'
  });

  const [users, setUsers] = useState([
    { id: 'u1', email: 'superadmin@nexus.ai', firstName: 'Nexus', lastName: 'Prime', role: 'SUPER_ADMIN', status: 'active' },
    { id: 'u2', email: 'alex.kumar@nexus.ai', firstName: 'Alex', lastName: 'Kumar', role: 'ORG_ADMIN', status: 'active' },
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
      payload: { name: 'NEXUS Quantum Academy', plan: 'autonomous_grid' },
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
    }
  ]);

  // AI Agent Council Live Investigation Flow State
  const [investigatingEntity, setInvestigatingEntity] = useState<TwinNode | null>(null);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);

  const handleOpenInvestigation = (entity?: TwinNode) => {
    const defaultServerNode: TwinNode = {
      id: 'srv-auth',
      name:
        currentTenant.mode === 'office'
          ? 'Enterprise SSO & Okta Identity Node'
          : currentTenant.mode === 'defense'
          ? 'Cryptographic Key Vault Bastion'
          : 'Main Authentication Server',
      type: 'server',
      tier: 2,
      status: 'compromised',
      position: { x: 0, y: 0, z: 0 },
      metadata: { ipAddress: '10.2.0.10', os: 'Ubuntu 24.04 LTS', cpuUsage: 93, memoryUsage: 96 }
    };
    setInvestigatingEntity(entity || defaultServerNode);
    setIsInvestigationModalOpen(true);
  };

  const handleRecordAuditLog = (newEntry: AuditLogItem) => {
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const handleInviteUser = (email: string, role: string) => {
    const newUser = {
      id: `u-${Date.now()}`,
      email,
      firstName: email.split('@')[0] || 'User',
      lastName: '',
      role,
      status: 'active'
    };
    setUsers([...users, newUser]);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 antialiased selection:bg-purple-600 selection:text-white">
      {/* Futuristic Command Header */}
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
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          userRole={currentUser.role}
          currentTenant={currentTenant}
        />

        {/* Center Main Stage */}
        <main className="flex-1 p-4 lg:p-5 overflow-y-auto w-full">
          {/* Dashboard: Centerpiece 3D Digital Twin + Contextual Intelligence Grid */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <DigitalTwinWorldView
                worldMode={currentTenant.mode}
                worldName={currentTenant.name}
                onWorldChange={(mode) => {
                  const match = availableTenants.find((t) => t.mode === mode);
                  if (match) setCurrentTenantId(match.id);
                }}
                onInvestigateEntity={handleOpenInvestigation}
              />
              <CommandGrid
                onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
                worldMode={currentTenant.mode}
                onInvestigateIncident={() => handleOpenInvestigation()}
              />
            </div>
          )}

          {/* Living 3D Digital Twin Dedicated View */}
          {activeTab === 'digital-twin' && (
            <DigitalTwinWorldView
              worldMode={currentTenant.mode}
              worldName={currentTenant.name}
              onWorldChange={(mode) => {
                const match = availableTenants.find((t) => t.mode === mode);
                if (match) setCurrentTenantId(match.id);
              }}
              onInvestigateEntity={handleOpenInvestigation}
            />
          )}

          {/* Multi-Agent AI Society with Vector Memory */}
          {activeTab === 'agents' && <AgentsSocietyView />}

          {/* Cyber Incidents & MITRE ATT&CK Telemetry */}
          {activeTab === 'incidents' && <IncidentsView />}

          {/* Parallel Scenario Simulation Lab */}
          {activeTab === 'simulations' && <SimulatorView />}

          {/* Strategy Evaluation & Controlled Promotion Gates */}
          {activeTab === 'learning' && <PolicyEvaluationView />}

          {/* Visual Workflow Playbook Editor (xyflow) */}
          {activeTab === 'workflows' && <WorkflowAutomationView />}

          {/* Tamper-Evident SHA-256 Audit Vault */}
          {activeTab === 'audit-vault' && (
            <AuditVaultView
              logs={auditLogs}
              tenantId={currentTenant.id}
              onRefresh={() => {}}
            />
          )}

          {/* Tenant Administration & RBAC */}
          {activeTab === 'tenants' && (
            <TenantManagementView
              currentTenant={currentTenant}
              users={users}
              onInviteUser={handleInviteUser}
            />
          )}

          {/* Knowledge Base & Phased Checklist */}
          {activeTab === 'roadmap' && <PhasedRoadmapView />}
        </main>

        {/* Right Docked NEXUS AI Assistant */}
        <NexusAIAssistant />
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandMenu
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        availableTenants={availableTenants}
        onSwitchTenant={(id) => setCurrentTenantId(id)}
      />

      {/* AI Agent Council Real-time Investigation Modal */}
      <AgentInvestigationModal
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        entity={investigatingEntity}
        worldMode={currentTenant.mode}
        currentUserEmail={currentUser.email}
        previousAuditHash={auditLogs[0]?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000'}
        nextAuditSequenceNumber={auditLogs.length + 1}
        onRecordAuditLog={handleRecordAuditLog}
        onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
      />
    </div>
  );
}
