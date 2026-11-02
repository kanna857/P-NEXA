import { describe, it, expect, beforeEach } from 'vitest';
import { RollingMetricWindow, PredictiveEngine } from './predictiveEngine.js';

describe('PredictiveEngine & RollingMetricWindow — Statistical Anomaly & Forecasting', () => {
  let engine: PredictiveEngine;

  beforeEach(() => {
    engine = new PredictiveEngine({
      maxWindowSize: 30,
      minSamplesForDetection: 3,
      zScoreThreshold: 2.0,
      cooldownPeriodMs: 5000
    });
  });

  it('computes rolling statistical moments (mean, variance, stdDev, median, MAD, EMA)', () => {
    const window = new RollingMetricWindow(10, 0.5);
    const data = [10, 20, 30, 40, 50];
    data.forEach((val) => window.addSample(val));

    const stats = window.getStats();
    expect(stats.count).toBe(5);
    expect(stats.mean).toBe(30);
    expect(stats.median).toBe(30);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);
    expect(stats.stdDev).toBeGreaterThan(15);
    expect(stats.ema).toBeGreaterThan(30); // weighted toward later values
  });

  it('detects a statistically significant metric surge with explainable evidence', () => {
    const tenantId = 'tenant-test';
    const entityId = 'srv-auth';
    const metric = 'cpu';

    // Ingest stable baseline around 30%
    for (let i = 0; i < 5; i++) {
      engine.evaluate(tenantId, entityId, metric, 30 + (i % 3));
    }

    // Ingest anomalous surge to 95%
    const finding = engine.evaluate(tenantId, entityId, metric, 95);

    expect(finding.isAnomaly).toBe(true);
    expect(finding.zScore).toBeGreaterThan(2.0);
    expect(finding.anomalyScore).toBeGreaterThan(0.70);
    expect(finding.severity).toMatch(/HIGH|CRITICAL/);
    expect(finding.evidence).toContain('CPU value 95 represents a');
    expect(finding.ruleOrModelVersion).toContain('stat-hybrid-zscore');
    expect(finding.uncertaintyInterval.confidence).toBe(0.95);
    expect(finding.uncertaintyInterval.upperBound).toBeLessThan(95);
  });

  it('flags critical metric ceiling breach directly (e.g. CPU >= 90%)', () => {
    const tenantId = 'tenant-test';
    const entityId = 'srv-api';
    const metric = 'cpu';

    for (let i = 0; i < 4; i++) {
      engine.evaluate(tenantId, entityId, metric, 45);
    }

    const finding = engine.evaluate(tenantId, entityId, metric, 98);
    expect(finding.isAnomaly).toBe(true);
    expect(finding.severity).toBe('CRITICAL');
    expect(finding.anomalyScore).toBeGreaterThanOrEqual(0.85);
  });

  it('suppresses false positives during active alert cooldown window', () => {
    const tenantId = 'tenant-test';
    const entityId = 'fw-border';
    const metric = 'networkInKbps';

    for (let i = 0; i < 5; i++) {
      engine.evaluate(tenantId, entityId, metric, 1000);
    }

    // First spike flags
    const firstAlert = engine.evaluate(tenantId, entityId, metric, 8000);
    expect(firstAlert.isAnomaly).toBe(true);

    // Second non-critical spike within 1 second cooldown is suppressed
    const secondAlert = engine.evaluate(tenantId, entityId, metric, 3000);
    expect(secondAlert.isAnomaly).toBe(false);
  });

  it('generates multi-step linear trend forecast with calibrated uncertainty intervals', () => {
    const tenantId = 'tenant-test';
    const entityId = 'srv-db';
    const metric = 'memory';

    // Ingest upward trend: 20, 25, 30, 35, 40
    [20, 25, 30, 35, 40].forEach((v) => engine.ingestSample(tenantId, entityId, metric, v));

    const horizon = 5;
    const forecast = engine.forecast(tenantId, entityId, metric, horizon, 10);

    expect(forecast.length).toBe(horizon);
    expect(forecast[0]!.projectedValue).toBeGreaterThan(40);
    expect(forecast[4]!.projectedValue).toBeGreaterThan(forecast[0]!.projectedValue);
    expect(forecast[0]!.lowerBound).toBeLessThan(forecast[0]!.projectedValue);
    expect(forecast[0]!.upperBound).toBeGreaterThan(forecast[0]!.projectedValue);

    // Uncertainty interval widens over future horizon steps
    const widthStep1 = forecast[0]!.upperBound - forecast[0]!.lowerBound;
    const widthStep5 = forecast[4]!.upperBound - forecast[4]!.lowerBound;
    expect(widthStep5).toBeGreaterThan(widthStep1);
  });
});

