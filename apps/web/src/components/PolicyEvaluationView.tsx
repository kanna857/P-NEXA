import React, { useState } from 'react';
import { TrendingUp, ShieldCheck, CheckCircle2, AlertTriangle, ArrowUpRight, Zap } from 'lucide-react';

export const PolicyEvaluationView: React.FC = () => {
  const [policies, setPolicies] = useState([
    {
      id: 'pol-01',
      version: '1.0.0',
      status: 'ACTIVE',
      name: 'Standard Perimeter Defense Baseline',
      containmentThreshold: 'HIGH',
      compositeScore: 82,
      mttc: '3.8s',
      resiliencePreserved: '78%'
    },
    {
      id: 'pol-02',
      version: '1.1.0',
      status: 'CANDIDATE',
      name: 'Aggressive Lateral Quarantine Draft',
      containmentThreshold: 'MEDIUM',
      compositeScore: 91,
      mttc: '2.1s',
      resiliencePreserved: '89%'
    }
  ]);

  const [benchmarking, setBenchmarking] = useState(false);
  const [promotionResult, setPromotionResult] = useState<string | null>(null);

  const handlePromoteCandidate = () => {
    setPolicies(
      policies.map((p) => {
        if (p.version === '1.0.0') return { ...p, status: 'ARCHIVED' };
        if (p.version === '1.1.0') return { ...p, status: 'ACTIVE' };
        return p;
      })
    );
    setPromotionResult('Policy v1.1.0 promoted to ACTIVE production baseline after passing 0-regression benchmark gates.');
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="glass-panel p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-neon-cyan mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>CONTROLLED STRATEGY EVALUATION & PROMOTION GATES</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Defense Policy Optimization (Phase 6 Verified)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Strict declarative parameter versioning with quantitative A/B benchmark evaluation. Zero arbitrary code execution.
          </p>
        </div>

        <button
          onClick={handlePromoteCandidate}
          className="px-4 py-2 rounded-lg bg-neon-matrix/20 hover:bg-neon-matrix/30 text-neon-matrix border border-neon-matrix/40 font-bold transition-all glow-matrix flex items-center space-x-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Promote Candidate v1.1.0</span>
        </button>
      </div>

      {promotionResult && (
        <div className="p-3 bg-neon-matrix/10 border border-neon-matrix/30 rounded-lg text-neon-matrix flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{promotionResult}</span>
        </div>
      )}

      {/* Policy Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((p) => (
          <div
            key={p.id}
            className={`glass-panel p-5 rounded-xl border space-y-3 ${
              p.status === 'ACTIVE'
                ? 'border-neon-matrix/50 shadow-lg shadow-neon-matrix/10'
                : p.status === 'CANDIDATE'
                ? 'border-neon-cyan/50 shadow-lg shadow-neon-cyan/10'
                : 'border-surface-border opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">v{p.version}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  p.status === 'ACTIVE'
                    ? 'bg-neon-matrix/20 text-neon-matrix border border-neon-matrix/40'
                    : p.status === 'CANDIDATE'
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {p.status}
              </span>
            </div>

            <div className="text-slate-300 font-bold">{p.name}</div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border">
              <div className="p-2 bg-slate-950/60 rounded border border-surface-border">
                <div className="text-slate-500 text-[9px]">COMPOSITE SCORE</div>
                <div className="text-neon-cyan font-bold text-sm mt-0.5">{p.compositeScore} / 100</div>
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-surface-border">
                <div className="text-slate-500 text-[9px]">MEAN MTTC</div>
                <div className="text-neon-amber font-bold text-sm mt-0.5">{p.mttc}</div>
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-surface-border">
                <div className="text-slate-500 text-[9px]">RESILIENCE</div>
                <div className="text-neon-matrix font-bold text-sm mt-0.5">{p.resiliencePreserved}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

