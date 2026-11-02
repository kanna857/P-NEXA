import { AnomalyFinding, ForecastPoint } from '@nexus/shared';

export interface RollingMetricStats {
  count: number;
  mean: number;
  variance: number;
  stdDev: number;
  median: number;
  mad: number; // Median Absolute Deviation
  ema: number; // Exponential Moving Average
  min: number;
  max: number;
}

export interface MetricWindowConfig {
  maxWindowSize?: number;
  minSamplesForDetection?: number;
  zScoreThreshold?: number;
  alphaEma?: number;
  cooldownPeriodMs?: number;
}

export class RollingMetricWindow {
  private values: number[] = [];
  private timestamps: number[] = [];
  private ema: number | null = null;
  private readonly maxSize: number;
  private readonly alpha: number;

  constructor(maxSize: number = 60, alpha: number = 0.2) {
    this.maxSize = maxSize;
    this.alpha = alpha;
  }

  public addSample(value: number, timestamp: number = Date.now()): void {
    this.values.push(value);
    this.timestamps.push(timestamp);

    if (this.values.length > this.maxSize) {
      this.values.shift();
      this.timestamps.shift();
    }

    if (this.ema === null) {
      this.ema = value;
    } else {
      this.ema = this.alpha * value + (1 - this.alpha) * this.ema;
    }
  }

  public getStats(): RollingMetricStats {
    const n = this.values.length;
    if (n === 0) {
      return {
        count: 0,
        mean: 0,
        variance: 0,
        stdDev: 0,
        median: 0,
        mad: 0,
        ema: 0,
        min: 0,
        max: 0
      };
    }

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const v of this.values) {
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const mean = sum / n;

    // Variance & StdDev
    let sumSqDiff = 0;
    for (const v of this.values) {
      sumSqDiff += Math.pow(v - mean, 2);
    }
    const variance = n > 1 ? sumSqDiff / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);

    // Median
    const sorted = [...this.values].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;

    // Median Absolute Deviation (MAD)
    const absDevs = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = n % 2 !== 0 ? absDevs[mid]! : (absDevs[mid - 1]! + absDevs[mid]!) / 2;

    return {
      count: n,
      mean: Number(mean.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      median: Number(median.toFixed(2)),
      mad: Number(mad.toFixed(2)),
      ema: Number((this.ema ?? mean).toFixed(2)),
      min,
      max
    };
  }

  public getValues(): number[] {
    return [...this.values];
  }

  public getTimestamps(): number[] {
    return [...this.timestamps];
  }
}

export class PredictiveEngine {
  private windows = new Map<string, RollingMetricWindow>();
  private lastAlertTimestamp = new Map<string, number>();
  private readonly config: Required<MetricWindowConfig>;
  private readonly modelVersion = 'v1.2.0-stat-hybrid-zscore';

  constructor(config: MetricWindowConfig = {}) {
    this.config = {
      maxWindowSize: config.maxWindowSize ?? 60,
      minSamplesForDetection: config.minSamplesForDetection ?? 3,
      zScoreThreshold: config.zScoreThreshold ?? 2.5,
      alphaEma: config.alphaEma ?? 0.2,
      cooldownPeriodMs: config.cooldownPeriodMs ?? 30000 // 30 sec default cooldown
    };
  }

  private getKey(tenantId: string, entityId: string, metric: string): string {
    return `${tenantId}:${entityId}:${metric}`;
  }

  public getWindow(tenantId: string, entityId: string, metric: string): RollingMetricWindow {
    const key = this.getKey(tenantId, entityId, metric);
    let win = this.windows.get(key);
    if (!win) {
      win = new RollingMetricWindow(this.config.maxWindowSize, this.config.alphaEma);
      this.windows.set(key, win);
    }
    return win;
  }

  /**
   * Ingests a new metric sample into the rolling window.
   */
  public ingestSample(
    tenantId: string,
    entityId: string,
    metric: string,
    value: number,
    timestamp: number = Date.now()
  ): void {
    const win = this.getWindow(tenantId, entityId, metric);
    win.addSample(value, timestamp);
  }

  /**
   * Evaluates whether the incoming metric value constitutes an explainable anomaly.
   * Returns a complete, traceable AnomalyFinding.
   */
  public evaluate(
    tenantId: string,
    entityId: string,
    metric: string,
    value: number,
    timestamp: string = new Date().toISOString()
  ): AnomalyFinding {
    const win = this.getWindow(tenantId, entityId, metric);
    const stats = win.getStats();
    const tsNum = new Date(timestamp).getTime();
    const key = this.getKey(tenantId, entityId, metric);

    // Default response if not enough baseline data
    if (stats.count < this.config.minSamplesForDetection) {
      win.addSample(value, tsNum);
      return {
        id: `anom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tenantId,
        entityId,
        metric,
        currentValue: value,
        baselineMean: stats.mean || value,
        baselineStdDev: stats.stdDev || 0,
        zScore: 0,
        anomalyScore: 0,
        severity: 'LOW',
        isAnomaly: false,
        evidence: `Collecting baseline: ${stats.count + 1}/${this.config.minSamplesForDetection} samples observed.`,
        ruleOrModelVersion: this.modelVersion,
        uncertaintyInterval: {
          confidence: 0.5,
          lowerBound: Math.max(0, value * 0.8),
          upperBound: value * 1.2
        },
        timestamp
      };
    }

    // Standard Z-Score with floor to avoid divide-by-zero
    const effectiveStdDev = Math.max(stats.stdDev, 1.0);
    const zScoreRaw = (value - stats.mean) / effectiveStdDev;
    const zScore = Number(zScoreRaw.toFixed(2));

    // Absolute metric ceiling overrides (e.g. CPU > 90% or Auth Failures > 10)
    let isCeilingBreach = false;
    if (metric === 'cpu' && value >= 90) isCeilingBreach = true;
    if (metric === 'memory' && value >= 92) isCeilingBreach = true;
    if (metric === 'authFailures' && value >= 10) isCeilingBreach = true;

    // Check statistical threshold
    const isStatisticalAnomaly = Math.abs(zScore) >= this.config.zScoreThreshold;
    const rawIsAnomaly = isStatisticalAnomaly || isCeilingBreach;

    // Calculate normalized anomaly score [0.0, 1.0]
    let anomalyScore = 0;
    if (isCeilingBreach) {
      anomalyScore = Math.min(1.0, 0.75 + Math.abs(zScore) * 0.05);
    } else if (isStatisticalAnomaly) {
      // Scale from threshold (2.5 -> 0.70) to 5.0 (-> 0.98)
      const excess = Math.abs(zScore) - this.config.zScoreThreshold;
      anomalyScore = Math.min(1.0, 0.70 + excess * 0.12);
    } else {
      // Normal range: 0.0 to 0.45
      anomalyScore = Math.min(0.45, (Math.abs(zScore) / this.config.zScoreThreshold) * 0.45);
    }
    anomalyScore = Number(anomalyScore.toFixed(3));

    // Determine severity tier
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (anomalyScore >= 0.85) severity = 'CRITICAL';
    else if (anomalyScore >= 0.70) severity = 'HIGH';
    else if (anomalyScore >= 0.45) severity = 'MEDIUM';

    // False-positive dampening via cooldown check
    const lastAlert = this.lastAlertTimestamp.get(key) || 0;
    const isCooldownActive = tsNum - lastAlert < this.config.cooldownPeriodMs;
    const isAnomaly = rawIsAnomaly && (!isCooldownActive || severity === 'CRITICAL');

    if (isAnomaly) {
      this.lastAlertTimestamp.set(key, tsNum);
    }

    // Record sample in window after calculation
    win.addSample(value, tsNum);

    // Compute 95% confidence interval bounds [Mean - 1.96*s, Mean + 1.96*s]
    const margin = 1.96 * effectiveStdDev;
    const lowerBound = Number(Math.max(0, stats.mean - margin).toFixed(2));
    const upperBound = Number((stats.mean + margin).toFixed(2));

    // Generate explainable evidence string
    const direction = zScore >= 0 ? 'surge above' : 'drop below';
    const evidence = isAnomaly
      ? `${metric.toUpperCase()} value ${value} represents a ${Math.abs(zScore)}σ ${direction} baseline (mean: ${stats.mean}, σ: ${stats.stdDev}). Normal 95% interval: [${lowerBound}, ${upperBound}].`
      : `${metric.toUpperCase()} value ${value} is within normal operating distribution (mean: ${stats.mean}, z: ${zScore}).`;

    return {
      id: `anom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      entityId,
      metric,
      currentValue: value,
      baselineMean: stats.mean,
      baselineStdDev: stats.stdDev,
      zScore,
      anomalyScore,
      severity,
      isAnomaly,
      evidence,
      ruleOrModelVersion: this.modelVersion,
      uncertaintyInterval: {
        confidence: 0.95,
        lowerBound,
        upperBound
      },
      timestamp
    };
  }

  /**
   * Generates short-term multi-step linear trend forecasts with calibrated confidence bounds.
   */
  public forecast(
    tenantId: string,
    entityId: string,
    metric: string,
    horizonSteps: number = 10,
    stepIntervalSec: number = 10,
    customHistorical?: number[]
  ): ForecastPoint[] {
    const win = this.getWindow(tenantId, entityId, metric);
    const historical = customHistorical && customHistorical.length >= 3 ? customHistorical : win.getValues();

    if (historical.length < 2) {
      const fallbackVal = historical[0] ?? 50;
      return Array.from({ length: horizonSteps }, (_, i) => ({
        step: i + 1,
        timestamp: new Date(Date.now() + (i + 1) * stepIntervalSec * 1000).toISOString(),
        projectedValue: fallbackVal,
        lowerBound: Math.max(0, fallbackVal - 5),
        upperBound: Math.min(100, fallbackVal + 5)
      }));
    }

    const n = historical.length;
    // Compute simple linear regression slope (beta) and intercept (alpha)
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      const y = historical[i]!;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    // Compute standard error of residuals
    let sumResidualSq = 0;
    for (let i = 0; i < n; i++) {
      const fitted = intercept + slope * i;
      sumResidualSq += Math.pow(historical[i]! - fitted, 2);
    }
    const seResidual = Math.sqrt(sumResidualSq / Math.max(1, n - 2)) || 1.5;

    const results: ForecastPoint[] = [];
    const now = Date.now();

    for (let step = 1; step <= horizonSteps; step++) {
      const futureIndex = n - 1 + step;
      let projected = intercept + slope * futureIndex;
      // Clamp bounds between 0 and 100 for percentage metrics
      projected = Math.max(0, Math.min(100, projected));

      // Uncertainty expands over time with factor sqrt(1 + step / n)
      const uncertaintyExpansion = Math.sqrt(1 + step / n);
      const halfWidth = 1.96 * seResidual * uncertaintyExpansion;

      const lowerBound = Number(Math.max(0, projected - halfWidth).toFixed(2));
      const upperBound = Number(Math.min(100, projected + halfWidth).toFixed(2));

      results.push({
        step,
        timestamp: new Date(now + step * stepIntervalSec * 1000).toISOString(),
        projectedValue: Number(projected.toFixed(2)),
        lowerBound,
        upperBound
      });
    }

    return results;
  }

  /**
   * Resets internal sliding windows (for testing).
   */
  public clear(): void {
    this.windows.clear();
    this.lastAlertTimestamp.clear();
  }
}

export const defaultPredictiveEngine = new PredictiveEngine();

