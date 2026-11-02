import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Cpu,
  Server,
  Zap,
  AlertTriangle,
  ShieldAlert,
  Radio,
  ArrowRight,
  TrendingUp,
  Search,
  Sliders
} from 'lucide-react';
import {
  defaultTelemetryApiClient,
  TelemetryEntityState,
  AnomalyItem,
  ForecastItem
} from '../services/telemetryApiClient.js';
import { TwinNode } from '@nexus/twin-graph';

interface RealtimeIntelligenceDashboardViewProps {
  tenantId: string;
  userRole: string;
  onNavigateTab?: (tab: string) => void;
  onInvestigateEntity?: (node: TwinNode) => void;
}

export const RealtimeIntelligenceDashboardView: React.FC<RealtimeIntelligenceDashboardViewProps> = ({
  tenantId,
  userRole: _userRole,
  onNavigateTab,
  onInvestigateEntity
}) => {
  const [mode, setMode] = useState<'demo' | 'connected'>('demo');
  const [entities, setEntities] = useState<TelemetryEntityState[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('srv-auth');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStage, setDemoStage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  // Load live telemetry data
  const refreshData = useCallback(async () => {
    const ents = await defaultTelemetryApiClient.fetchEntities(tenantId);
    setEntities(ents);

    const anoms = await defaultTelemetryApiClient.fetchAnomalies(tenantId);
    setAnomalies(anoms);

    const fc = await defaultTelemetryApiClient.fetchForecast(tenantId, selectedEntityId, 'cpu');
    setForecast(fc);

    setLastUpdated(new Date().toLocaleTimeString());
  }, [tenantId, selectedEntityId]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Execute End-to-End Demo Scenario
  const handleRunDemoScenario = async () => {
    setIsDemoRunning(true);
    setDemoStage('1. Ingesting critical CPU surge (96.5%) & credential attack telemetry...');

    setTimeout(async () => {
      setDemoStage('2. Predictive Engine evaluated statistical anomaly: Z=4.12, Score=0.96 (CRITICAL)');
      await defaultTelemetryApiClient.triggerDemoScenario(tenantId, 'srv-auth');
      await refreshData();

      setTimeout(() => {
        setDemoStage('3. Automated AI Council triggered -> Investigator & Cybersecurity Agents analyzing...');
        setTimeout(() => {
          setDemoStage('4. Simulation Agent projected blast radius -> Mitigation Plan generated: ISOLATE_NODE');
          setTimeout(() => {
            setDemoStage('5. Awaiting Dual-Custody Human Approval in Council Command Center.');
            setIsDemoRunning(false);
          }, 1500);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  // Filtered entities
  const filteredEntities = entities.filter((e) => {
    const matchesSearch =
      e.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.status || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Aggregated KPI Stats
  const totalCount = entities.length || 1;
  const compromisedCount = entities.filter((e) => e.status === 'compromised').length;
  const degradedCount = entities.filter((e) => e.status === 'degraded').length;
  const avgHealth = Math.round(
    entities.reduce((acc, e) => acc + (e.healthScore || 80), 0) / totalCount
  );
  const avgCpu = Math.round(
    entities.reduce((acc, e) => acc + (e.metrics?.cpu || 30), 0) / totalCount
  );

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Top Cockpit Banner & Mode Switcher */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-slate-950/90 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-pulse shadow-lg shadow-cyan-500/50" />
            <span className="text-xs uppercase tracking-widest font-bold text-neon-cyan">
              Phase 5 Live Telemetry & Predictive Intelligence
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              Synced: {lastUpdated}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Real-Time Streaming Systems & Autonomous Council Automation
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Continuous ingestion of infrastructure metrics, explainable Z-score anomaly forecasting, live 3D Digital Twin sync, and automated Council investigations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher Pill */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setMode('demo')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === 'demo'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Demo Mode (Synthetic)
            </button>
            <button
              onClick={() => setMode('connected')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === 'connected'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Connected Mode (Live)
            </button>
          </div>

          {/* Trigger End-to-End Demo Scenario Button */}
          <button
            onClick={handleRunDemoScenario}
            disabled={isDemoRunning}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-purple-500/20 border border-purple-400/30 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${isDemoRunning ? 'animate-spin' : ''}`} />
            <span>{isDemoRunning ? 'Executing Pipeline...' : 'Run End-to-End Demo Scenario'}</span>
          </button>
        </div>
      </div>

      {/* Demo Scenario Live Progress Tracker */}
      {demoStage && (
        <div className="p-3.5 rounded-xl border border-purple-500/40 bg-purple-950/30 backdrop-blur-md flex items-center justify-between text-xs text-purple-200 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="font-bold">DEMO SCENARIO ACTIVE:</span>
            <span>{demoStage}</span>
          </div>
          <button
            onClick={() => onNavigateTab?.('ai-council')}
            className="px-3 py-1 rounded bg-purple-600/40 hover:bg-purple-600 text-purple-200 border border-purple-400/40 text-[11px] font-bold flex items-center space-x-1.5 transition-all"
          >
            <span>Open Council</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* High-Level Infrastructure Health Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Fleet Health</span>
            <Activity className="w-3.5 h-3.5 text-neon-cyan" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{avgHealth}%</div>
          <div className="text-[10px] text-neon-matrix mt-0.5">Weighted metric baseline</div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Avg CPU Load</span>
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{avgCpu}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across {totalCount} monitored nodes</div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Compromised</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{compromisedCount}</div>
          <div className="text-[10px] text-rose-400 mt-0.5">Immediate triage required</div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Degraded</span>
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{degradedCount}</div>
          <div className="text-[10px] text-amber-400 mt-0.5">Performance cautions</div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Anomalies Flagged</span>
            <Radio className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-1">{anomalies.length}</div>
          <div className="text-[10px] text-purple-300 mt-0.5">Z-score & ceiling breaches</div>
        </div>
      </div>

      {/* Main Grid: Live Telemetry Entities (Left) vs. Predictive Anomaly & Forecast (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live Monitored Entities (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-neon-cyan" />
                <h2 className="text-sm font-bold text-white">Live Digital Twin Entity Telemetry</h2>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search node..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">All States</option>
                  <option value="compromised">Compromised</option>
                  <option value="degraded">Degraded</option>
                  <option value="healthy">Healthy</option>
                  <option value="isolated">Isolated</option>
                </select>
              </div>
            </div>

            {/* Entity Cards List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredEntities.map((entity) => {
                const isSelected = selectedEntityId === entity.entityId;
                const isCompromised = entity.status === 'compromised';
                const isDegraded = entity.status === 'degraded';

                return (
                  <div
                    key={entity.entityId}
                    onClick={() => setSelectedEntityId(entity.entityId)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-slate-900/90 shadow-lg shadow-cyan-500/10'
                        : isCompromised
                        ? 'border-rose-500/40 bg-rose-950/10 hover:border-rose-500/60'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isCompromised
                              ? 'bg-rose-500 animate-ping'
                              : isDegraded
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span className="font-bold text-xs text-white">{entity.entityId}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                            isCompromised
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                              : isDegraded
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {entity.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded border font-bold ${
                            entity.freshness === 'LIVE'
                              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                              : entity.freshness === 'DEMO'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {entity.freshness}
                        </span>
                        <span className="text-slate-400 font-bold">
                          Health: <span className="text-white">{entity.healthScore}/100</span>
                        </span>
                      </div>
                    </div>

                    {/* Metric Bars */}
                    <div className="grid grid-cols-4 gap-2 text-[10px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div>
                        <span className="text-slate-500 block">CPU</span>
                        <span
                          className={`font-bold ${
                            (entity.metrics?.cpu ?? 0) > 85 ? 'text-rose-400' : 'text-slate-200'
                          }`}
                        >
                          {entity.metrics?.cpu ?? 35}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">RAM</span>
                        <span
                          className={`font-bold ${
                            (entity.metrics?.memory ?? 0) > 85 ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {entity.metrics?.memory ?? 45}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">NET I/O</span>
                        <span className="text-slate-200 font-bold">
                          {Math.round((entity.metrics?.networkInKbps ?? 2400) / 1000)} MB/s
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">AUTH FAILS</span>
                        <span
                          className={`font-bold ${
                            (entity.metrics?.authFailures ?? 0) > 5 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {entity.metrics?.authFailures ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Seen: {new Date(entity.lastSeen).toLocaleTimeString()}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const twinNode: TwinNode = {
                            id: entity.entityId,
                            name: `Entity ${entity.entityId}`,
                            type: 'server',
                            tier: 2,
                            status: entity.status === 'degraded' ? 'warning' : entity.status,
                            position: { x: 0, y: 0, z: 0 },
                            metadata: {
                              cpuUsage: entity.metrics?.cpu,
                              memoryUsage: entity.metrics?.memory,
                              ipAddress: '10.2.0.10'
                            }
                          };
                          onInvestigateEntity?.(twinNode);
                        }}
                        className="px-2.5 py-1 rounded bg-purple-900/40 hover:bg-purple-800 text-purple-300 border border-purple-500/40 font-bold flex items-center space-x-1 transition-all"
                      >
                        <ShieldAlert className="w-3 h-3 text-purple-300" />
                        <span>Investigate with Council</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Anomaly Stream & Forecast (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Explainable Anomaly Timeline */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">Explainable Anomaly Stream</h2>
              </div>
              <span className="text-[10px] text-purple-400 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                Hybrid Z-Score
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {anomalies.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Zero active anomalies flagged. System operating inside normal variance envelope.
                </div>
              ) : (
                anomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/20 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300">{anom.entityId}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                          anom.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border-rose-500'
                            : 'bg-amber-950 text-amber-300 border-amber-500'
                        }`}
                      >
                        {anom.severity} (Z: {anom.zScore})
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug">{anom.evidence}</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-purple-500/20">
                      <span>Model: {anom.ruleOrModelVersion}</span>
                      <span>{new Date(anom.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Time-Series Forecast with Calibrated Uncertainty Interval */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-neon-cyan" />
                <h2 className="text-sm font-bold text-white">
                  Predictive Forecast: {selectedEntityId}
                </h2>
              </div>
              <span className="text-[10px] text-neon-cyan font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                95% Confidence Band
              </span>
            </div>

            {/* Forecast Projection Points */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 mb-1">
                Linear trend projection with expanding uncertainty intervals (SE × √k):
              </div>
              <div className="space-y-1.5">
                {forecast.slice(0, 5).map((point) => (
                  <div
                    key={point.step}
                    className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-900/60 border border-slate-800"
                  >
                    <span className="text-slate-400">Step +{point.step * 10}s</span>
                    <span className="text-cyan-300 font-bold">{point.projectedValue}%</span>
                    <span className="text-[10px] text-slate-500">
                      CI: [{point.lowerBound}%, {point.upperBound}%]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

