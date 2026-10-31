import { Router } from 'express';
import { Permissions, NotFoundError, ValidationError } from '@nexus/shared';
import {
  RawTelemetryEvent,
  normalizeThreatEvent,
  defaultIncidentManager,
  IncidentSeverity,
  IncidentStatus
} from '@nexus/cyber-engine';
import { defaultEventStore } from '@nexus/event-store';
import {
  createSocietyWorkflow,
  executeSocietyWorkflow
} from '@nexus/agent-engine';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';
import { WorldStore } from '../db/worldStore.js';
import { recordAuditEvent } from '../services/auditService.js';

export const incidentsRouter = Router();

incidentsRouter.use(authMiddleware);
incidentsRouter.use(tenantMiddleware);

// Helper to normalize nodes & edges
function normNodes(nodes: any[]): any[] {
  return (nodes || []).map((n) => {
    const raw = n && typeof n.toObject === 'function' ? n.toObject() : (n._doc || n);
    return { ...raw, id: raw.nodeId || raw.id };
  });
}
function normEdges(edges: any[]): any[] {
  return (edges || []).map((e) => {
    const raw = e && typeof e.toObject === 'function' ? e.toObject() : (e._doc || e);
    return { ...raw, id: raw.edgeId || raw.id };
  });
}

// ── 1. Idempotent Telemetry Ingestion Endpoint ──────────────────────────────
incidentsRouter.post(
  '/telemetry/ingest',
  requirePermission(Permissions.INCIDENT_WRITE),
  async (req, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const body = req.body;

      // Accept single event or array of events
      const rawEvents: RawTelemetryEvent[] = Array.isArray(body)
        ? body
        : Array.isArray(body.events)
        ? body.events
        : [body];

      if (rawEvents.length === 0) {
        throw new ValidationError('At least one telemetry event is required');
      }

      const storeEvents = rawEvents.map((e) => ({
        tenantId,
        type: e.eventType || 'UNKNOWN_TELEMETRY',
        source: e.sourceSystem || 'edge-sensor',
        idempotencyKey: (e as any).idempotencyKey,
        payload: e.payload || (e as any),
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date()
      }));

      // High-throughput deduplication via sliding window event store
      const batchResult = await defaultEventStore.ingestBatch(storeEvents);

      const incidentsCreated = [];
      const incidentsUpdated = [];

      for (let i = 0; i < rawEvents.length; i++) {
        const ingestRes = batchResult.results[i]!;
        if (ingestRes.isDuplicate) continue;

        const raw = { ...rawEvents[i]!, tenantId };
        const norm = normalizeThreatEvent(raw);
        const incidentRes = await defaultIncidentManager.processEvent(norm);

        if (incidentRes.incident) {
          if (incidentRes.isNewIncident) {
            incidentsCreated.push(incidentRes.incident);
          } else {
            incidentsUpdated.push(incidentRes.incident);
          }
        }
      }

      // Real-time broadcast via Socket.IO
      const io = (req as any).io;
      if (io) {
        io.to(`tenant:${tenantId}`).emit('telemetry:ingested', {
          total: rawEvents.length,
          newEvents: batchResult.newEventsCount,
          duplicates: batchResult.duplicateCount
        });

        for (const inc of incidentsCreated) {
          io.to(`tenant:${tenantId}`).emit('incident:detected', inc);
        }
      }

      await recordAuditEvent({
        tenantId,
        action: 'TELEMETRY_BATCH_INGESTED',
        actor: { userId: req.user!.userId },
        targetResource: { type: 'TelemetryPipeline', id: `batch-${Date.now()}` },
        payload: {
          totalProcessed: rawEvents.length,
          newCount: batchResult.newEventsCount,
          duplicateCount: batchResult.duplicateCount,
          incidentsCreatedCount: incidentsCreated.length
        }
      });

      res.status(201).json({
        success: true,
        data: {
          batchResult,
          incidentsCreated,
          incidentsUpdated
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 2. List Correlated Cyber Incidents ──────────────────────────────────────
incidentsRouter.get('/', requirePermission(Permissions.INCIDENT_READ), async (req, res, next) => {
  try {
    const { severity, status } = req.query as {
      severity?: IncidentSeverity;
      status?: IncidentStatus;
    };

    const incidents = defaultIncidentManager.getIncidents(req.tenantId!, {
      severity,
      status
    });

    res.json({ success: true, data: incidents });
  } catch (err) {
    next(err);
  }
});

// ── 3. Get Single Cyber Incident by ID ──────────────────────────────────────
incidentsRouter.get('/:id', requirePermission(Permissions.INCIDENT_READ), async (req, res, next) => {
  try {
    const incident = defaultIncidentManager.getIncidentById(req.params.id!);
    if (!incident || incident.tenantId !== req.tenantId) {
      throw new NotFoundError('Cyber Incident');
    }

    res.json({ success: true, data: incident });
  } catch (err) {
    next(err);
  }
});

// ── 4. Update Cyber Incident Status ─────────────────────────────────────────
incidentsRouter.patch(
  '/:id/status',
  requirePermission(Permissions.INCIDENT_REMEDIATE),
  async (req, res, next) => {
    try {
      const { status } = req.body as { status: IncidentStatus };
      if (!['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'].includes(status)) {
        throw new ValidationError('Invalid incident status');
      }

      const incident = defaultIncidentManager.getIncidentById(req.params.id!);
      if (!incident || incident.tenantId !== req.tenantId) {
        throw new NotFoundError('Cyber Incident');
      }

      const updated = defaultIncidentManager.updateIncidentStatus(req.params.id!, status);

      await recordAuditEvent({
        tenantId: req.tenantId!,
        action: 'CYBER_INCIDENT_STATUS_UPDATED',
        actor: { userId: req.user!.userId },
        targetResource: { type: 'CyberIncident', id: req.params.id! },
        payload: { oldStatus: incident.status, newStatus: status }
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ── 5. Autonomous Triage Handoff to Multi-Agent AI Society ──────────────────
incidentsRouter.post(
  '/:id/triage-with-agents',
  requirePermission(Permissions.AGENT_COMMAND),
  async (req, res, next) => {
    try {
      const { worldId } = req.body;
      if (!worldId) {
        throw new ValidationError('worldId is required to triage incident against twin world');
      }

      const incident = defaultIncidentManager.getIncidentById(req.params.id!);
      if (!incident || incident.tenantId !== req.tenantId) {
        throw new NotFoundError('Cyber Incident');
      }

      const world = await WorldStore.findWorldByIdAndTenant(worldId, req.tenantId!);
      if (!world) throw new NotFoundError('Digital Twin World');

      const nodes = normNodes(world.nodes as any);
      const edges = normEdges(world.edges as any);

      // Create workflow with incident mapped to SecurityAlert
      const workflow = createSocietyWorkflow({
        incidentId: incident.id,
        tenantId: req.tenantId!,
        worldId,
        alert: {
          id: incident.id,
          sourceNodeId: incident.affectedNodeIds[0] || 'app-01',
          title: incident.title,
          description: incident.summary,
          rawPayload: { mitreTechnique: incident.mitreTechnique, iocs: incident.iocs },
          timestamp: incident.detectedAt
        },
        nodes,
        edges
      });

      const finalState = await executeSocietyWorkflow(workflow);

      // Update incident status to INVESTIGATING
      defaultIncidentManager.updateIncidentStatus(incident.id, 'INVESTIGATING');

      res.json({
        success: true,
        data: {
          incidentId: incident.id,
          workflowState: finalState
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

