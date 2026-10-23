import React from 'react';
import VisualContainer from './VisualContainer';

export default function ProbabilityBars({
  probabilities = { '0': 0.5, '1': 0.5 },
  caption = 'Measurement probabilities are computed from the squared magnitudes of the statevector amplitudes (|α|²).',
  altText = 'Probability bar chart showing measurement distribution across computational basis states',
  explanation = 'Each bar represents a computational basis state. The height of the bar indicates the probability of observing that state when measured. The sum of all probabilities always equals 100% (normalization).',
  isSimulatorDerived = false
}) {
  const entries = Object.entries(probabilities).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <VisualContainer
      title="Measurement Probability Distribution"
      caption={caption}
      altText={altText}
      explanation={explanation}
      isSimulatorDerived={isSimulatorDerived}
    >
      <div className="w-full max-w-lg py-2">
        <div className="space-y-3">
          {entries.map(([state, prob]) => {
            const pct = Math.round(prob * 1000) / 10;
            const amplitude = Math.sqrt(prob).toFixed(3);
            const isZero = prob <= 0.0001;

            return (
              <div key={state} className="space-y-1">
                <div className="flex justify-between items-baseline text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-[#EEF0FF] text-[#4F46E5] border border-[#4F46E5]/20">
                      |{state}⟩
                    </span>
                    <span className="text-[11px] text-[#4A5168] font-mono">
                      |α| ≈ {amplitude}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[#1F2433]">
                      {pct.toFixed(1)}%
                    </span>
                    {isZero && (
                      <span className="text-[10px] text-[#4A5168] italic">(Zero probability)</span>
                    )}
                  </div>
                </div>

                {/* Progress bar with accessible label */}
                <div
                  className="w-full h-7 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] p-1 flex items-center overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Basis state |${state}⟩ probability ${pct}%`}
                >
                  <div
                    style={{ width: `${Math.max(pct, isZero ? 0 : 3)}%` }}
                    className={`h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-mono font-bold text-white ${
                      isZero
                        ? 'bg-transparent text-[#4A5168]'
                        : pct >= 49 && pct <= 51
                        ? 'bg-[#4F46E5]'
                        : pct > 51
                        ? 'bg-[#0E9F9B]'
                        : 'bg-[#F59E0B]'
                    }`}
                  >
                    {pct >= 15 && `${pct.toFixed(1)}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Normalization verification label */}
        <div className="mt-4 pt-2 border-t border-[#ECE8E1] flex justify-between items-center text-[11px] text-[#4A5168]">
          <span>Total probability:</span>
          <span className="font-mono font-bold text-[#16A34A]">
            {(entries.reduce((acc, [, p]) => acc + p, 0) * 100).toFixed(1)}% (Normalized)
          </span>
        </div>
      </div>
    </VisualContainer>
  );
}
