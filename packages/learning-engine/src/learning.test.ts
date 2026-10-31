import { describe, it, expect, beforeEach } from 'vitest';
import {
  bumpMinorVersion,
  bumpPatchVersion,
  computePolicyHash,
  PolicyStore
} from './policy-store.js';
import {
  runBenchmarkSuite,
  comparePoliciesAB
} from './benchmark.js';
import { PromotionGateManager } from './promotion-gate.js';
import { PolicyOptimizer } from './optimizer.js';
import { DefensePolicyParameters } from './types.js';

describe('Phase 6: Strategy Evaluation & Controlled Self-Improvement', () => {
  let policyStore: PolicyStore;
  let promotionManager: PromotionGateManager;
  let optimizer: PolicyOptimizer;

  const standardParameters: DefensePolicyParameters = {
    containmentThreshold: 'HIGH',
    maxLateralHops: 2,
    isolationStrategy: 'AGGRESSIVE_ISOLATE',
    requireDualCustodyApproval: false,
    confidenceThreshold: 0.7,
    maxAutonomousSeverances: 3
  };

  const conservativeParameters: DefensePolicyParameters = {
    containmentThreshold: 'CRITICAL',
    maxLateralHops: 1,
    isolationStrategy: 'OBSERVE_AND_REPORT',
    requireDualCustodyApproval: true,
    confidenceThreshold: 0.95,
    maxAutonomousSeverances: 0
  };

  beforeEach(() => {
    policyStore = new PolicyStore();
    promotionManager = new PromotionGateManager(policyStore);
    optimizer = new PolicyOptimizer(policyStore);
  });

  describe('Policy Store & Semantic Versioning', () => {
    it('creates versioned defense policy with canonical immutable hash', () => {
      const policy = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Standard Defensive Containment',
        description: 'Automated isolation for high severity threat telemetry',
        version: '1.0.0',
        status: 'DRAFT',
        parameters: standardParameters
      });

      expect(policy.id).toBeDefined();
      expect(policy.version).toBe('1.0.0');
      expect(policy.status).toBe('DRAFT');
      expect(policy.immutableHash).toMatch(/^[a-f0-9]{64}$/);

      // Verify hash determinism
      const expectedHash = computePolicyHash(
        'tenant-omega',
        'Standard Defensive Containment',
        '1.0.0',
        standardParameters
      );
      expect(policy.immutableHash).toBe(expectedHash);
    });

    it('correctly increments minor and patch semantic versions', () => {
      expect(bumpMinorVersion('1.0.0')).toBe('1.1.0');
      expect(bumpMinorVersion('1.4.2')).toBe('1.5.0');
      expect(bumpPatchVersion('1.1.0')).toBe('1.1.1');
    });
  });

  describe('Benchmark Suite & Quantitative Evaluation', () => {
    it('runs candidate policy through standard synthetic cyber incident benchmarks', () => {
      const policy = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Aggressive Isolation Policy',
        description: 'Immediate quarantine of compromised hosts',
        version: '1.0.0',
        parameters: standardParameters
      });

      const suiteResult = runBenchmarkSuite(policy);

      expect(suiteResult.totalCases).toBe(2);
      expect(suiteResult.passedCases).toBe(2);
      expect(suiteResult.passedAll).toBe(true);
      expect(suiteResult.meanContainmentRate).toBe(1.0);
      expect(suiteResult.meanMTTC).toBeLessThanOrEqual(4);
      expect(suiteResult.compositeScore).toBeGreaterThanOrEqual(75);
      expect(suiteResult.isEligibleForPromotion).toBe(true);
    });

    it('identifies policy failure when conservative policy allows threat spread', () => {
      const passivePolicy = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Passive Observe-Only Policy',
        description: 'Observe without automated containment actions',
        version: '1.0.0',
        parameters: conservativeParameters
      });

      const suiteResult = runBenchmarkSuite(passivePolicy);

      // Without containment, benchmark cases should fail
      expect(suiteResult.passedAll).toBe(false);
      expect(suiteResult.isEligibleForPromotion).toBe(false);
    });
  });

  describe('A/B Benchmark Comparison & Regression Detection', () => {
    it('detects regression and recommends REJECT when candidate performs worse than active baseline', () => {
      const activePolicy = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Active Baseline Policy',
        description: 'Current standard containment',
        version: '1.0.0',
        status: 'ACTIVE',
        parameters: standardParameters
      });

      const degradedCandidate = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Degraded Candidate Policy',
        description: 'Too passive',
        version: '1.1.0',
        status: 'CANDIDATE',
        parameters: conservativeParameters
      });

      const comparison = comparePoliciesAB(activePolicy, degradedCandidate);

      expect(comparison.isRegression).toBe(true);
      expect(comparison.recommendation).toBe('REJECT');
      expect(comparison.scoreDelta).toBeLessThan(0);
      expect(comparison.summary).toContain('regression');
    });

    it('recommends PROMOTE when candidate policy meets or exceeds active baseline', () => {
      const activePolicy = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Active Baseline Policy',
        description: 'Standard baseline',
        version: '1.0.0',
        status: 'ACTIVE',
        parameters: standardParameters
      });

      const improvedCandidate = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Optimized Candidate Policy',
        description: 'Tuned perimeter containment',
        version: '1.1.0',
        status: 'CANDIDATE',
        parameters: {
          ...standardParameters,
          maxAutonomousSeverances: 4
        }
      });

      const comparison = comparePoliciesAB(activePolicy, improvedCandidate);

      expect(comparison.isRegression).toBe(false);
      expect(comparison.recommendation).toBe('PROMOTE');
      expect(comparison.candidateCompositeScore).toBeGreaterThanOrEqual(75);
    });
  });

  describe('Automated Promotion Gate Enforcement', () => {
    it('blocks promotion of underperforming candidate policy', () => {
      const badCandidate = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Defective Policy Candidate',
        description: 'Will fail benchmark',
        version: '1.0.1',
        status: 'CANDIDATE',
        parameters: conservativeParameters
      });

      const gateResult = promotionManager.evaluateAndPromote(
        'tenant-omega',
        badCandidate.id,
        'user-sec-officer'
      );

      expect(gateResult.promoted).toBe(false);
      expect(gateResult.reason).toContain('Promotion Gate Blocked');
      expect(badCandidate.status).toBe('REJECTED');
    });

    it('promotes passing candidate to ACTIVE and automatically archives previous active policy', () => {
      const activePolicy = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Active Baseline Policy',
        description: 'Current active',
        version: '1.0.0',
        status: 'ACTIVE',
        parameters: standardParameters
      });

      const goodCandidate = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'New Generation Containment',
        description: 'Evaluated candidate',
        version: '1.1.0',
        status: 'CANDIDATE',
        parameters: standardParameters
      });

      const gateResult = promotionManager.evaluateAndPromote(
        'tenant-omega',
        goodCandidate.id,
        'user-admin'
      );

      expect(gateResult.promoted).toBe(true);
      expect(gateResult.policy.status).toBe('ACTIVE');
      expect(gateResult.policy.promotedBy).toBe('user-admin');
      expect(gateResult.archivedPreviousPolicyId).toBe(activePolicy.id);

      // Verify previous active policy was archived
      const previous = policyStore.getPolicy('tenant-omega', activePolicy.id);
      expect(previous?.status).toBe('ARCHIVED');
    });
  });

  describe('Controlled Self-Improvement Policy Optimizer', () => {
    it('synthesizes optimized candidate policy from observed metrics without arbitrary code execution', () => {
      const sourcePolicy = policyStore.createPolicy({
        tenantId: 'tenant-omega',
        name: 'Field Policy Alpha',
        description: 'Standard deployed policy',
        version: '1.0.0',
        status: 'ACTIVE',
        parameters: {
          containmentThreshold: 'HIGH',
          maxLateralHops: 1,
          isolationStrategy: 'SELECTIVE_SEVER',
          requireDualCustodyApproval: false,
          confidenceThreshold: 0.8,
          maxAutonomousSeverances: 1
        }
      });

      // Provide operational telemetry showing slow MTTC (4.5 ticks)
      const proposal = optimizer.synthesizeOptimization('tenant-omega', sourcePolicy.id, {
        meanMTTC: 4.5,
        meanResilience: 78,
        containmentFailureRate: 0.15
      });

      expect(proposal.sourcePolicyId).toBe(sourcePolicy.id);
      expect(proposal.suggestedVersion).toBe('1.1.0');
      expect(proposal.suggestedParameters.isolationStrategy).toBe('AGGRESSIVE_ISOLATE');
      expect(proposal.suggestedParameters.maxAutonomousSeverances).toBe(3);
      expect(proposal.rationale.length).toBeGreaterThan(0);

      // Verify the candidate draft was stored safely in CANDIDATE status
      expect(proposal.candidateDraft.status).toBe('CANDIDATE');
      expect(proposal.candidateDraft.version).toBe('1.1.0');

      // Now run the synthesized candidate through the promotion gate
      const gateResult = promotionManager.evaluateAndPromote(
        'tenant-omega',
        proposal.candidateDraft.id,
        'system-optimizer'
      );

      expect(gateResult.promoted).toBe(true);
      expect(gateResult.policy.status).toBe('ACTIVE');
    });
  });
});
