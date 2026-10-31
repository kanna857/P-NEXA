import { randomUUID } from 'node:crypto';

export type AgentMemoryType = 'observation' | 'reflection' | 'plan' | 'incident_fact';

export interface AgentMemoryEntry {
  id: string;
  tenantId: string;
  agentId: string;
  type: AgentMemoryType;
  content: string;
  importance: number; // 1 to 10
  embedding: number[];
  referencedEntities: string[];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface MemoryRetrievalQuery {
  queryText?: string;
  queryEmbedding?: number[];
  filterEntities?: string[];
  memoryTypes?: AgentMemoryType[];
  topK?: number;
  alpha?: number; // recency weight, default 1.0
  beta?: number; // importance weight, default 1.0
  gamma?: number; // relevance weight, default 1.5
  decayHalfLifeHours?: number; // default 24
}

export interface MemoryRetrievalResult {
  entry: AgentMemoryEntry;
  score: number;
  scores: {
    recency: number;
    importance: number;
    relevance: number;
  };
}

/**
 * Computes cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Deterministically generates a unit-normalized mock embedding vector from text.
 * Suitable for deterministic offline testing and algorithmic evaluation.
 */
export function generateMockEmbedding(text: string, dimensions: number = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return vector;

  for (let w = 0; w < words.length; w++) {
    const word = words[w]!;
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const index = (charCode * 31 + i * 17 + w * 13) % dimensions;
      vector[index] += 1;
    }
  }

  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return norm > 0 ? vector.map((v) => v / norm) : vector;
}

/**
 * In-Memory Vector Store for Agent Memory partitioned by tenant and agent.
 */
export class VectorMemoryStore {
  // Key: tenantId:agentId -> List of memories
  private memories = new Map<string, AgentMemoryEntry[]>();

  private getStoreKey(tenantId: string, agentId: string): string {
    return `${tenantId}:${agentId}`;
  }

  /**
   * Adds an episodic memory entry into the store.
   */
  public async addMemory(params: {
    tenantId: string;
    agentId: string;
    type: AgentMemoryType;
    content: string;
    importance: number;
    embedding?: number[];
    referencedEntities?: string[];
    createdAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<AgentMemoryEntry> {
    const key = this.getStoreKey(params.tenantId, params.agentId);
    if (!this.memories.has(key)) {
      this.memories.set(key, []);
    }

    const embedding = params.embedding || generateMockEmbedding(params.content);
    const entry: AgentMemoryEntry = {
      id: randomUUID(),
      tenantId: params.tenantId,
      agentId: params.agentId,
      type: params.type,
      content: params.content,
      importance: Math.min(10, Math.max(1, params.importance)),
      embedding,
      referencedEntities: params.referencedEntities || [],
      createdAt: params.createdAt || new Date(),
      metadata: params.metadata || {}
    };

    this.memories.get(key)!.push(entry);
    return entry;
  }

  /**
   * Retrieves memories using tri-factor cognitive scoring:
   * score = alpha * recency + beta * importance + gamma * relevance
   */
  public async retrieve(
    tenantId: string,
    agentId: string,
    query: MemoryRetrievalQuery
  ): Promise<MemoryRetrievalResult[]> {
    const key = this.getStoreKey(tenantId, agentId);
    const list = this.memories.get(key) || [];
    if (list.length === 0) return [];

    const alpha = query.alpha ?? 1.0;
    const beta = query.beta ?? 1.0;
    const gamma = query.gamma ?? 1.5;
    const topK = query.topK ?? 5;
    const halfLifeHours = query.decayHalfLifeHours ?? 24;

    const queryEmbedding = query.queryEmbedding || (query.queryText ? generateMockEmbedding(query.queryText) : null);
    const now = Date.now();

    const scoredResults: MemoryRetrievalResult[] = [];

    for (const entry of list) {
      // Filter by type if provided
      if (query.memoryTypes && query.memoryTypes.length > 0 && !query.memoryTypes.includes(entry.type)) {
        continue;
      }

      // Filter by entities if provided
      if (query.filterEntities && query.filterEntities.length > 0) {
        const matchesEntity = query.filterEntities.some((e) => entry.referencedEntities.includes(e));
        if (!matchesEntity) continue;
      }

      // 1. Recency score using exponential decay: e^(-lambda * deltaHours)
      const ageHours = Math.max(0, (now - entry.createdAt.getTime()) / (1000 * 60 * 60));
      const lambda = Math.LN2 / halfLifeHours;
      const recencyScore = Math.exp(-lambda * ageHours);

      // 2. Importance score normalized to 0..1
      const importanceScore = entry.importance / 10;

      // 3. Semantic relevance score via cosine similarity
      let relevanceScore = 0.5; // neutral fallback if no query embedding
      if (queryEmbedding && entry.embedding.length > 0) {
        relevanceScore = Math.max(0, cosineSimilarity(queryEmbedding, entry.embedding));
      }

      const totalScore = alpha * recencyScore + beta * importanceScore + gamma * relevanceScore;

      scoredResults.push({
        entry,
        score: totalScore,
        scores: {
          recency: recencyScore,
          importance: importanceScore,
          relevance: relevanceScore
        }
      });
    }

    // Sort descending by total score
    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, topK);
  }

  /**
   * Retrieves all memories referencing a particular entity (e.g., node ID, IP, CVE).
   */
  public async getMemoriesByEntity(tenantId: string, entityId: string): Promise<AgentMemoryEntry[]> {
    const results: AgentMemoryEntry[] = [];
    for (const [key, list] of this.memories.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        for (const entry of list) {
          if (entry.referencedEntities.includes(entityId)) {
            results.push(entry);
          }
        }
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Lists all memories for an agent sorted by creation date descending.
   */
  public async getRecentMemories(tenantId: string, agentId: string, limit: number = 20): Promise<AgentMemoryEntry[]> {
    const key = this.getStoreKey(tenantId, agentId);
    const list = this.memories.get(key) || [];
    return [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  /**
   * Clears in-memory entries (primarily for testing).
   */
  public clearStore(): void {
    this.memories.clear();
  }
}

/**
 * Reflection Engine that monitors accumulated observations and synthesizes high-level reflections.
 */
export class ReflectionEngine {
  private accumulatedImportance = new Map<string, number>();
  private readonly threshold: number;
  private readonly memoryStore: VectorMemoryStore;

  constructor(memoryStore: VectorMemoryStore, threshold: number = 30) {
    this.memoryStore = memoryStore;
    this.threshold = threshold;
  }

  private getKey(tenantId: string, agentId: string): string {
    return `${tenantId}:${agentId}`;
  }

  /**
   * Records observation importance and triggers reflection synthesis when the threshold is crossed.
   */
  public async recordObservationAndCheck(
    tenantId: string,
    agentId: string,
    observation: {
      content: string;
      importance: number;
      referencedEntities?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ memoryEntry: AgentMemoryEntry; synthesizedReflection?: AgentMemoryEntry }> {
    // 1. Store observation
    const memoryEntry = await this.memoryStore.addMemory({
      tenantId,
      agentId,
      type: 'observation',
      content: observation.content,
      importance: observation.importance,
      referencedEntities: observation.referencedEntities,
      metadata: observation.metadata
    });

    // 2. Accumulate importance
    const key = this.getKey(tenantId, agentId);
    const currentAcc = (this.accumulatedImportance.get(key) || 0) + observation.importance;
    this.accumulatedImportance.set(key, currentAcc);

    // 3. Synthesize reflection if threshold exceeded
    if (currentAcc >= this.threshold) {
      this.accumulatedImportance.set(key, 0); // reset counter

      const recentObservations = await this.memoryStore.getRecentMemories(tenantId, agentId, 10);
      const topObservations = recentObservations.filter((m) => m.type === 'observation').slice(0, 5);

      const synthesizedText = this.synthesizeReflectionText(topObservations);

      // Collect all entities mentioned in observations
      const allEntities = Array.from(new Set(topObservations.flatMap((o) => o.referencedEntities)));

      const synthesizedReflection = await this.memoryStore.addMemory({
        tenantId,
        agentId,
        type: 'reflection',
        content: synthesizedText,
        importance: 9, // high significance
        referencedEntities: allEntities,
        metadata: {
          synthesizedFromCount: topObservations.length,
          sourceObservationIds: topObservations.map((o) => o.id)
        }
      });

      return { memoryEntry, synthesizedReflection };
    }

    return { memoryEntry };
  }

  private synthesizeReflectionText(observations: AgentMemoryEntry[]): string {
    if (observations.length === 0) return 'General security state baseline maintained.';

    const entityCounts = new Map<string, number>();
    for (const obs of observations) {
      for (const ent of obs.referencedEntities) {
        entityCounts.set(ent, (entityCounts.get(ent) || 0) + 1);
      }
    }

    const recurringEntities = Array.from(entityCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([ent]) => ent);

    if (recurringEntities.length > 0) {
      return `Correlated Security Insight: Recurring telemetry activity detected involving [${recurringEntities.join(
        ', '
      )}]. Recommending containment validation and deep packet anomaly review across lateral edges.`;
    }

    return `Synthesized Pattern: High-impact security activity observed across ${observations.length} recent events. Defense posture heightened.`;
  }
}

// Global default singleton store
export const defaultMemoryStore = new VectorMemoryStore();
export const defaultReflectionEngine = new ReflectionEngine(defaultMemoryStore);
