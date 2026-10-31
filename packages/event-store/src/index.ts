import { createHash, randomUUID } from 'node:crypto';

export interface StoredEvent {
  id: string;
  tenantId: string;
  type: string;
  source: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  processedAt: Date;
}

export interface EventIngestResult {
  eventId: string;
  idempotencyKey: string;
  isDuplicate: boolean;
  storedAt: Date;
}

export interface IngestBatchResult {
  results: EventIngestResult[];
  totalProcessed: number;
  newEventsCount: number;
  duplicateCount: number;
  throughputEventsPerSec: number;
}

export interface EventQueryOptions {
  type?: string;
  source?: string;
  since?: Date;
  limit?: number;
}

/**
 * Deterministically computes an SHA-256 idempotency key for an event based on its contents.
 */
export function computeEventIdempotencyKey(
  tenantId: string,
  source: string,
  type: string,
  payload: Record<string, unknown>,
  timestamp?: Date | string
): string {
  const tsStr = timestamp instanceof Date ? timestamp.toISOString() : (timestamp || '');
  const sortedKeys = Object.keys(payload).sort();
  const canonicalPayload = JSON.stringify(sortedKeys.map((k) => [k, payload[k]]));

  const raw = `${tenantId}:${source}:${type}:${canonicalPayload}:${tsStr}`;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * Append-only Event Store with Sliding-Window Idempotency Deduplication.
 */
export class EventStore {
  // Key: tenantId -> list of stored events
  private eventsByTenant = new Map<string, StoredEvent[]>();
  // Key: tenantId:idempotencyKey -> eventId
  private seenKeys = new Map<string, { eventId: string; recordedAt: number }>();
  private readonly maxWindowMs: number;

  constructor(windowMinutes: number = 60) {
    this.maxWindowMs = windowMinutes * 60 * 1000;
  }

  private getKey(tenantId: string, idempotencyKey: string): string {
    return `${tenantId}:${idempotencyKey}`;
  }

  public isDuplicate(tenantId: string, idempotencyKey: string): boolean {
    const key = this.getKey(tenantId, idempotencyKey);
    const existing = this.seenKeys.get(key);
    if (!existing) return false;

    // Check sliding window expiration
    if (Date.now() - existing.recordedAt > this.maxWindowMs) {
      this.seenKeys.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Ingests a single event idempotently.
   * If the event has been seen within the sliding window, it immediately returns isDuplicate: true.
   */
  public async ingestEvent(event: {
    tenantId: string;
    type: string;
    source: string;
    idempotencyKey?: string;
    payload: Record<string, unknown>;
    timestamp?: Date;
  }): Promise<EventIngestResult> {
    const key =
      event.idempotencyKey ||
      computeEventIdempotencyKey(
        event.tenantId,
        event.source,
        event.type,
        event.payload,
        event.timestamp
      );

    const fullKey = this.getKey(event.tenantId, key);
    const existing = this.seenKeys.get(fullKey);

    if (existing && Date.now() - existing.recordedAt <= this.maxWindowMs) {
      return {
        eventId: existing.eventId,
        idempotencyKey: key,
        isDuplicate: true,
        storedAt: new Date(existing.recordedAt)
      };
    }

    const eventId = randomUUID();
    const now = new Date();

    const storedEvent: StoredEvent = {
      id: eventId,
      tenantId: event.tenantId,
      type: event.type,
      source: event.source,
      idempotencyKey: key,
      payload: event.payload,
      timestamp: event.timestamp || now,
      processedAt: now
    };

    if (!this.eventsByTenant.has(event.tenantId)) {
      this.eventsByTenant.set(event.tenantId, []);
    }
    this.eventsByTenant.get(event.tenantId)!.push(storedEvent);

    this.seenKeys.set(fullKey, { eventId, recordedAt: now.getTime() });

    return {
      eventId,
      idempotencyKey: key,
      isDuplicate: false,
      storedAt: now
    };
  }

  /**
   * Ingests a high-throughput batch of events with zero duplicate side-effects.
   */
  public async ingestBatch(
    events: Array<{
      tenantId: string;
      type: string;
      source: string;
      idempotencyKey?: string;
      payload: Record<string, unknown>;
      timestamp?: Date;
    }>
  ): Promise<IngestBatchResult> {
    const startTime = performance.now();
    const results: EventIngestResult[] = [];
    let newEventsCount = 0;
    let duplicateCount = 0;

    for (const e of events) {
      const res = await this.ingestEvent(e);
      results.push(res);
      if (res.isDuplicate) {
        duplicateCount++;
      } else {
        newEventsCount++;
      }
    }

    const durationMs = Math.max(1, performance.now() - startTime);
    const throughputEventsPerSec = (events.length / durationMs) * 1000;

    return {
      results,
      totalProcessed: events.length,
      newEventsCount,
      duplicateCount,
      throughputEventsPerSec
    };
  }

  /**
   * Queries stored events for a tenant with filtering.
   */
  public async queryEvents(tenantId: string, options: EventQueryOptions = {}): Promise<StoredEvent[]> {
    const list = this.eventsByTenant.get(tenantId) || [];
    let filtered = list;

    if (options.type) {
      filtered = filtered.filter((e) => e.type === options.type);
    }
    if (options.source) {
      filtered = filtered.filter((e) => e.source === options.source);
    }
    if (options.since) {
      filtered = filtered.filter((e) => e.timestamp >= options.since!);
    }

    // Sort descending by timestamp
    const sorted = [...filtered].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sorted.slice(0, options.limit || 100);
  }

  /**
   * Returns total event count stored for tenant.
   */
  public getCount(tenantId: string): number {
    return (this.eventsByTenant.get(tenantId) || []).length;
  }

  /**
   * Clears internal state (primarily for test resets).
   */
  public clear(): void {
    this.eventsByTenant.clear();
    this.seenKeys.clear();
  }
}

// Global default singleton event store
export const defaultEventStore = new EventStore();
