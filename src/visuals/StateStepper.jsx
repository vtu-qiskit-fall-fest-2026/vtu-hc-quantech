import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import VisualContainer from './VisualContainer';

export default function StateStepper({
  steps = [
    {
      label: 'Initial State',
      gate: 'Start',
      stateMath: '|0⟩',
      amplitudes: { '0': 1.0, '1': 0.0 },
      description: 'The qubit starts in the ground computational basis state |0⟩.'
    },
    {
      label: 'Apply Hadamard (H)',
      gate: 'H',
      stateMath: '(|0⟩ + |1⟩)/√2',
      amplitudes: { '0': 0.5, '1': 0.5 },
      description: 'The Hadamard gate creates an equal superposition of |0⟩ and |1⟩ with 50% probability each.'
    },
    {
      label: 'Apply Hadamard Again (H)',
      gate: 'H',
      stateMath: '|0⟩',
      amplitudes: { '0': 1.0, '1': 0.0 },
      description: 'Due to quantum interference, amplitudes along the |1⟩ path cancel out, returning state to |0⟩.'
    }
  ],
  caption = 'Quantum operations transform the statevector sequentially at each clock cycle.',
  altText = 'Interactive step-by-step state evolution stepper showing statevector transitions',
  explanation = 'Click Next and Previous to step through each gate transformation in order. Notice how the amplitudes and measurement probabilities update dynamically.'
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const activeStep = steps[currentStepIdx] || steps[0];

  return (
    <VisualContainer
      title="Step-by-Step State Evolution"
      caption={caption}
      altText={altText}
      explanation={explanation}
    >
      <div className="w-full max-w-lg py-2">
        {/* Stepper Progress Indicator */}
        <div className="flex items-center justify-between gap-1 mb-4">
          {steps.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStepIdx(idx)}
              className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-lg border text-xs transition-all ${
                idx === currentStepIdx
                  ? 'bg-[#EEF0FF] border-[#4F46E5] text-[#4F46E5] font-bold'
                  : 'bg-[#FBFAF7] border-[#ECE8E1] text-[#4A5168] hover:bg-white'
              }`}
            >
              <span className="text-[10px] font-mono">Step {idx + 1}</span>
              <span className="truncate max-w-[80px]">{s.gate}</span>
            </button>
          ))}
        </div>

        {/* Current State Display Card */}
        <div className="p-4 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-heading font-bold text-sm text-[#1F2433]">
              {activeStep.label}
            </span>
            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-[#EEF0FF] text-[#4F46E5]">
              Gate: {activeStep.gate}
            </span>
          </div>

          {/* Mathematical State */}
          <div className="p-2.5 rounded-lg bg-white border border-[#ECE8E1] flex items-center justify-between">
            <span className="text-xs text-[#4A5168]">Statevector |ψ⟩:</span>
            <span className="font-mono text-sm font-bold text-[#1F2433]">
              {activeStep.stateMath}
            </span>
          </div>

          {/* Probabilities Preview */}
          {activeStep.amplitudes && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-[#4A5168] font-medium">Measurement Probabilities:</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(activeStep.amplitudes).map(([basis, p]) => (
                  <div key={basis} className="p-2 rounded-lg bg-white border border-[#ECE8E1] text-center">
                    <span className="font-mono text-xs text-[#4A5168]">|{basis}⟩: </span>
                    <span className="font-mono font-bold text-xs text-[#1F2433]">
                      {(p * 100).toFixed(0)}%
                    </span>
                    <div className="w-full bg-[#ECE8E1] h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        style={{ width: `${p * 100}%` }}
                        className="bg-[#4F46E5] h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plain language explanation */}
          <p className="text-xs text-[#4A5168] leading-relaxed pt-1">
            {activeStep.description}
          </p>
        </div>

        {/* Step Controls */}
        <div className="flex items-center justify-between mt-4 pt-2 border-t border-[#ECE8E1]">
          <button
            type="button"
            onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
            disabled={currentStepIdx === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#ECE8E1] text-xs font-semibold text-[#1F2433] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-[#4A5168] font-mono">
            {currentStepIdx + 1} of {steps.length}
          </span>

          <button
            type="button"
            onClick={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
            disabled={currentStepIdx === steps.length - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </VisualContainer>
  );
}
