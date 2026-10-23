import React, { useState, useEffect } from 'react';
import { sampleMeasurements } from '../quantum/simulator';
import { BarChart3, RefreshCw, Sliders, ShieldAlert, Cpu } from 'lucide-react';

/**
 * Monte Carlo Measurement Sampler Component
 * Born rule sampling over 1024 virtual shots with statistical shot noise and Lindblad decoherence noise modeling.
 */
export default function MeasurementVisualizer({ probabilities = {}, onSampleUpdate }) {
  const [shots, setShots] = useState(1024);
  const [errorRate, setErrorRate] = useState(0.0);
  const [samplingResults, setSamplingResults] = useState(null);
  const [isSampling, setIsSampling] = useState(false);

  const runSampling = () => {
    setIsSampling(true);
    setTimeout(() => {
      const results = sampleMeasurements(probabilities, shots, errorRate);
      setSamplingResults(results);
      if (onSampleUpdate) onSampleUpdate(results);
      setIsSampling(false);
    }, 150);
  };

  useEffect(() => {
    if (probabilities && Object.keys(probabilities).length > 0) {
      runSampling();
    }
  }, [probabilities, shots, errorRate]);

  if (!probabilities || Object.keys(probabilities).length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
        Run simulation to generate measurement outcomes.
      </div>
    );
  }

  const outcomes = Object.keys(probabilities).sort();

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Monte Carlo Measurement Sampler
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Born-rule projective sampling over {shots} shots with Lindblad decoherence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runSampling}
            disabled={isSampling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSampling ? 'animate-spin' : ''}`} />
            <span>Resample ({shots} Shots)</span>
          </button>
        </div>
      </div>

      {/* Controls: Shots & Lindblad Error Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
        <div>
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
            Measurement Shots (N)
          </label>
          <div className="flex items-center gap-1.5">
            {[256, 512, 1024, 4096].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setShots(count)}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                  shots === count
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Lindblad Depolarizing Noise
            </label>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {(errorRate * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.25"
            step="0.01"
            value={errorRate}
            onChange={(e) => setErrorRate(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Simulates environmental decoherence during readout
          </span>
        </div>
      </div>

      {/* Outcome Distribution Bars */}
      <div className="space-y-3">
        {outcomes.map((bitstring) => {
          const theoreticalP = probabilities[bitstring] || 0;
          const count = samplingResults?.counts?.[bitstring] || 0;
          const empiricalP = samplingResults?.frequencies?.[bitstring] || 0;
          const percentEmpirical = (empiricalP * 100).toFixed(1);
          const percentTheoretical = (theoreticalP * 100).toFixed(1);
          const shotNoise = Math.sqrt((theoreticalP * (1 - theoreticalP)) / shots) * 100;

          return (
            <div key={bitstring} className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex justify-between items-baseline mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                    |{bitstring}⟩
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                    {count} / {shots} shots ({percentEmpirical}%)
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-500">
                  Theory: <span className="font-bold text-slate-700 dark:text-slate-300">{percentTheoretical}%</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">±{shotNoise.toFixed(1)}% noise</span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                {/* Theoretical marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-800 dark:bg-white z-10"
                  style={{ left: `${theoreticalP * 100}%` }}
                  title={`Theoretical Born Rule: ${percentTheoretical}%`}
                />
                {/* Empirical Fill */}
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${empiricalP * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {errorRate > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Lindblad noise active: Non-zero outcomes appear due to simulated thermal relaxation.</span>
        </div>
      )}
    </div>
  );
}
