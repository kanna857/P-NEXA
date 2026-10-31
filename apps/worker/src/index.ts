import { rootLogger } from '@nexus/observability';
import {
  RawTelemetryEvent,
  normalizeThreatEvent,
  defaultIncidentManager,
  CyberIncident
} from '@nexus/cyber-engine';
import { defaultEventStore, IngestBatchResult } from '@nexus/event-store';

const logger = rootLogger.child({ component: 'WorkerService' });

export interface PipelineBatchReport {
  batchResult: IngestBatchResult;
  normalizedCount: number;
  incidentsCreated: CyberIncident[];
  incidentsUpdated: CyberIncident[];
}

/**
 * High-performance batch processing pipeline.
 * Performs sliding-window idempotency deduplication, normalization,
 * MITRE ATT&CK taxonomy mapping, IOC enrichment, and automated incident correlation.
 */
export async function processTelemetryBatch(
  events: RawTelemetryEvent[]
): Promise<PipelineBatchReport> {
  const storeEvents = events.map((e) => ({
    tenantId: e.tenantId,
    type: e.eventType,
    source: e.sourceSystem,
    idempotencyKey: (e as any).idempotencyKey,
    payload: e.payload || (e as any),
    timestamp: e.timestamp ? new Date(e.timestamp) : undefined
  }));

  // Step 1: High-throughput idempotent deduplication
  const batchResult = await defaultEventStore.ingestBatch(storeEvents);

  const incidentsCreated: CyberIncident[] = [];
  const incidentsUpdated: CyberIncident[] = [];
  let normalizedCount = 0;

  // Step 2: Process only non-duplicate events
  for (let i = 0; i < events.length; i++) {
    const ingestRes = batchResult.results[i]!;
    if (ingestRes.isDuplicate) continue;

    const raw = events[i]!;
    normalizedCount++;

    // Step 3: Normalization
    const norm = normalizeThreatEvent(raw);

    // Step 4: MITRE + IOC + Anomaly Aggregation
    const incidentRes = await defaultIncidentManager.processEvent(norm);

    if (incidentRes.incident) {
      if (incidentRes.isNewIncident) {
        incidentsCreated.push(incidentRes.incident);
      } else {
        incidentsUpdated.push(incidentRes.incident);
      }
    }
  }

  logger.info('Processed telemetry batch', {
    total: events.length,
    newEvents: batchResult.newEventsCount,
    duplicates: batchResult.duplicateCount,
    incidentsCreated: incidentsCreated.length
  });

  return {
    batchResult,
    normalizedCount,
    incidentsCreated,
    incidentsUpdated
  };
}

async function startWorker() {
  logger.info('NEXUS OMEGA X Cyber Intelligence Background Worker running');
}

// Only start background daemon if executed directly
if (process.argv[1] && process.argv[1].endsWith('worker/src/index.ts')) {
  startWorker().catch((err) => {
    logger.fatal('Worker crashed during bootstrap', err);
    process.exit(1);
  });
}
