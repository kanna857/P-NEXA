export * from './types.js';
export * from './policy-store.js';
export * from './benchmark.js';
export * from './promotion-gate.js';
export * from './optimizer.js';

// Backward compatibility helper
export function evaluatePolicyMetrics(score: number, fpr: number): boolean {
  return score >= 0.85 && fpr <= 0.05;
}
