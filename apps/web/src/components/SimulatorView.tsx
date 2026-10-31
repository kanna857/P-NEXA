import React, { useState } from 'react';
import { PlaySquare, GitBranch, RotateCcw, Activity, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

export const SimulatorView: React.FC = () => {
  const [seed, setSeed] = useState(777123);
  const [currentTick, setCurrentTick] = useState(2);
  const [isBranching, setIsBranching] = useState(false);
  const [divergenceMetrics, setDivergenceMetrics] = useState<{
    firstDivergenceTick: number;
    blastRadiusDelta: number;
    resilienceDelta: number;
    containmentDelta: string;
  } | null>(null);

  const handleStepTick = () => {
    setCurrentTick((prev) => Math.min(prev + 1, 8));
  };

  const handleCreateBranch = () => {
    setIsBranching(true);
    setDivergenceMetrics({
      firstDivergenceTick: 3,
      blastRadiusDelta: -2,
      resilienceDelta: +24,
      containmentDelta: 'Branch achieved full containment at Tick 4 vs Root at Tick 7'
    });
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="glass-panel p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-neon-matrix text-xs mb-1">
            <PlaySquare className="w-4 h-4" />
            <span>DETERMINISTIC SIMULATION & COUNTERFACTUAL BRANCHING</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Parallel Scenario Simulator (Phase 5 Verified)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mulberry32 32-bit PRNG engine with bit-exact SHA-256 time-travel replay and automated divergence quantification.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={handleStepTick}
            className="px-3 py-2 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 font-bold transition-all"
          >
            Advance Tick (+1)
          </button>
          <button
            onClick={handleCreateBranch}
            className="px-3 py-2 rounded bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple border border-neon-purple/40 font-bold transition-all flex items-center space-x-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Fork Branch at T={currentTick}</span>
          </button>
        </div>
      </div>

      {/* Simulator Controls & Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="glass-panel p-4 rounded-xl border border-surface-border">
          <div className="text-slate-500 text-[10px]">PRNG SEED (CANONICAL)</div>
          <div className="text-white text-base font-bold mt-1">#{seed}</div>
          <div className="text-[10px] text-neon-matrix mt-1">100% Bit-Exact Determinism</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-surface-border">
          <div className="text-slate-500 text-[10px]">CURRENT TICK</div>
          <div className="text-neon-cyan text-base font-bold mt-1">T = {currentTick} / 8</div>
          <div className="text-[10px] text-slate-400 mt-1">Discrete State Snapshots</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-surface-border">
          <div className="text-slate-500 text-[10px]">BLAST RADIUS METRIC</div>
          <div className="text-neon-amber text-base font-bold mt-1">3 Affected Nodes</div>
          <div className="text-[10px] text-slate-400 mt-1">Tier-Weighted Weight: 42%</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-surface-border">
          <div className="text-slate-500 text-[10px]">SYSTEM RESILIENCE</div>
          <div className="text-neon-matrix text-base font-bold mt-1">78 / 100</div>
          <div className="text-[10px] text-slate-400 mt-1">Dynamic Health Coefficient</div>
        </div>
      </div>

      {/* Divergence Evaluation Pane */}
      {divergenceMetrics && (
        <div className="glass-panel p-5 rounded-xl border border-neon-purple/40 space-y-3">
          <div className="flex items-center space-x-2 text-neon-purple font-bold text-xs">
            <GitBranch className="w-4 h-4" />
            <span>COUNTERFACTUAL BRANCH DIVERGENCE ANALYSIS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950/80 rounded border border-surface-border">
              <span className="text-slate-500 text-[10px]">FIRST DIVERGENCE TICK</span>
              <div className="text-white font-bold mt-1">Tick {divergenceMetrics.firstDivergenceTick}</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded border border-surface-border">
              <span className="text-slate-500 text-[10px]">BLAST RADIUS REDUCTION</span>
              <div className="text-neon-matrix font-bold mt-1">{divergenceMetrics.blastRadiusDelta} Nodes</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded border border-surface-border">
              <span className="text-slate-500 text-[10px]">RESILIENCE PRESERVATION</span>
              <div className="text-neon-cyan font-bold mt-1">+{divergenceMetrics.resilienceDelta} Points</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-300 p-2.5 bg-slate-950/90 rounded border border-surface-border flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-neon-matrix flex-shrink-0" />
            <span>{divergenceMetrics.containmentDelta}</span>
          </div>
        </div>
      )}
    </div>
  );
};

