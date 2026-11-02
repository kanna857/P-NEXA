import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import {
  TelemetryEvent,
  TelemetryBatch,
  TelemetryQuery,
  AnomalyFinding
} from '@nexus/shared';
import {
  defaultEventStore,
  computeEventIdempotencyKey
} from '@nexus/event-store';
import { defaultPredictiveEngine } from '@nexus/cyber-engine';
import { defaultCouncilOrchestrator, CouncilInvestigationDossier } from '@nexus/agent-engine';
import { recordAuditEvent } from './auditService.js';
import { rootLogger } from '@nexus/observability';
import { WorldStore } from '../db/worldStore.js';

const logger = rootLogger.child({ component: 'TelemetryService' });

export interface EntityLiveState {
  entityId: string;
  tenantId: string;
  worldId: string;
  status: 'healthy' | 'degraded' | 'compromised' | 'isolated' | 'offline';
  healthScore: number; // 0 to 100
  metrics: {
    cpu?: number;
    memory?: number;
    disk?: number;
    networkInKbps?: number;
    networkOutKbps?: number;
    activeConnections?: number;
    authFailures?: number;
    temperature?: number;
    voltage?: number;
    custom?: Record<string, unknown>;
  };
  mode: 'demo' | 'connected';
  freshness: 'LIVE' | 'STALE' | 'REPLAYING' | 'DEMO';
  lastSeen: string;
  lastAnomaly?: AnomalyFinding;
  recentEvents: Array<{
    id: string;
    timestamp: string;
    category: string;
    status: string;
    summary: string;
  }>;
}

export interface IngestResult {
  eventId: string;
  isDuplicate: boolean;
  isAnomaly: boolean;
  anomalyFinding?: AnomalyFinding;
  investigationTriggered: boolean;
  investigationId?: string;
  storedAt: string;
}

export class TelemetryService {
  private entityStates = new Map<string, EntityLiveState>();
  private anomalyHistory: AnomalyFinding[] = [];
  private investigationCooldowns = new Map<string, number>(); // tenantId:entityId -> timestamp
  private activeReplays = new Map<string, { intervalId: NodeJS.Timeout; isRunning: boolean }>();
  private currentQueueDepth = 0;
  private readonly maxQueueDepth = 5000;
  private readonly cooldownMs = 60000; // 60 seconds investigation cooldown per entity

  private getEntityKey(tenantId: string, entityId: string): string {
    return `${tenantId}:${entityId}`;
  }

  /**
   * Calculates a health score (0-100) based on current metrics and anomaly severity.
   */
  public computeHealthScore(
    status: string,
    metrics: Record<string, any> = {},
    anomalyScore: number = 0
  ): number {
    if (status === 'compromised') return Math.max(0, Math.min(25, 30 - anomalyScore * 30));
    if (status === 'isolated') return 40;
    if (status === 'degraded') return Math.max(30, Math.min(65, 70 - (metrics.cpu || 50) * 0.4));
    if (status === 'offline') return 0;

    const cpu = metrics.cpu ?? 20;
    const mem = metrics.memory ?? 30;
    const penalty = cpu * 0.35 + mem * 0.25 + anomalyScore * 40;
    return Math.max(10, Math.min(100, Math.round(100 - penalty)));
  }

  /**
   * Ingests a single telemetry event with idempotency, backpressure guard,
   * anomaly detection, live twin synchronization, and automated Council trigger.
   */
  public async ingestEvent(
    event: TelemetryEvent,
    io?: SocketIOServer
  ): Promise<IngestResult> {
    // 1. Backpressure guard
    if (this.currentQueueDepth >= this.maxQueueDepth) {
      logger.warn('Telemetry backpressure threshold exceeded', { queueDepth: this.currentQueueDepth });
      throw new Error('BACKPRESSURE_LIMIT_EXCEEDED: Server telemetry ingestion buffer is saturated. Please retry shortly.');
    }

    this.currentQueueDepth++;
    try {
      const nowStr = event.timestamp || new Date().toISOString();
      const tenantId = event.tenantId;
      const entityId = event.entityId;

      // 2. Deterministic Idempotency Key
      const key =
        event.idempotencyKey ||
        computeEventIdempotencyKey(
          tenantId,
          event.source,
          event.category,
          { entityId, metrics: event.metrics, status: event.status },
          nowStr
        );

      // 3. Deduplication Ingest into EventStore
      const ingestRes = await defaultEventStore.ingestEvent({
        tenantId,
        type: `telemetry.${event.category}`,
        source: event.source,
        idempotencyKey: key,
        payload: {
          id: event.id,
          mode: event.mode,
          entityId,
          worldId: event.worldId,
          metrics: event.metrics,
          status: event.status,
          metadata: event.metadata
        },
        timestamp: new Date(nowStr)
      });

      if (ingestRes.isDuplicate) {
        return {
          eventId: ingestRes.eventId,
          isDuplicate: true,
          isAnomaly: false,
          investigationTriggered: false,
          storedAt: ingestRes.storedAt.toISOString()
        };
      }

      // 4. Run Predictive Intelligence Anomaly Evaluator on Key Metrics (CPU, Memory, Auth Failures)
      let primaryFinding: AnomalyFinding | undefined;
      const metricKeys = ['cpu', 'memory', 'authFailures', 'networkInKbps'] as const;

      for (const mKey of metricKeys) {
        const val = event.metrics?.[mKey];
        if (typeof val === 'number') {
          const finding = defaultPredictiveEngine.evaluate(tenantId, entityId, mKey, val, nowStr);
          if (finding.isAnomaly) {
            primaryFinding = finding;
            this.anomalyHistory.unshift(finding);
            if (this.anomalyHistory.length > 500) this.anomalyHistory.pop();
            break; // prioritize highest primary anomaly
          }
        }
      }

      // 5. Update Live Digital Twin State Cache
      const anomalyScore = primaryFinding?.anomalyScore ?? 0;
      const effectiveStatus =
        event.status !== 'healthy'
          ? event.status
          : primaryFinding?.severity === 'CRITICAL'
          ? 'compromised'
          : primaryFinding?.severity === 'HIGH'
          ? 'degraded'
          : 'healthy';

      const healthScore = this.computeHealthScore(effectiveStatus, event.metrics, anomalyScore);
      const entityKey = this.getEntityKey(tenantId, entityId);

      const existingEntity = this.entityStates.get(entityKey);
      const recentEvents = existingEntity?.recentEvents || [];
      recentEvents.unshift({
        id: event.id,
        timestamp: nowStr,
        category: event.category,
        status: effectiveStatus,
        summary: primaryFinding
          ? primaryFinding.evidence
          : `Telemetry received from ${event.source} (CPU: ${event.metrics?.cpu ?? '-'}%, RAM: ${event.metrics?.memory ?? '-'}%)`
      });
      if (recentEvents.length > 20) recentEvents.pop();

      const liveState: EntityLiveState = {
        entityId,
        tenantId,
        worldId: event.worldId || 'world-default',
        status: effectiveStatus,
        healthScore,
        metrics: event.metrics || {},
        mode: event.mode || 'demo',
        freshness: event.mode === 'demo' ? 'DEMO' : 'LIVE',
        lastSeen: nowStr,
        lastAnomaly: primaryFinding,
        recentEvents
      };
      this.entityStates.set(entityKey, liveState);

      // 6. Broadcast Real-Time Streaming Updates via Socket.IO
      if (io) {
        io.to(`tenant:${tenantId}`).emit('telemetry:stream', event);
        io.to(`tenant:${tenantId}`).emit('telemetry:entity_status', liveState);
        if (primaryFinding) {
          io.to(`tenant:${tenantId}`).emit('telemetry:anomaly', primaryFinding);
        }
      }

      // 7. Automated AI Council Investigation Trigger
      let investigationTriggered = false;
      let investigationId: string | undefined;

      const isHighRisk =
        effectiveStatus === 'compromised' ||
        (primaryFinding && primaryFinding.anomalyScore >= 0.70) ||
        (event.metrics?.authFailures && event.metrics.authFailures >= 10);

      if (isHighRisk) {
        const cooldownKey = `${tenantId}:${entityId}`;
        const lastInv = this.investigationCooldowns.get(cooldownKey) || 0;
        const nowMs = Date.now();

        if (nowMs - lastInv >= this.cooldownMs) {
          this.investigationCooldowns.set(cooldownKey, nowMs);

          try {
            // Trigger Council in background so response is not blocked
            let nodes: any[] = [];
            let edges: any[] = [];
            if (event.worldId && Types.ObjectId.isValid(event.worldId)) {
              try {
                const world = await WorldStore.findWorldByIdAndTenant(event.worldId, tenantId);
                nodes = world?.nodes?.map((n: any) => ({ ...n, id: n.nodeId || n.id })) || [];
                edges = world?.edges?.map((e: any) => ({ ...e, id: e.edgeId || e.id })) || [];
              } catch {
                // Ignore fallback to empty
              }
            }

            const dossier = await defaultCouncilOrchestrator.executeInvestigation(
              {
                entityId,
                entityName: existingEntity?.entityId || entityId,
                tenantId,
                worldId: event.worldId || 'world-default',
                nodes,
                edges,
                requestedBy: 'automated-telemetry-watcher',
                alertHint: primaryFinding?.evidence || `Critical telemetry breach: status ${effectiveStatus}`,
                customTelemetry: {
                  cpu: event.metrics?.cpu,
                  memory: event.metrics?.memory,
                  authFailures: event.metrics?.authFailures,
                  anomalyScore,
                  timestamp: nowStr
                }
              },
              {
                onEvent: (evt) => {
                  if (io) io.to(`tenant:${tenantId}`).emit('council:event', evt);
                }
              }
            );

            investigationTriggered = true;
            investigationId = dossier.investigationId;

            if (io) {
              io.to(`tenant:${tenantId}`).emit('council:auto_investigation_triggered', {
                investigationId: dossier.investigationId,
                entityId,
                severity: dossier.threatAssessment?.severity,
                riskScore: dossier.threatAssessment?.riskScore,
                action: dossier.recommendedPlan?.action,
                requiresApproval: dossier.status === 'AWAITING_APPROVAL'
              });
            }

            // Record audit log for automated investigation
            await recordAuditEvent({
              tenantId,
              actor: {
                systemService: 'telemetry-predictive-watcher',
                agentId: 'telemetry-engine'
              },
              action: 'AUTO_COUNCIL_INVESTIGATION_INITIATED',
              targetResource: { type: 'node', id: entityId },
              payload: {
                investigationId: dossier.investigationId,
                cause: primaryFinding?.evidence || 'High-risk telemetry anomaly',
                anomalyScore,
                recommendedAction: dossier.recommendedPlan?.action
              }
            });
          } catch (invErr: any) {
            logger.error('Failed to execute automated Council investigation', { error: invErr?.message, entityId });
          }
        } else {
          logger.info('Automated Council investigation suppressed by active cooldown window', { entityId, tenantId });
        }
      }

      return {
        eventId: event.id,
        isDuplicate: false,
        isAnomaly: !!primaryFinding,
        anomalyFinding: primaryFinding,
        investigationTriggered,
        investigationId,
        storedAt: nowStr
      };
    } finally {
      this.currentQueueDepth--;
    }
  }

  /**
   * Ingests a high-throughput batch of telemetry events.
   */
  public async ingestBatch(
    batch: TelemetryBatch,
    io?: SocketIOServer
  ): Promise<{
    total: number;
    ingested: number;
    duplicates: number;
    anomalies: number;
    results: IngestResult[];
  }> {
    const results: IngestResult[] = [];
    let anomalies = 0;
    let duplicates = 0;

    for (const evt of batch.events) {
      const res = await this.ingestEvent({ ...evt, tenantId: batch.tenantId, mode: batch.mode }, io);
      results.push(res);
      if (res.isDuplicate) duplicates++;
      if (res.isAnomaly) anomalies++;
    }

    return {
      total: batch.events.length,
      ingested: batch.events.length - duplicates,
      duplicates,
      anomalies,
      results
    };
  }

  /**
   * Returns current live state for all entities under a tenant.
   */
  public getEntitiesForTenant(tenantId: string): EntityLiveState[] {
    const list: EntityLiveState[] = [];
    const nowMs = Date.now();

    for (const [key, state] of this.entityStates.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        const lastSeenMs = new Date(state.lastSeen).getTime();
        // Compute freshness
        let freshness = state.freshness;
        if (state.mode === 'connected') {
          freshness = nowMs - lastSeenMs < 15000 ? 'LIVE' : 'STALE';
        }
        list.push({ ...state, freshness });
      }
    }
    return list;
  }

  /**
   * Queries historical telemetry events for a tenant.
   */
  public async queryTelemetry(tenantId: string, query: Partial<TelemetryQuery> = {}) {
    const since = query.since ? new Date(query.since) : undefined;
    const rawEvents = await defaultEventStore.queryEvents(tenantId, {
      type: query.category ? `telemetry.${query.category}` : undefined,
      since,
      limit: query.limit || 100
    });

    // Filter by entityId and mode if specified
    return rawEvents
      .filter((e) => {
        if (query.entityId && e.payload?.entityId !== query.entityId) return false;
        if (query.mode && query.mode !== 'all' && e.payload?.mode !== query.mode) return false;
        return true;
      })
      .map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        source: e.source,
        category: e.type.replace('telemetry.', ''),
        entityId: e.payload?.entityId,
        metrics: e.payload?.metrics,
        status: e.payload?.status,
        mode: e.payload?.mode,
        timestamp: e.timestamp.toISOString(),
        idempotencyKey: e.idempotencyKey
      }));
  }

  /**
   * Lists detected anomalies for a tenant.
   */
  public getAnomalies(tenantId: string, limit: number = 50): AnomalyFinding[] {
    return this.anomalyHistory
      .filter((a) => a.tenantId === tenantId)
      .slice(0, limit);
  }

  /**
   * Starts a historical telemetry replay session chronologically.
   */
  public async startReplay(
    tenantId: string,
    speedMultiplier: number = 1,
    io?: SocketIOServer
  ): Promise<{ sessionId: string; eventCount: number }> {
    const sessionId = `replay-${randomUUID().slice(0, 8)}`;
    const events = await this.queryTelemetry(tenantId, { limit: 100 });

    if (events.length === 0) {
      return { sessionId, eventCount: 0 };
    }

    // Sort chronologically ascending
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let idx = 0;
    const intervalMs = Math.max(50, Math.floor(1000 / speedMultiplier));

    const intervalId = setInterval(async () => {
      if (idx >= sorted.length) {
        clearInterval(intervalId);
        this.activeReplays.delete(sessionId);
        if (io) io.to(`tenant:${tenantId}`).emit('telemetry:replay_completed', { sessionId });
        return;
      }

      const evt = sorted[idx++]!;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('telemetry:stream', {
          ...evt,
          mode: 'demo',
          freshness: 'REPLAYING'
        });
      }
    }, intervalMs);

    this.activeReplays.set(sessionId, { intervalId, isRunning: true });
    return { sessionId, eventCount: sorted.length };
  }

  /**
   * Stops an active replay session.
   */
  public stopReplay(sessionId: string): boolean {
    const replay = this.activeReplays.get(sessionId);
    if (!replay) return false;
    clearInterval(replay.intervalId);
    this.activeReplays.delete(sessionId);
    return true;
  }

  /**
   * Triggers the full Phase 5 End-to-End interactive demo scenario:
   * CPU surge -> Anomaly -> Live Twin Compromised -> Council Investigation -> Mitigation -> Human Approval -> Audit
   */
  public async triggerDemoScenario(
    tenantId: string,
    targetEntityId: string = 'srv-auth',
    io?: SocketIOServer
  ): Promise<{
    scenario: string;
    telemetryEvent: TelemetryEvent;
    anomalyFinding: AnomalyFinding;
    dossier: CouncilInvestigationDossier;
  }> {
    const now = new Date().toISOString();

    // 1. Establish baseline first so spike is statistically huge
    for (let i = 0; i < 5; i++) {
      defaultPredictiveEngine.evaluate(tenantId, targetEntityId, 'cpu', 35 + (i % 4));
    }

    // 2. Synthesize critical telemetry event
    const demoEvent: TelemetryEvent = {
      id: `evt-demo-${Date.now()}`,
      tenantId,
      source: 'synthetic_demo',
      mode: 'demo',
      category: 'system_metrics',
      entityId: targetEntityId,
      worldId: 'world-default',
      timestamp: now,
      metrics: {
        cpu: 96.5,
        memory: 94.2,
        disk: 68.0,
        networkInKbps: 48500,
        activeConnections: 1420,
        authFailures: 28
      },
      status: 'compromised',
      metadata: {
        syntheticScenario: 'CPU_SPIKE_CREDENTIAL_STUFFING',
        targetDescription: 'Enterprise Authentication Bastion'
      }
    };

    // 3. Ingest event
    const ingestRes = await this.ingestEvent(demoEvent, io);

    // 4. Retrieve dossier
    const dossier = ingestRes.investigationId
      ? defaultCouncilOrchestrator.getInvestigation(ingestRes.investigationId)!
      : await defaultCouncilOrchestrator.executeInvestigation({
          entityId: targetEntityId,
          entityName: 'Enterprise Authentication Server',
          tenantId,
          worldId: 'world-default',
          requestedBy: 'demo-scenario-runner',
          alertHint: 'Demo CPU spike: 96.5% with 28 failed logins detected',
          customTelemetry: demoEvent.metrics
        });

    return {
      scenario: 'End-to-End Real-Time Incident & Autonomous Council Response',
      telemetryEvent: demoEvent,
      anomalyFinding: ingestRes.anomalyFinding!,
      dossier
    };
  }

  /**
   * Clears internal state (for testing).
   */
  public clear(): void {
    this.entityStates.clear();
    this.anomalyHistory = [];
    this.investigationCooldowns.clear();
    for (const [, r] of this.activeReplays.entries()) {
      clearInterval(r.intervalId);
    }
    this.activeReplays.clear();
    this.currentQueueDepth = 0;
  }
}

export const defaultTelemetryService = new TelemetryService();

