# P-NEXA — Phase 5 Real-Time Telemetry Pipeline Specification

### 1. Ingestion Architecture

The real-time telemetry ingestion pipeline provides sub-millisecond ingest performance, deduplication against replay attacks, automatic backpressure throttling, and strict tenant isolation.

#### Ingestion Data Flow
```
[ Edge Agent / Probe ]
         │ (HTTP POST JSON)
         ▼
[ Express API: /api/v1/telemetry/ingest or /batch ]
         │
         ├──> [ Tenant Validation Middleware (JWT & Org Matching) ]
         │
         ├──> [ Schema Validation via Zod (TelemetryBatchSchema) ]
         │
         ├──> [ Backpressure Throttler: Queue Depth Guard (Limit: 5000) ]
         │
         ├──> [ Idempotent Event Store: SHA-256 Deduplication ]
         │
         ├──> [ In-Memory Entity Cache: Health Scoring & Freshness Tracker ]
         │
         ├──> [ Predictive Anomaly Engine Evaluation ]
         │
         └──> [ Streaming Broadcaster: Socket.IO & SSE ]
```

---

### 2. Validated Schema Contracts

All telemetry payloads adhere to versioned schemas defined in `@nexus/shared`:

```typescript
export interface TelemetryEvent {
  id?: string;
  tenantId: string;
  worldId: string;
  entityId: string;
  category: 'system' | 'network' | 'security' | 'iot' | 'auth';
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
  status?: 'healthy' | 'degraded' | 'compromised' | 'isolated' | 'offline';
  timestamp?: string;
  schemaVersion?: string; // default: '1.0.0'
  mode?: 'demo' | 'connected';
}
```

---

### 3. Safety Controls & Ingestion Policies

#### 3.1 Backpressure and Concurrency Management
- The pipeline maintains a counter of currently queued telemetry batches.
- If pending work exceeds `maxQueueDepth = 5000`, the ingest route immediately returns HTTP 429:
  ```json
  {
    "error": "Telemetry backpressure limit exceeded. Ingestion throttled.",
    "code": "BACKPRESSURE_EXCEEDED"
  }
  ```
- This prevents memory spikes and worker crashes during synthetic or hostile denial-of-service bursts.

#### 3.2 Idempotency and Deduplication
- Each event without an explicit `id` is assigned a deterministic hash based on its timestamp, tenant, entity, and metric content.
- The `defaultEventStore.append()` method inspects whether the ID exists in the tenant's ledger. Duplicate events are silently acknowledged without triggering duplicate anomaly evaluations or duplicate incident reports.

#### 3.3 Tenant Isolation
- Telemetry queries and ingestion enforce tenant boundaries through `req.tenantId`.
- Even in multi-tenant environments, events submitted for Tenant A are inaccessible to Tenant B, preventing data leaks across organizations.

---

### 4. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/telemetry/ingest` | Ingests a single telemetry event. Evaluates anomaly rules immediately. |
| `POST` | `/api/v1/telemetry/batch` | Ingests up to 500 events in a single transaction. Deduplicated idempotently. |
| `GET` | `/api/v1/telemetry/entities` | Returns current operational states, health scores, and metrics for all entities. |
| `GET` | `/api/v1/telemetry/query` | Queries historical time-series telemetry with metric, entity, and time filters. |
| `GET` | `/api/v1/telemetry/anomalies` | Returns all detected anomalies with statistical evidence and Z-scores. |
| `POST` | `/api/v1/telemetry/replay` | Replays historical telemetry in chronological order for disaster drills. |
| `GET` | `/api/v1/telemetry/stream` | Server-Sent Events (SSE) streaming connection for real-time dashboards. |
| `POST` | `/api/v1/telemetry/demo-scenario` | Triggers a 1-click end-to-end incident simulation for live demonstrations. |
