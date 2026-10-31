# NEXUS OMEGA X — API Contracts Specification

### 1. General Request & Response Standards
- **Standard Headers**:
  - `Authorization: Bearer <jwt_token>`
  - `x-tenant-id: <tenant_uuid_or_slug>` (required for multi-tenant requests)
  - `Content-Type: application/json`
- **Standard Success Response Format**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "timestamp": "2026-10-30T09:20:00.000Z",
      "requestId": "req_abc123"
    }
  }
  ```
- **Standard Error Response Format**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | TAMPER_DETECTED",
      "message": "Human readable explanation",
      "details": []
    }
  }
  ```

---

### 2. Core REST Endpoints (Phase 1 Baseline)

#### 2.1 Health & Diagnostics
- `GET /health` -> Basic liveness check.
- `GET /health/ready` -> Readiness probe verifying MongoDB, Redis, and memory limits.
- `GET /health/live` -> Process liveness and uptime.

#### 2.2 Authentication & Tenants (`/api/v1/auth`)
- `POST /api/v1/auth/register`
  - Body: `{ email, password, firstName, lastName, organizationName, slug }`
  - Response: `{ user, tenant, accessToken, refreshToken }`
- `POST /api/v1/auth/login`
  - Body: `{ email, password, tenantSlug? }`
  - Response: `{ user, tenant, accessToken, refreshToken }`
- `POST /api/v1/auth/refresh`
  - Body: `{ refreshToken }`
  - Response: `{ accessToken, refreshToken }`
- `GET /api/v1/auth/me`
  - Response: `{ user, currentTenant, availableTenants, permissions }`

#### 2.3 Tenant Administration (`/api/v1/organizations`)
- `GET /api/v1/organizations` -> List accessible tenants for user.
- `POST /api/v1/organizations` -> Create new tenant (SuperAdmin or authorized Org Admin).
- `GET /api/v1/organizations/:id` -> Retrieve tenant details, limits, and status.
- `POST /api/v1/organizations/switch` -> Switch active tenant token.

#### 2.4 Governance & Audit Ledger (`/api/v1/audit`)
- `GET /api/v1/audit` -> Query audit events with pagination, actor, and action filters.
- `GET /api/v1/audit/verify` -> Cryptographically traverse and verify SHA-256 chain integrity.
- `POST /api/v1/audit/tamper-test` -> (Dev/Auditor only) Simulates tampering to verify chain integrity checks catch it.

---

### 3. Real-Time Socket.IO Event Protocol
Namespace: `/realtime`
Authentication: Handshake auth with JWT token.
Rooms: `tenant:<tenantId>`, `world:<worldId>`, `sim:<scenarioId>`

- **Client -> Server Events**:
  - `join_tenant`: `(tenantId)`
  - `join_simulation`: `(scenarioId)`
  - `leave_simulation`: `(scenarioId)`
  - `agent_command`: `({ agentId, action, params })`
- **Server -> Client Events**:
  - `telemetry:metric`: `({ tick, cpuLoad, networkTraffic, alertsCount })`
  - `incident:detected`: `({ incidentId, severity, affectedNode, tactic })`
  - `agent:state_changed`: `({ agentId, status, currentTask })`
  - `sim:tick`: `({ scenarioId, tick, stateDelta })`
  - `audit:appended`: `({ sequenceNumber, action, actor, currentHash })`

