import React, { useState, useMemo } from 'react';
import {
  DEFAULT_TRANSMON_PARAMS,
  calculateCoherenceRetention,
  generateDecayCurve,
  estimateCircuitDuration
} from '../quantum/nisqTwin.js';
import {
  Activity,
  ShieldCheck,
  Zap,
  Sliders,
  Cpu,
  RefreshCw,
  Info,
  Clock
} from 'lucide-react';
import { useLearning } from '../context/LearningContext';

export default function NISQDigitalTwin() {
  const learningCtx = useLearning();
  const currentCircuit = learningCtx?.contextState?.circuit || {
    num_qubits: 2,
    operations: [
      { gate: 'H', qubits: [0] },
      { gate: 'CNOT', qubits: [0, 1] }
    ]
  };

  const [t1, setT1] = useState(125.0);
  const [t2, setT2] = useState(85.0);
  const [activeDD, setActiveDD] = useState('xy4'); // 'none', 'cpmg', 'xy4'

  const customParams = useMemo(() => ({
    ...DEFAULT_TRANSMON_PARAMS,
    t1_us: t1,
    t2_us: t2
  }), [t1, t2]);

  const durationMeta = useMemo(() => {
    return estimateCircuitDuration(currentCircuit, customParams);
  }, [currentCircuit, customParams]);

  const coherenceResult = useMemo(() => {
    return calculateCoherenceRetention(durationMeta.totalDuration_ns, activeDD, customParams);
  }, [durationMeta, activeDD, customParams]);

  const curveData = useMemo(() => {
    return generateDecayCurve(activeDD, customParams, 25);
  }, [activeDD, customParams]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
              Pillar E : NISQ Digital Twin
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Superconducting Transmon Digital Twin
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Simulates Lindblad master equation T1 energy relaxation and T2 dephasing with AI Dynamical Decoupling.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Hardware Controls & Dynamical Decoupling */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Transmon QPU Noise Parameters</span>
            </h3>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              IBM Eagle Spec
            </span>
          </div>

          {/* T1 Slider */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                T1 Energy Relaxation Time
              </label>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {t1.toFixed(1)} µs
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={t1}
              onChange={(e) => setT1(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Decay from excited state |1⟩ back to ground state |0⟩
            </span>
          </div>

          {/* T2 Slider */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                T2 Pure Dephasing Time
              </label>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {t2.toFixed(1)} µs
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="180"
              step="5"
              value={t2}
              onChange={(e) => setT2(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Loss of relative phase coherence in equatorial plane
            </span>
          </div>

          {/* AI Dynamical Decoupling Selector */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-2">
              AI Dynamical Decoupling (DD) Pulse Protection
            </label>
            <div className="space-y-2">
              {[
                {
                  id: 'none',
                  name: 'No DD Protection (Free Decay)',
                  desc: 'Unmitigated environmental dephasing and 1/f magnetic flux drift.'
                },
                {
                  id: 'cpmg',
                  name: 'CPMG Pulse Sequence',
                  desc: 'Carr-Purcell-Meiboom-Gill periodic spin-echo refocusing (~1.8x T2).'
                },
                {
                  id: 'xy4',
                  name: 'XY-4 Robust Alternating Sequence',
                  desc: '4-pulse phase cycle (X-Y-X-Y) canceling both off-resonance and pulse length errors (~2.4x T2).'
                }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveDD(item.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeDD === item.id
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs">{item.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Coherence Decay Curve & Telemetry */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Decoherence Envelope Dynamics</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              Effective T2: {coherenceResult.effectiveT2_us.toFixed(1)} µs
            </span>
          </div>

          {/* SVG Coherence Decay Plot */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-2">
              <span>Coherence Fidelity (1.0 = Pure)</span>
              <span>Time: 0 to 300 µs</span>
            </div>

            <svg viewBox="0 0 300 120" className="w-full h-44 overflow-visible">
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="300" y2="30" stroke="#334155" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="#334155" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="300" y2="90" stroke="#334155" strokeDasharray="3 3" />

              {/* T1 Decay Line (Cyan) */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                points={curveData.map(p => `${p.time_us},${120 - p.t1 * 110}`).join(' ')}
              />

              {/* T2 Dephasing Line (Emerald) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points={curveData.map(p => `${p.time_us},${120 - p.t2 * 110}`).join(' ')}
              />
            </svg>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#06b6d4]" />
                T1 Population Relaxation
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#10b981]" />
                T2 Coherence (with {activeDD.toUpperCase()})
              </span>
            </div>
          </div>

          {/* Circuit Execution Telemetry */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Physical Gate Duration:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {durationMeta.totalDuration_ns} ns ({durationMeta.totalDuration_us.toFixed(3)} µs)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Surviving State Fidelity:</span>
              <span className="font-bold font-mono text-emerald-600 text-sm">
                {(coherenceResult.quantumFidelity * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Noise Protection Mode:</span>
              <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {activeDD === 'none' ? 'Unmitigated' : `${activeDD.toUpperCase()} Active`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
