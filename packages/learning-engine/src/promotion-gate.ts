import { comparePoliciesAB, runBenchmarkSuite } from './benchmark.js';
import { PolicyStore } from './policy-store.js';
import { PromotionGateResult } from './types.js';

export class PromotionGateManager {
  private policyStore: PolicyStore;

  constructor(policyStore: PolicyStore) {
    this.policyStore = policyStore;
  }

  /**
   * Evaluates a candidate policy through automated benchmark validation and regression gates.
   * Only policies that pass all test cases without safety regression can be promoted to ACTIVE.
   */
  public evaluateAndPromote(
    tenantId: string,
    candidatePolicyId: string,
    promoterId: string
  ): PromotionGateResult {
    const candidate = this.policyStore.getPolicy(tenantId, candidatePolicyId);
    if (!candidate) {
      throw new Error(`Candidate policy not found: ${candidatePolicyId}`);
    }

    // 1. Run Automated Benchmark Suite
    const benchmarkResult = runBenchmarkSuite(candidate);
    if (!benchmarkResult.isEligibleForPromotion) {
      this.policyStore.updatePolicyStatus(tenantId, candidate.id, 'REJECTED');
      return {
        promoted: false,
        reason: `Promotion Gate Blocked: Candidate policy failed benchmark requirements (Composite Score: ${benchmarkResult.compositeScore}/100, Passed: ${benchmarkResult.passedCases}/${benchmarkResult.totalCases}).`,
        policy: candidate
      };
    }

    // 2. If an active policy exists, evaluate A/B Regression Gate
    const currentActive = this.policyStore.getActivePolicy(tenantId);
    let archivedPreviousPolicyId: string | undefined = undefined;

    if (currentActive && currentActive.id !== candidate.id) {
      const comparison = comparePoliciesAB(currentActive, candidate);
      if (comparison.isRegression || comparison.recommendation === 'REJECT') {
        this.policyStore.updatePolicyStatus(tenantId, candidate.id, 'REJECTED');
        return {
          promoted: false,
          reason: `Promotion Gate Blocked: Regression detected against active baseline ${currentActive.version}. ${comparison.summary}`,
          policy: candidate
        };
      }

      // Archive current active policy
      this.policyStore.updatePolicyStatus(tenantId, currentActive.id, 'ARCHIVED');
      archivedPreviousPolicyId = currentActive.id;
    }

    // 3. Promote candidate policy to ACTIVE
    const promotedPolicy = this.policyStore.updatePolicyStatus(
      tenantId,
      candidate.id,
      'ACTIVE',
      promoterId
    );

    return {
      promoted: true,
      reason: `Promotion Gate Approved: Policy passed all benchmark suites and comparative regression checks. Successfully promoted to ACTIVE.`,
      policy: promotedPolicy,
      archivedPreviousPolicyId
    };
  }
}
