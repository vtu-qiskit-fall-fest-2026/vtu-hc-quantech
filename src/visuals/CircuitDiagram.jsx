import React from 'react';
import VisualContainer from './VisualContainer';

export default function CircuitDiagram({
  circuit = { num_qubits: 2, operations: [{ gate: 'H', qubits: [0] }, { gate: 'CNOT', qubits: [0, 1] }] },
  caption = 'Quantum circuits apply operations left-to-right across qubit wires, followed by measurement.',
  altText = 'Quantum circuit diagram showing gates placed sequentially on qubit wires',
  explanation = 'Each horizontal line represents a qubit wire over time. Operations execute sequentially from left to right. When a gate acts on a wire, it transforms the amplitude of that qubit.'
}) {
  const numQubits = circuit.num_qubits || 2;
  const operations = circuit.operations || [];

  const wireSpacing = 48;
  const startX = 60;
  const stepWidth = 56;
  const totalSteps = Math.max(operations.length, 3);
  const width = startX + totalSteps * stepWidth + 60;
  const height = numQubits * wireSpacing + 40;

  // Gate color mapping
  const getGateColors = (gate) => {
    switch (gate) {
      case 'H':
        return { fill: '#4F46E5', text: '#FFFFFF', border: '#4338CA' };
      case 'X':
        return { fill: '#F2705A', text: '#FFFFFF', border: '#E05638' };
      case 'Z':
        return { fill: '#16A34A', text: '#FFFFFF', border: '#15803D' };
      case 'CNOT':
        return { fill: '#0E9F9B', text: '#FFFFFF', border: '#0B7A77' };
      default:
        return { fill: '#4A5168', text: '#FFFFFF', border: '#33384A' };
    }
  };

  return (
    <VisualContainer
      title="Quantum Circuit Representation"
      caption={caption}
      altText={altText}
      explanation={explanation}
    >
      <div className="w-full overflow-x-auto py-2 flex justify-center">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible font-mono"
        >
          {/* Render horizontal qubit wires */}
          {Array.from({ length: numQubits }).map((_, qIdx) => {
            const y = 30 + qIdx * wireSpacing;
            return (
              <g key={`wire-${qIdx}`}>
                {/* Qubit label */}
                <text
                  x="20"
                  y={y + 4}
                  className="font-mono text-xs font-bold fill-[#1F2433]"
                  textAnchor="start"
                >
                  q[{qIdx}]
                </text>
                <text
                  x="48"
                  y={y + 4}
                  className="font-mono text-[10px] fill-[#4A5168]"
                  textAnchor="start"
                >
                  |0⟩
                </text>
                {/* Horizontal wire line */}
                <line
                  x1={startX}
                  y1={y}
                  x2={width - 20}
                  y2={y}
                  stroke="#CBD5E1"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Render gates sequentially */}
          {operations.map((op, stepIdx) => {
            const gate = (op.gate || '').toUpperCase();
            const qubits = op.qubits || [];
            const x = startX + stepIdx * stepWidth + stepWidth / 2;

            if (gate === 'CNOT' && qubits.length >= 2) {
              const [ctrl, tgt] = qubits;
              const ctrlY = 30 + ctrl * wireSpacing;
              const tgtY = 30 + tgt * wireSpacing;

              return (
                <g key={`cnot-${stepIdx}`}>
                  {/* Connecting vertical line */}
                  <line
                    x1={x}
                    y1={ctrlY}
                    x2={x}
                    y2={tgtY}
                    stroke="#0E9F9B"
                    strokeWidth="2"
                  />
                  {/* Control dot */}
                  <circle cx={x} cy={ctrlY} r="5" fill="#0E9F9B" />
                  {/* Target target cross/plus in circle */}
                  <circle cx={x} cy={tgtY} r="11" fill="#FFFFFF" stroke="#0E9F9B" strokeWidth="2" />
                  <line x1={x - 7} y1={tgtY} x2={x + 7} y2={tgtY} stroke="#0E9F9B" strokeWidth="2" />
                  <line x1={x} y1={tgtY - 7} x2={x} y2={tgtY + 7} stroke="#0E9F9B" strokeWidth="2" />
                </g>
              );
            }

            // Single qubit gate box
            if (qubits.length >= 1) {
              const q = qubits[0];
              const y = 30 + q * wireSpacing;
              const colors = getGateColors(gate);
              const boxSize = 28;

              return (
                <g key={`gate-${stepIdx}`}>
                  <rect
                    x={x - boxSize / 2}
                    y={y - boxSize / 2}
                    width={boxSize}
                    height={boxSize}
                    rx="5"
                    fill={colors.fill}
                    stroke={colors.border}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={y + 4}
                    fill={colors.text}
                    textAnchor="middle"
                    className="font-mono text-xs font-extrabold"
                  >
                    {gate}
                  </text>
                </g>
              );
            }

            return null;
          })}
        </svg>
      </div>
    </VisualContainer>
  );
}
