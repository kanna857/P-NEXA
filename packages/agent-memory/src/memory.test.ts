import { describe, it, expect, beforeEach } from 'vitest';
import {
  VectorMemoryStore,
  ReflectionEngine,
  cosineSimilarity,
  generateMockEmbedding
} from './index.js';

describe('Agent Memory — Vector Index & Cognitive Retrieval', () => {
  let memoryStore: VectorMemoryStore;
  let reflectionEngine: ReflectionEngine;

  beforeEach(() => {
    memoryStore = new VectorMemoryStore();
    reflectionEngine = new ReflectionEngine(memoryStore, 25); // threshold of 25 for quick trigger
  });

  it('cosineSimilarity correctly computes vector orientations', () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];
    const v4 = [-1, 0, 0];

    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
    expect(cosineSimilarity(v1, v4)).toBeCloseTo(-1.0);
  });

  it('generateMockEmbedding generates deterministic normalized vectors', () => {
    const text = 'Unauthorized lateral movement detected from 10.0.2.15';
    const emb1 = generateMockEmbedding(text);
    const emb2 = generateMockEmbedding(text);

    expect(emb1).toEqual(emb2);
    expect(emb1.length).toBe(64);

    // Verify unit length
    const magnitude = Math.sqrt(emb1.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0);
  });

  it('VectorMemoryStore adds and partitions memories strictly by tenant and agent', async () => {
    const entryA = await memoryStore.addMemory({
      tenantId: 'tenant-alpha',
      agentId: 'agent-soc-1',
      type: 'observation',
      content: 'Firewall drop rate spiked 400%',
      importance: 7,
      referencedEntities: ['fw-01']
    });

    await memoryStore.addMemory({
      tenantId: 'tenant-beta',
      agentId: 'agent-soc-1',
      type: 'observation',
      content: 'Routine health check ok',
      importance: 2
    });

    expect(entryA.id).toBeDefined();
    expect(entryA.tenantId).toBe('tenant-alpha');

    // Tenant alpha should only retrieve its own memories
    const alphaMemories = await memoryStore.getRecentMemories('tenant-alpha', 'agent-soc-1');
    expect(alphaMemories.length).toBe(1);
    expect(alphaMemories[0]!.content).toContain('Firewall drop rate');

    const betaMemories = await memoryStore.getRecentMemories('tenant-beta', 'agent-soc-1');
    expect(betaMemories.length).toBe(1);
    expect(betaMemories[0]!.content).toContain('Routine health check');
  });

  it('retrieves memories with tri-factor scoring (recency, importance, semantic relevance)', async () => {
    const tenantId = 'tenant-corp';
    const agentId = 'agent-hunter';

    // 1. Old memory with high importance
    const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    await memoryStore.addMemory({
      tenantId,
      agentId,
      type: 'incident_fact',
      content: 'Targeted spear-phishing payload observed on workstation-09',
      importance: 9,
      createdAt: pastDate,
      referencedEntities: ['workstation-09']
    });

    // 2. Recent memory with low importance
    await memoryStore.addMemory({
      tenantId,
      agentId,
      type: 'observation',
      content: 'Normal DNS resolution baseline check',
      importance: 2,
      createdAt: new Date()
    });

    // 3. Recent highly relevant memory
    await memoryStore.addMemory({
      tenantId,
      agentId,
      type: 'observation',
      content: 'Spear-phishing credential harvesting link clicked by workstation user',
      importance: 8,
      createdAt: new Date(),
      referencedEntities: ['workstation-09']
    });

    const results = await memoryStore.retrieve(tenantId, agentId, {
      queryText: 'spear phishing credential threat',
      topK: 2,
      alpha: 1.0,
      beta: 1.0,
      gamma: 2.0
    });

    expect(results.length).toBe(2);
    // The most relevant recent memory should be ranked first
    expect(results[0]!.entry.content).toContain('credential harvesting');
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
  });

  it('filters memory retrieval by referenced entities', async () => {
    const tenantId = 'tenant-corp';
    const agentId = 'agent-responder';

    await memoryStore.addMemory({
      tenantId,
      agentId,
      type: 'plan',
      content: 'Isolate server-app-01 from database cluster',
      importance: 8,
      referencedEntities: ['server-app-01', 'db-cluster-01']
    });

    await memoryStore.addMemory({
      tenantId,
      agentId,
      type: 'plan',
      content: 'Restart edge ingress proxy',
      importance: 5,
      referencedEntities: ['ingress-proxy-01']
    });

    const results = await memoryStore.retrieve(tenantId, agentId, {
      filterEntities: ['db-cluster-01']
    });

    expect(results.length).toBe(1);
    expect(results[0]!.entry.referencedEntities).toContain('server-app-01');
  });

  it('getMemoriesByEntity finds all memories across agents referencing a specific asset', async () => {
    const tenantId = 'tenant-corp';

    await memoryStore.addMemory({
      tenantId,
      agentId: 'soc-triage',
      type: 'observation',
      content: 'Port scan detected on db-01',
      importance: 6,
      referencedEntities: ['db-01']
    });

    await memoryStore.addMemory({
      tenantId,
      agentId: 'incident-responder',
      type: 'plan',
      content: 'Schedule zero-trust token rotation on db-01',
      importance: 8,
      referencedEntities: ['db-01']
    });

    const dbMemories = await memoryStore.getMemoriesByEntity(tenantId, 'db-01');
    expect(dbMemories.length).toBe(2);
  });

  it('ReflectionEngine automatically synthesizes high-level reflection when accumulated importance crosses threshold', async () => {
    const tenantId = 'tenant-defense';
    const agentId = 'agent-soc-triage';

    // Add observations with cumulative importance: 10 + 10 = 20 (threshold is 25)
    const res1 = await reflectionEngine.recordObservationAndCheck(tenantId, agentId, {
      content: 'SQL injection attempt against app-01 endpoint /api/auth',
      importance: 10,
      referencedEntities: ['app-01']
    });
    expect(res1.synthesizedReflection).toBeUndefined();

    const res2 = await reflectionEngine.recordObservationAndCheck(tenantId, agentId, {
      content: 'Second injection attempt against app-01 endpoint /api/users',
      importance: 10,
      referencedEntities: ['app-01']
    });
    expect(res2.synthesizedReflection).toBeUndefined();

    // 3rd observation: 20 + 8 = 28 >= 25 -> triggers reflection synthesis!
    const res3 = await reflectionEngine.recordObservationAndCheck(tenantId, agentId, {
      content: 'Data exfiltration query pattern seen targeting app-01 and db-01',
      importance: 8,
      referencedEntities: ['app-01', 'db-01']
    });

    expect(res3.synthesizedReflection).toBeDefined();
    expect(res3.synthesizedReflection!.type).toBe('reflection');
    expect(res3.synthesizedReflection!.importance).toBe(9);
    expect(res3.synthesizedReflection!.referencedEntities).toContain('app-01');
    expect(res3.synthesizedReflection!.content).toContain('Correlated Security Insight');

    // Check that reflection was persisted in memory store
    const recent = await memoryStore.getRecentMemories(tenantId, agentId);
    const hasReflection = recent.some((m) => m.type === 'reflection');
    expect(hasReflection).toBe(true);
  });
});
