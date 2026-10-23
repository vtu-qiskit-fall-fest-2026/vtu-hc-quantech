import React, { useState } from 'react';
import VisualContainer from './VisualContainer';

export default function BitVsQubit({
  caption = "A classical bit is strictly 0 or 1. A qubit's state is a point on a sphere described by complex probability amplitudes.",
  altText = "Diagram comparing a binary classical switch (0 or 1) with a quantum state vector pointing on a sphere",
  explanation = "On the left, a classical bit acts like a physical toggle switch: it has only two allowable states, 0 or 1. On the right, a qubit can point anywhere on a continuous surface. The angle determines the amplitudes α and β, which give the probabilities of measuring 0 or 1."
}) {
  const [bitState, setBitState] = useState(0);
  const [angleDeg, setAngleDeg] = useState(45); // 0 = |0>, 90 = |1>, 45 = equal superposition

  // Compute quantum amplitudes and probabilities from angle theta (in radians)
  // |psi> = cos(theta/2)|0> + sin(theta/2)|1>
  const theta = (angleDeg * Math.PI) / 180;
  const alpha = Math.cos(theta / 2);
  const beta = Math.sin(theta / 2);
  const prob0 = Math.round(alpha * alpha * 100);
  const prob1 = 100 - prob0;

  // Coordinate on circle for arrow
  // center at (80, 80), radius 55
  const cx = 80;
  const cy = 80;
  const r = 55;
  // Angle: 0 deg = pointing UP (|0>), 180 deg = pointing DOWN (|1>)
  const pointerAngle = -Math.PI / 2 + theta;
  const targetX = cx + r * Math.cos(pointerAngle);
  const targetY = cy + r * Math.sin(pointerAngle);

  return (
    <VisualContainer
      title="Bit vs. Qubit: Discrete vs. Continuous"
      caption={caption}
      altText={altText}
      explanation={explanation}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl py-2">
        {/* LEFT: Classical Bit */}
        <div className="flex flex-col items-center justify-between p-4 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#4A5168] mb-1">
            Classical Bit
          </div>
          <div className="text-xs text-[#4A5168] mb-3">Definite state: strictly 0 or 1</div>

          {/* Interactive Switch Graphic */}
          <div className="flex flex-col items-center my-3">
            <button
              type="button"
              onClick={() => setBitState(prev => (prev === 0 ? 1 : 0))}
              className="relative inline-flex h-14 w-28 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:outline-none p-1 cursor-pointer"
              style={{ backgroundColor: bitState === 1 ? '#0E9F9B' : '#E2E8F0' }}
              aria-label={`Toggle classical bit state. Current state is ${bitState}`}
            >
              <span
                className={`inline-block h-12 w-12 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center font-mono font-extrabold text-lg ${
                  bitState === 1 ? 'translate-x-14 text-[#0E9F9B]' : 'translate-x-0 text-[#1F2433]'
                }`}
              >
                {bitState}
              </span>
            </button>
            <span className="text-[11px] text-[#4A5168] mt-2 font-medium">Click switch to toggle</span>
          </div>

          <div className="w-full mt-2 pt-2 border-t border-[#ECE8E1] text-center text-xs">
            <span className="text-[#4A5168]">Current Value: </span>
            <span className="font-mono font-bold text-sm text-[#1F2433]">{bitState}</span>
            <span className="text-[11px] text-[#4A5168] block mt-0.5">100% deterministic (no uncertainty)</span>
          </div>
        </div>

        {/* RIGHT: Qubit */}
        <div className="flex flex-col items-center justify-between p-4 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#4F46E5] mb-1">
            Quantum Qubit
          </div>
          <div className="text-xs text-[#4A5168] mb-2">Superposition state: α|0⟩ + β|1⟩</div>

          {/* Circle / Bloch slice visualization */}
          <div className="relative my-1">
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              className="overflow-visible"
              aria-label={`Qubit state with ${prob0}% probability of 0 and ${prob1}% probability of 1`}
            >
              {/* Outer circle */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="#FFFFFF"
                stroke="#ECE8E1"
                strokeWidth="2"
              />
              {/* Axes */}
              <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy + r + 8} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

              {/* Labels for poles */}
              <text x={cx} y={cy - r - 12} textAnchor="middle" className="font-mono text-xs font-bold fill-[#1F2433]">|0⟩</text>
              <text x={cx} y={cy + r + 20} textAnchor="middle" className="font-mono text-xs font-bold fill-[#1F2433]">|1⟩</text>

              {/* Vector line */}
              <line
                x1={cx}
                y1={cy}
                x2={targetX}
                y2={targetY}
                stroke="#4F46E5"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Vector arrow tip */}
              <circle cx={targetX} cy={targetY} r="5" fill="#4F46E5" />
              {/* Center point */}
              <circle cx={cx} cy={cy} r="3" fill="#1F2433" />
            </svg>
          </div>

          {/* Interactive slider for superposition angle */}
          <div className="w-full space-y-1.5 mt-2">
            <div className="flex justify-between items-center text-[11px] text-[#4A5168]">
              <span>Rotate state:</span>
              <span className="font-mono font-semibold">{angleDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={angleDeg}
              onChange={e => setAngleDeg(Number(e.target.value))}
              aria-label="Adjust superposition angle between |0⟩ and |1⟩"
              className="w-full accent-[#4F46E5] cursor-pointer"
            />
          </div>

          <div className="w-full mt-2 pt-2 border-t border-[#ECE8E1] text-xs">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-[#1F2433] font-semibold">P(|0⟩) = {prob0}%</span>
              <span className="text-[#4F46E5] font-semibold">P(|1⟩) = {prob1}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#ECE8E1] mt-1 overflow-hidden flex">
              <div style={{ width: `${prob0}%` }} className="bg-[#1F2433] transition-all" title={`P(0): ${prob0}%`} />
              <div style={{ width: `${prob1}%` }} className="bg-[#4F46E5] transition-all" title={`P(1): ${prob1}%`} />
            </div>
          </div>
        </div>
      </div>
    </VisualContainer>
  );
}
