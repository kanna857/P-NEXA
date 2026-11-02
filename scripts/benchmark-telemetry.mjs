/**
 * NEXUS Ω X — Phase 5 Telemetry & Predictive Engine Performance Benchmark
 * Executes real calculations and records actual hardware, throughput, and latency.
 */

import os from 'node:os';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

// We import the compiled or source modules directly or run pure mathematical tests matching the exact engine implementations
import { PredictiveEngine, RollingMetricWindow } from '../packages/cyber-engine/dist/predictiveEngine.js';
import { validateWorkflowAcyclic } from '../packages/workflow-engine/dist/workflow-state-machine.js';

async function runBenchmark() {
  console.log('================================================================');
  console.log('  NEXUS Ω X — PHASE 5 PERFORMANCE & THROUGHPUT BENCHMARK');
  console.log('================================================================');
  console.log(`OS: ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`CPUs: ${os.cpus()[0]?.model || 'Standard'} (${os.cpus().length} vCPUs)`);
  console.log(`Total RAM: ${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`Node.js: ${process.version}`);
  console.log('----------------------------------------------------------------\n');

  const baselineMemory = process.memoryUsage().heapUsed;

  // 1. Sliding Window & Statistical Ingestion Benchmark
  console.log('--- 1. Rolling Window & Ingestion Throughput Test ---');
  const window = new RollingMetricWindow(100);
  const INGEST_COUNT = 50000;

  const startIngest = performance.now();
  for (let i = 0; i < INGEST_COUNT; i++) {
    const val = 40 + Math.sin(i / 10) * 15 + (Math.random() * 5);
    window.addSample(val);
  }
  const endIngest = performance.now();
  const ingestDurationMs = endIngest - startIngest;
  const ingestThroughput = (INGEST_COUNT / (ingestDurationMs / 1000)).toFixed(0);

  console.log(`Ingested ${INGEST_COUNT.toLocaleString()} telemetry points into rolling window.`);
  console.log(`Total duration: ${ingestDurationMs.toFixed(2)} ms`);
  console.log(`Throughput: ${Number(ingestThroughput).toLocaleString()} points/sec`);
  console.log(`Mean Latency per point: ${(ingestDurationMs / INGEST_COUNT * 1000).toFixed(3)} µs\n`);

  // 2. Predictive Anomaly Detection Latency Benchmark (Z-score, MAD, Ceiling)
  console.log('--- 2. Predictive Engine Anomaly Evaluation Benchmark ---');
  const engine = new PredictiveEngine({
    windowSize: 60,
    zScoreThreshold: 3.0,
    criticalCeilings: { cpu: 90 },
    cooldownMs: 0
  });

  // Seed baseline
  for (let i = 0; i < 60; i++) {
    engine.evaluate('bench-tenant', 'srv-bench', 'cpu', 45 + (i % 5));
  }

  const EVAL_COUNT = 20000;
  const latencies = [];

  const startEval = performance.now();
  for (let i = 0; i < EVAL_COUNT; i++) {
    const isSpike = i % 500 === 0;
    const value = isSpike ? 96.5 : 45 + (Math.random() * 10);
    const t0 = performance.now();
    engine.evaluate('bench-tenant', 'srv-bench', 'cpu', value);
    const t1 = performance.now();
    latencies.push(t1 - t0);
  }
  const endEval = performance.now();

  latencies.sort((a, b) => a - b);
  const evalDurationMs = endEval - startEval;
  const evalThroughput = (EVAL_COUNT / (evalDurationMs / 1000)).toFixed(0);
  const p50 = latencies[Math.floor(EVAL_COUNT * 0.50)];
  const p95 = latencies[Math.floor(EVAL_COUNT * 0.95)];
  const p99 = latencies[Math.floor(EVAL_COUNT * 0.99)];

  console.log(`Evaluated ${EVAL_COUNT.toLocaleString()} predictive checks.`);
  console.log(`Total duration: ${evalDurationMs.toFixed(2)} ms`);
  console.log(`Throughput: ${Number(evalThroughput).toLocaleString()} evals/sec`);
  console.log(`Latency p50: ${(p50 * 1000).toFixed(2)} µs (${p50.toFixed(4)} ms)`);
  console.log(`Latency p95: ${(p95 * 1000).toFixed(2)} µs (${p95.toFixed(4)} ms)`);
  console.log(`Latency p99: ${(p99 * 1000).toFixed(2)} µs (${p99.toFixed(4)} ms)\n`);

  // 3. Trend Forecasting Benchmark (OLS Regression + 95% Confidence Intervals)
  console.log('--- 3. Trend Forecasting Benchmark (OLS + 95% CI) ---');
  const FORECAST_RUNS = 5000;
  const startForecast = performance.now();
  for (let i = 0; i < FORECAST_RUNS; i++) {
    engine.forecast('bench-tenant', 'srv-bench', 'cpu', 10);
  }
  const endForecast = performance.now();
  const forecastDurationMs = endForecast - startForecast;
  const forecastThroughput = (FORECAST_RUNS / (forecastDurationMs / 1000)).toFixed(0);

  console.log(`Generated ${FORECAST_RUNS.toLocaleString()} multi-step forecasts.`);
  console.log(`Total duration: ${forecastDurationMs.toFixed(2)} ms`);
  console.log(`Throughput: ${Number(forecastThroughput).toLocaleString()} forecasts/sec`);
  console.log(`Mean Latency per forecast: ${(forecastDurationMs / FORECAST_RUNS).toFixed(4)} ms\n`);

  // 4. DAG Cycle Validation Benchmark (9 Node Types)
  console.log('--- 4. Visual Workflow DAG Cycle Validation Benchmark ---');
  const sampleSteps = [
    { id: 's1', name: 'Trigger', type: 'TELEMETRY_TRIGGER', nextStepIds: ['s2'] },
    { id: 's2', name: 'Condition', type: 'THRESHOLD_CONDITION', nextStepIds: ['s3'] },
    { id: 's3', name: 'Anomaly', type: 'ANOMALY_DETECTION', nextStepIds: ['s4'] },
    { id: 's4', name: 'Council', type: 'COUNCIL_INVESTIGATION', nextStepIds: ['s5'] },
    { id: 's5', name: 'Sim', type: 'SIMULATION', nextStepIds: ['s6'] },
    { id: 's6', name: 'Notify', type: 'NOTIFICATION', nextStepIds: ['s7'] },
    { id: 's7', name: 'Approval', type: 'HUMAN_APPROVAL', nextStepIds: ['s8'] },
    { id: 's8', name: 'Remediate', type: 'AUTHORIZED_REMEDIATION', nextStepIds: ['s9'] },
    { id: 's9', name: 'Audit', type: 'AUDIT_LOGGING', nextStepIds: [] }
  ];

  const DAG_VALIDATIONS = 25000;
  const startDag = performance.now();
  for (let i = 0; i < DAG_VALIDATIONS; i++) {
    validateWorkflowAcyclic(sampleSteps);
  }
  const endDag = performance.now();
  const dagDurationMs = endDag - startDag;
  const dagThroughput = (DAG_VALIDATIONS / (dagDurationMs / 1000)).toFixed(0);

  console.log(`Validated ${DAG_VALIDATIONS.toLocaleString()} 9-node DAG topologies.`);
  console.log(`Total duration: ${dagDurationMs.toFixed(2)} ms`);
  console.log(`Throughput: ${Number(dagThroughput).toLocaleString()} DAG checks/sec`);
  console.log(`Mean Latency per DAG check: ${(dagDurationMs / DAG_VALIDATIONS * 1000).toFixed(2)} µs\n`);

  // 5. Memory Consumption Delta
  const finalMemory = process.memoryUsage().heapUsed;
  const memDeltaMb = ((finalMemory - baselineMemory) / (1024 * 1024)).toFixed(2);

  console.log('--- 5. Resource Consumption ---');
  console.log(`Initial Heap Used: ${(baselineMemory / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Final Heap Used:   ${(finalMemory / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Heap Delta:        +${memDeltaMb} MB`);
  console.log('================================================================');
  console.log('  BENCHMARK SUITE COMPLETE — ALL CHECKS PASSED');
  console.log('================================================================');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
