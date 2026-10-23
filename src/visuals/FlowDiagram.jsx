import React from 'react';
import { ArrowRight, Cpu, Layers, Activity, HelpCircle, CheckCircle } from 'lucide-react';
import VisualContainer from './VisualContainer';

export default function FlowDiagram({
  nodes = [
    { id: '1', title: '1. Initialize State', desc: 'Qubits prepared in |0...0⟩', color: 'indigo' },
    { id: '2', title: '2. Quantum Gates', desc: 'Unitary transformations (H, X, CNOT)', color: 'teal' },
    { id: '3', title: '3. Interference', desc: 'Amplitudes reinforce or cancel', color: 'amber' },
    { id: '4', title: '4. Measurement', desc: 'Wavefunction collapses to classical bits', color: 'coral' }
  ],
  title = "Quantum Computational Flow",
  caption = "Information flows from initialization through unitary transformations to classical readout.",
  altText = "Flow diagram illustrating quantum computational sequence from initialization to measurement",
  explanation = "Unlike a classical processor which updates memory cells sequentially, a quantum algorithm initializes a superposition of possibilities, manipulates their relative phases with interference, and measures a final classical bitstring."
}) {
  const getColorClasses = (color) => {
    switch (color) {
      case 'indigo':
        return { bg: 'bg-[#EEF0FF]', text: 'text-[#4F46E5]', border: 'border-[#4F46E5]/30' };
      case 'teal':
        return { bg: 'bg-[#E3F6F5]', text: 'text-[#0E9F9B]', border: 'border-[#0E9F9B]/30' };
      case 'amber':
        return { bg: 'bg-[#FFF4DB]', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/30' };
      case 'coral':
        return { bg: 'bg-[#FDEBE7]', text: 'text-[#F2705A]', border: 'border-[#F2705A]/30' };
      case 'green':
        return { bg: 'bg-[#E4F6EA]', text: 'text-[#16A34A]', border: 'border-[#16A34A]/30' };
      default:
        return { bg: 'bg-[#FBFAF7]', text: 'text-[#1F2433]', border: 'border-[#ECE8E1]' };
    }
  };

  return (
    <VisualContainer
      title={title}
      caption={caption}
      altText={altText}
      explanation={explanation}
    >
      <div className="w-full max-w-xl py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 relative">
          {nodes.map((node, i) => {
            const colors = getColorClasses(node.color);

            return (
              <div
                key={node.id || i}
                className={`p-3.5 rounded-xl border ${colors.bg} ${colors.border} flex flex-col justify-between space-y-2`}
              >
                <div>
                  <div className={`font-heading font-bold text-xs ${colors.text} mb-1`}>
                    {node.title}
                  </div>
                  <p className="text-[11px] text-[#4A5168] leading-snug">
                    {node.desc}
                  </p>
                </div>
                {i < nodes.length - 1 && (
                  <div className="hidden md:flex justify-end pt-1">
                    <ArrowRight className={`w-3.5 h-3.5 ${colors.text}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </VisualContainer>
  );
}
