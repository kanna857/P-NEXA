import React, { useState } from 'react';
import { Flame, ShieldAlert, Activity, CheckCircle, ArrowRight, Play, Database } from 'lucide-react';

interface IncidentItem {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'TRIAGED' | 'CONTAINED';
  mitreTechniques: string[];
  affectedNode: string;
  detectedAt: string;
  confidence: number;
}

export const IncidentsView: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentItem[]>([
    {
      id: 'INC-2026-001',
      title: 'WannaCry Rapid Lateral Propagation Pattern',
      severity: 'CRITICAL',
      status: 'TRIAGED',
      mitreTechniques: ['T1486 Data Encrypted for Impact', 'T1021 Remote Services'],
      affectedNode: 'node-app-cluster',
      detectedAt: '2 mins ago',
      confidence: 0.94
    },
    {
      id: 'INC-2026-002',
      title: 'Suspicious DNS Tunneling Data Exfiltration Outbound',
      severity: 'HIGH',
      status: 'ACTIVE',
      mitreTechniques: ['T1048 Exfiltration Over Alternative Protocol'],
      affectedNode: 'node-db-01',
      detectedAt: '12 mins ago',
      confidence: 0.88
    }
  ]);

  const [simulatingBatch, setSimulatingBatch] = useState(false);

  const handleSimulateTelemetryBatch = () => {
    setSimulatingBatch(true);
    setTimeout(() => {
      const newInc: IncidentItem = {
        id: `INC-2026-00${incidents.length + 1}`,
        title: 'Kerberoasting Active Directory Credential Harvest',
        severity: 'HIGH',
        status: 'ACTIVE',
        mitreTechniques: ['T1003 OS Credential Dumping', 'T1110 Brute Force'],
        affectedNode: 'hmi-workstation-01',
        detectedAt: 'Just now',
        confidence: 0.91
      };
      setIncidents([newInc, ...incidents]);
      setSimulatingBatch(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-neon-crimson text-xs font-mono mb-1">
            <Flame className="w-4 h-4" />
            <span>REAL-TIME TELEMETRY & MITRE ATT&CK CORRELATION</span>
          </div>
          <h2 className="text-xl font-bold font-mono text-white">
            Cyber Incident Intelligence (Phase 4 Verified)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Idempotent BullMQ ingestion pipeline with sliding-window deduplication and live threat hunting.
          </p>
        </div>

        <button
          onClick={handleSimulateTelemetryBatch}
          disabled={simulatingBatch}
          className="px-4 py-2 rounded-lg bg-neon-crimson/20 hover:bg-neon-crimson/30 text-neon-crimson border border-neon-crimson/40 text-xs font-mono font-bold flex items-center space-x-2 transition-all glow-crimson"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{simulatingBatch ? 'Ingesting Batch...' : 'Inject Telemetry Batch'}</span>
        </button>
      </div>

      {/* Incidents Feed */}
      <div className="space-y-3">
        {incidents.map((inc) => (
          <div key={inc.id} className="glass-panel p-4 rounded-xl border border-surface-border space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inc.severity === 'CRITICAL'
                      ? 'bg-neon-crimson/20 text-neon-crimson border border-neon-crimson/40'
                      : 'bg-neon-amber/20 text-neon-amber border border-neon-amber/40'
                  }`}
                >
                  {inc.severity}
                </span>
                <span className="text-white font-bold">{inc.id}</span>
                <span className="text-slate-300">{inc.title}</span>
              </div>
              <div className="text-slate-400 text-[10px]">{inc.detectedAt}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="text-slate-500">Affected Target:</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-neon-cyan border border-neon-cyan/30">
                {inc.affectedNode}
              </span>
              <span className="text-slate-500 ml-2">MITRE Techniques:</span>
              {inc.mitreTechniques.map((ttp) => (
                <span key={ttp} className="px-2 py-0.5 rounded bg-slate-900 text-neon-purple border border-neon-purple/30">
                  {ttp}
                </span>
              ))}
              <span className="ml-auto text-neon-matrix font-bold">Confidence: {(inc.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

