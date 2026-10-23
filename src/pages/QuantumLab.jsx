import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Play,
  RotateCcw,
  Trash2,
  Plus,
  Minus,
  Copy,
  Check,
  Code,
  Compass,
  Sparkles,
  Info,
  Cpu
} from 'lucide-react';
import apiClient from '../api/client';
import JourneyStrip from '../components/JourneyStrip';
import BlochSphereView from '../components/BlochSphereView';
import { incrementCircuitRun } from '../utils/progress';

export default function QuantumLab() {
  const navigate = useNavigate();
  const location = useLocation();

  // Gates palette from backend registry
  const [gates, setGates] = useState([]);
  const [selectedGate, setSelectedGate] = useState(null);

  // Circuit configuration
  const [numQubits, setNumQubits] = useState(2);
  const [operations, setOperations] = useState([]);
  const [cnotControl, setCnotControl] = useState(null);

  // Circuit simulation preview / Bloch spheres
  const [previewTelemetry, setPreviewTelemetry] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Code view
  const [showCode, setShowCode] = useState(false);
  const [qiskitCode, setQiskitCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Load gates from API
  useEffect(() => {
    async function loadGates() {
      try {
        const data = await apiClient.getGates();
        setGates(data);
        if (data.length > 0) {
          setSelectedGate(data[0]); // default to H
        }
      } catch (err) {
        console.error('Failed to load gates from backend registry:', err);
      }
    }
    loadGates();
  }, []);

  // Handle incoming circuit preset
  useEffect(() => {
    if (location.state?.initialCircuit) {
      const c = location.state.initialCircuit;
      if (c.num_qubits) setNumQubits(c.num_qubits);
      if (c.operations) setOperations(c.operations);
    }
  }, [location.state]);

  // Update live Qiskit code
  useEffect(() => {
    async function updateExport() {
      try {
        const circuit = { num_qubits: numQubits, operations };
        const res = await apiClient.exportCircuit(circuit);
        setQiskitCode(res.code);
      } catch (e) {
        setQiskitCode('# Generating export code...');
      }
    }
    updateExport();
  }, [numQubits, operations]);

  // Compute live preview statevector and Bloch vectors
  useEffect(() => {
    async function computePreview() {
      try {
        const circuit = { num_qubits: numQubits, operations };
        const telem = await apiClient.simulateCircuit(circuit);
        setPreviewTelemetry(telem);
      } catch (e) {
        setPreviewTelemetry(null);
      }
    }
    computePreview();
  }, [numQubits, operations]);

  // Place gate on wire
  const handleWireSlotClick = (qubitIndex) => {
    if (!selectedGate) return;

    if (selectedGate.num_qubits === 1) {
      setOperations(prev => [...prev, { gate: selectedGate.symbol, qubits: [qubitIndex] }]);
      setCnotControl(null);
    } else if (selectedGate.num_qubits === 2) {
      if (cnotControl === null) {
        setCnotControl(qubitIndex);
      } else {
        if (cnotControl === qubitIndex) {
          alert('Control and target qubits must be distinct.');
          setCnotControl(null);
          return;
        }
        setOperations(prev => [
          ...prev,
          { gate: selectedGate.symbol, qubits: [cnotControl, qubitIndex] }
        ]);
        setCnotControl(null);
      }
    }
  };

  const handleUndo = () => {
    setOperations(prev => prev.slice(0, -1));
    setCnotControl(null);
  };

  const handleClear = () => {
    setOperations([]);
    setCnotControl(null);
  };

  const handleAddQubit = () => {
    if (numQubits < 3) setNumQubits(numQubits + 1);
  };

  const handleRemoveQubit = () => {
    if (numQubits > 1) {
      const newQ = numQubits - 1;
      setOperations(prev => prev.filter(op => op.qubits.every(q => q < newQ)));
      setNumQubits(newQ);
      setCnotControl(null);
    }
  };

  const handleRunCircuit = async () => {
    setSimulating(true);
    try {
      const circuit = { num_qubits: numQubits, operations };
      const telemetry = await apiClient.simulateCircuit(circuit, 1000);
      incrementCircuitRun();
      navigate('/results', { state: { telemetry, circuit, topicId: location.state?.topicId || null } });
    } catch (e) {
      alert(`Simulation failed: ${e.message || e}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qiskitCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Colorful styling per gate type
  const getGateColorStyle = (symbol) => {
    switch (symbol) {
      case 'H':
        return 'bg-indigo-600 text-white shadow-indigo-100';
      case 'X':
        return 'bg-rose-600 text-white shadow-rose-100';
      case 'CNOT':
        return 'bg-cyan-600 text-white shadow-cyan-100';
      case 'Z':
        return 'bg-emerald-600 text-white shadow-emerald-100';
      case 'Y':
        return 'bg-amber-600 text-white shadow-amber-100';
      case 'S':
        return 'bg-purple-600 text-white shadow-purple-100';
      case 'T':
        return 'bg-pink-600 text-white shadow-pink-100';
      default:
        return 'bg-indigo-600 text-white';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <JourneyStrip activeStep="build" topicId={location.state?.topicId || null} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Lab Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-indigo-600">
              <Cpu className="w-4 h-4" />
              <span>Quantum Circuit Composer</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Quantum Circuit Lab
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Assemble quantum gates, inspect live Bloch spheres, and run statevector simulations.
            </p>
          </div>

          {/* Circuit Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
                showCode
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <Code className="w-4 h-4 text-indigo-500" />
              <span>{showCode ? 'Hide Qiskit' : 'View Qiskit Code'}</span>
            </button>

            <button
              onClick={handleUndo}
              disabled={operations.length === 0}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              title="Undo last gate"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleClear}
              disabled={operations.length === 0}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition-colors shadow-2xs"
              title="Clear circuit"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleRunCircuit}
              disabled={simulating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-extrabold text-xs shadow-md shadow-indigo-200 transition-all flex items-center space-x-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{simulating ? 'Simulating...' : 'Run Circuit (5. Understand)'}</span>
            </button>
          </div>
        </div>

        {/* Beginner How-To Guide Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950">
          <div className="flex items-center space-x-2 font-bold mb-2 text-indigo-800">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Beginner Guide: How to build a circuit</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
              <strong className="text-indigo-700">1. Select Gate:</strong> Click a gate in the palette below.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
              <strong className="text-indigo-700">2. Place on Wire:</strong> Click any wire (+) position.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
              <strong className="text-indigo-700">3. Entanglement:</strong> CNOT needs control, then target.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
              <strong className="text-indigo-700">4. Run & See:</strong> Click 'Run Circuit' to inspect results!
            </div>
          </div>
        </div>

        {/* Live Qiskit Code View (Read-only tab) */}
        {showCode && (
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs shadow-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-cyan-400 font-bold">Equivalent Qiskit Python Code (Live Generated)</span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold flex items-center space-x-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">{qiskitCode}</pre>
          </div>
        )}

        {/* Gate Palette */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gate Palette (From Simulator Registry)
            </span>
            {selectedGate && (
              <span className="text-xs text-indigo-600 font-semibold">
                Active tool: <strong>{selectedGate.name}</strong> ({selectedGate.num_qubits} qubit)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {gates.map((gate) => {
              const isSelected = selectedGate?.symbol === gate.symbol;
              const colorClass = getGateColorStyle(gate.symbol);

              return (
                <button
                  key={gate.symbol}
                  onClick={() => {
                    setSelectedGate(gate);
                    setCnotControl(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center font-mono shadow-xs ${colorClass}`}>
                      {gate.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {gate.num_qubits}q
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {gate.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {gate.before_after?.before} → {gate.before_after?.after}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Gate Description Banner */}
        {selectedGate && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">
                {selectedGate.name} ({selectedGate.symbol}):
              </span>{' '}
              <span className="text-slate-600">
                {selectedGate.description}
              </span>
            </div>
            <div className="text-indigo-700 font-mono text-[11px] font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Transformation: {selectedGate.before_after?.before} ➔ {selectedGate.before_after?.after}
            </div>
          </div>
        )}

        {/* CNOT Selection Prompt Banner */}
        {cnotControl !== null && (
          <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 text-xs font-semibold flex items-center justify-between shadow-2xs">
            <span>
              Control qubit chosen as <strong>q{cnotControl}</strong>. Now click the <strong>target qubit</strong> wire to complete the CNOT!
            </span>
            <button
              onClick={() => setCnotControl(null)}
              className="text-cyan-700 underline text-[11px] font-bold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Quantum Circuit Canvas Grid */}
        <section className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <h3 className="font-bold text-sm text-slate-900">
                Circuit Canvas ({numQubits} Qubits)
              </h3>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleAddQubit}
                  disabled={numQubits >= 3}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition-colors"
                  title="Add Qubit (up to 3 for MVP)"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Wire
                </button>
                <button
                  onClick={handleRemoveQubit}
                  disabled={numQubits <= 1}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition-colors"
                  title="Remove Qubit"
                >
                  <Minus className="w-3.5 h-3.5 inline mr-1" /> Remove Wire
                </button>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-500 font-medium">
              Big-Endian (q0 is MSB / left-most)
            </span>
          </div>

          {/* Empty State */}
          {operations.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                Your circuit is empty. Start by adding your first gate.
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select a gate from the palette, then click a wire position. Or click below to add a Hadamard gate to q0!
              </p>
              <button
                onClick={() => setOperations([{ gate: 'H', qubits: [0] }])}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-200 transition-all"
              >
                + Add H Gate to q0
              </button>
            </div>
          ) : (
            /* Wires and Placed Gate Display */
            <div className="space-y-6 py-2 overflow-x-auto">
              {Array.from({ length: numQubits }).map((_, qIndex) => {
                return (
                  <div key={qIndex} className="flex items-center space-x-4 min-w-[500px]">
                    {/* Wire Label */}
                    <div className="w-16 shrink-0 flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        q{qIndex}
                      </span>
                      <span className="text-xs font-mono text-slate-400">|0⟩</span>
                    </div>

                    {/* Wire Line with Slots */}
                    <div className="flex-1 relative flex items-center h-14 bg-slate-50 rounded-2xl px-5 border border-slate-200/80 shadow-inner">
                      {/* Center Horizontal Wire Line */}
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-300" />

                      {/* Placed Gates along the wire */}
                      <div className="relative z-10 flex items-center space-x-4">
                        {operations.map((op, opIndex) => {
                          const isActing = op.qubits.includes(qIndex);
                          const isCnot = op.gate === 'CNOT';
                          const isControl = isCnot && op.qubits[0] === qIndex;
                          const isTarget = isCnot && op.qubits[1] === qIndex;

                          if (!isActing) {
                            return (
                              <div
                                key={opIndex}
                                className="w-11 h-11 flex items-center justify-center opacity-0"
                              />
                            );
                          }

                          const colorClass = getGateColorStyle(op.gate);

                          return (
                            <div
                              key={opIndex}
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold font-mono text-xs shadow-sm transition-transform hover:scale-105 ${
                                isControl
                                  ? 'bg-indigo-700 text-white rounded-xl'
                                  : isTarget
                                  ? 'bg-cyan-600 text-white rounded-full'
                                  : colorClass
                              }`}
                              title={
                                isControl
                                  ? `CNOT Control for target q${op.qubits[1]}`
                                  : isTarget
                                  ? `CNOT Target controlled by q${op.qubits[0]}`
                                  : `${op.gate} Gate on q${qIndex}`
                              }
                            >
                              {isControl ? '●' : isTarget ? '⊕' : op.gate}
                            </div>
                          );
                        })}

                        {/* Interactive Click-to-Place Slot */}
                        <button
                          onClick={() => handleWireSlotClick(qIndex)}
                          className={`w-11 h-11 rounded-2xl border-2 border-dashed flex items-center justify-center text-xs font-bold transition-all ${
                            cnotControl === qIndex
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-400'
                              : 'border-slate-300 text-slate-400 hover:border-indigo-500 hover:text-indigo-600 bg-white'
                          }`}
                          title={`Click to place ${selectedGate?.name || 'gate'} on q${qIndex}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Live Bloch Sphere Panel */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Live Bloch Spheres (Computed from Reduced Density Matrix)</span>
            </h3>
            {previewTelemetry?.is_entangled && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                Entanglement Detected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: numQubits }).map((_, q) => {
              const qTelem = previewTelemetry?.qubit_telemetry?.[q];
              return (
                <BlochSphereView
                  key={q}
                  qubitIndex={q}
                  blochVector={qTelem?.bloch_vector}
                  isEntangled={qTelem?.is_entangled}
                  purity={qTelem?.purity}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
