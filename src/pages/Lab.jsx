import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Play,
  RotateCcw,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Info,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  Code2,
  Copy,
  Check,
  ArrowRight,
  BarChart2,
  BarChart3,
  Compass,
  Layers,
  Cpu
} from 'lucide-react';
import apiClient from '../api/client';
import JourneyBar from '../components/JourneyBar';
import ProbabilityBars from '../visuals/ProbabilityBars';
import BlochSphere3D from '../components/BlochSphere3D';
import MeasurementVisualizer from '../components/MeasurementVisualizer';
import { simulateCircuit as clientSimulateCircuit } from '../quantum/simulator.js';
import { incrementCircuitRun, recordAssessmentAnswer } from '../utils/progress';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLearning } from '../context/LearningContext';

export default function Lab({ onOpenTutor }) {
  const learningCtx = useLearning();

  const location = useLocation();

  // Gates palette from API
  const [gates, setGates] = useState([]);
  const [selectedGate, setSelectedGate] = useState(null);
  const [showMoreGates, setShowMoreGates] = useState(false);

  // Circuit configuration
  const [numQubits, setNumQubits] = useState(2);
  const [operations, setOperations] = useState([]);
  const [cnotControl, setCnotControl] = useState(null);

  // Simulation execution & Inline Results
  const [simulating, setSimulating] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [simulationError, setSimulationError] = useState(null);
  const [resultVisualMode, setResultVisualMode] = useState('both'); // 'both', 'bloch', 'probabilities'
  const [activeBlochQubit, setActiveBlochQubit] = useState(0);

  const setCircuitContext = learningCtx?.setCircuitContext;

  // Synchronize circuit context with global LearningContext
  useEffect(() => {
    if (setCircuitContext) {
      setCircuitContext({
        circuit: { num_qubits: numQubits, operations },
        simulationResult: telemetry
      });
    }
  }, [numQubits, operations, telemetry, setCircuitContext]);

  // How-to strip dismissal
  const [dismissHowTo, setDismissHowTo] = useState(false);

  // Qiskit export modal/accordion
  const [showQiskitCode, setShowQiskitCode] = useState(false);
  const [qiskitCode, setQiskitCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Inline Quick Check
  const [quizAnswered, setQuizAnswered] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const resultsRef = useRef(null);

  // 1. Fetch gates from API
  useEffect(() => {
    async function loadGates() {
      try {
        const data = await apiClient.getGates();
        setGates(data);
        if (data.length > 0) {
          // Default selection: H gate
          const hGate = data.find(g => g.symbol === 'H') || data[0];
          setSelectedGate(hGate);
        }
      } catch (err) {
        console.error('Failed to load gates from API:', err);
      }
    }
    loadGates();
  }, []);

  // 2. Preload circuit if passed from lesson or Bell state preset
  useEffect(() => {
    if (location.state?.initialCircuit) {
      const c = location.state.initialCircuit;
      if (c.num_qubits) setNumQubits(c.num_qubits);
      if (c.operations) setOperations(c.operations);
    }
    if (location.state?.visualMode) {
      setResultVisualMode(location.state.visualMode);
    }
  }, [location.state]);

  // 3. Update export code whenever circuit changes
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

  // Separate priority gates [H, X, CNOT] and others
  const prioritySymbols = ['H', 'X', 'CNOT'];
  const priorityGates = gates.filter(g => prioritySymbols.includes(g.symbol));
  const otherGates = gates.filter(g => !prioritySymbols.includes(g.symbol));

  // Wire slot click handler (Click-to-place flow)
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
          alert('Control and target qubits must be on different wires.');
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
    setTelemetry(null);
    setQuizSubmitted(false);
    setQuizAnswered(null);
  };

  const handleAddQubit = () => {
    if (numQubits < 3) setNumQubits(prev => prev + 1);
  };

  const handleRemoveQubit = () => {
    if (numQubits > 1) {
      const newCount = numQubits - 1;
      setOperations(prev => prev.filter(op => op.qubits.every(q => q < newCount)));
      setNumQubits(newCount);
      setCnotControl(null);
    }
  };

  // Bell State Preset loader
  const handleLoadBellState = () => {
    setNumQubits(2);
    setOperations([
      { gate: 'H', qubits: [0] },
      { gate: 'CNOT', qubits: [0, 1] }
    ]);
    setCnotControl(null);
    setTelemetry(null);
  };

  // Run Circuit and reveal INLINE simulation results
  const handleRunCircuit = async () => {
    setSimulating(true);
    setSimulationError(null);
    try {
      const circuit = { num_qubits: numQubits, operations };
      let result;
      try {
        result = await apiClient.simulateCircuit(circuit, 1000);
      } catch (backendErr) {
        // Fallback to pure client-side JavaScript simulator
        result = clientSimulateCircuit(numQubits, operations);
      }
      setTelemetry(result);
      incrementCircuitRun();

      // Smooth scroll to inline results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err) {
      setSimulationError('Something went wrong while running the simulation. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyQiskit = () => {
    navigator.clipboard.writeText(qiskitCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAskAIAboutResult = () => {
    if (onOpenTutor) {
      onOpenTutor({
        topicId: location.state?.topicId || null,
        topicTitle: 'Quantum Lab Circuit',
        circuit: { num_qubits: numQubits, operations },
        simulationResult: telemetry,
        initialQuestion: 'Can you explain the mathematical result of my quantum circuit?'
      });
    }
  };

  // Gate colors
  const getGateColor = (symbol) => {
    switch (symbol) {
      case 'H':
        return { bg: 'bg-[#4F46E5]', text: 'text-white', border: 'border-[#4338CA]' };
      case 'X':
        return { bg: 'bg-[#F2705A]', text: 'text-white', border: 'border-[#E05638]' };
      case 'CNOT':
        return { bg: 'bg-[#0E9F9B]', text: 'text-white', border: 'border-[#0B7A77]' };
      case 'Z':
        return { bg: 'bg-[#16A34A]', text: 'text-white', border: 'border-[#15803D]' };
      default:
        return { bg: 'bg-[#4A5168]', text: 'text-white', border: 'border-[#33384A]' };
    }
  };

  // Dynamic plain language explanation for selected gate from API metadata
  const getGateDetails = (gate) => {
    if (!gate) return null;
    return {
      name: gate.name ? `${gate.name} (${gate.symbol})` : `${gate.symbol} Gate`,
      desc: gate.description || 'Unitary quantum transformation applied to selected qubit.',
      beforeAfter: gate.operation_summary || `Applies ${gate.symbol} unitary transformation`
    };
  };

  const gateDetails = getGateDetails(selectedGate);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Persistent Journey Bar */}
      <JourneyBar
        currentStage={telemetry ? 'understand' : operations.length > 0 ? 'run' : 'build'}
        completedStages={telemetry ? ['learn', 'ask', 'build', 'run', 'understand'] : ['learn']}
        onOpenTutor={onOpenTutor}
        topicId={location.state?.topicId}
      />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back to Lesson banner if user came from a lesson */}
        {location.state?.fromLesson && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#EEF0FF] border border-[#4F46E5]/20 text-xs">
            <span className="text-[#4F46E5] font-semibold">
              Currently testing concept circuit in the Quantum Lab.
            </span>
            <Link
              to={location.state?.topicId
                ? `/learn?topic=${encodeURIComponent(location.state.topicId)}${location.state?.conceptId ? `&concept=${encodeURIComponent(location.state.conceptId)}` : ''}`
                : '/learn'}
              className="inline-flex items-center gap-1 font-bold text-[#4F46E5] hover:underline"
            >
              <span>← Back to lesson</span>
            </Link>
          </div>
        )}

        {/* 6.1 Beginner How-To Strip */}
        {!dismissHowTo && (
          <div className="p-4 rounded-2xl bg-[#FFF4DB] border border-[#F59E0B]/30 flex items-center justify-between gap-3 text-xs text-[#1F2433]">
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-[#F59E0B] uppercase tracking-wider text-[10px]">
                How to Build:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs">
                <span><strong className="font-semibold text-[#1F2433]">1.</strong> Choose a gate</span>
                <span className="text-[#F59E0B]">→</span>
                <span><strong className="font-semibold text-[#1F2433]">2.</strong> Click wire position</span>
                <span className="text-[#F59E0B]">→</span>
                <span><strong className="font-semibold text-[#1F2433]">3.</strong> Run circuit</span>
                <span className="text-[#F59E0B]">→</span>
                <span><strong className="font-semibold text-[#1F2433]">4.</strong> See what happened</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDismissHowTo(true)}
              className="text-[#4A5168] hover:text-[#1F2433] p-1"
              aria-label="Dismiss how-to guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Control Bar: Title + Bell State Preset + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1F2433] tracking-tight">
              Quantum Circuit Lab
            </h1>
            <p className="text-xs text-[#4A5168]">
              Build circuits with verified statevector simulation. All mathematics is computed live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quantum Preset Circuits Dropdown */}
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                if (val === 'bell') {
                  setNumQubits(2);
                  setOperations([{ gate: 'H', qubits: [0] }, { gate: 'CNOT', qubits: [0, 1] }]);
                } else if (val === 'superposition') {
                  setNumQubits(1);
                  setOperations([{ gate: 'H', qubits: [0] }]);
                } else if (val === 'pauli_x') {
                  setNumQubits(1);
                  setOperations([{ gate: 'X', qubits: [0] }]);
                } else if (val === 'interference') {
                  setNumQubits(1);
                  setOperations([{ gate: 'H', qubits: [0] }, { gate: 'H', qubits: [0] }]);
                } else if (val === 'ghz') {
                  setNumQubits(3);
                  setOperations([
                    { gate: 'H', qubits: [0] },
                    { gate: 'CNOT', qubits: [0, 1] },
                    { gate: 'CNOT', qubits: [1, 2] }
                  ]);
                }
                setCnotControl(null);
                setTelemetry(null);
                e.target.value = '';
              }}
              defaultValue=""
              aria-label="Load quantum preset circuit"
              className="px-2.5 py-1.5 rounded-xl bg-[#E3F6F5] hover:bg-[#CCF0EE] text-[#0E9F9B] border border-[#0E9F9B]/30 text-xs font-bold transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E9F9B]"
            >
              <option value="" disabled>Load Preset Circuit...</option>
              <option value="bell">Bell State (|00⟩+|11⟩)/√2</option>
              <option value="superposition">Superposition |+⟩ (H|0⟩)</option>
              <option value="pauli_x">Pauli-X Bit Flip (X|0⟩ = |1⟩)</option>
              <option value="interference">Interference (H·H = I)</option>
              <option value="ghz">3-Qubit GHZ (|000⟩+|111⟩)/√2</option>
            </select>

            {/* Quick Bell State Action */}
            <button
              type="button"
              onClick={handleLoadBellState}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF0FF] hover:bg-[#E0E7FF] text-[#4F46E5] border border-[#4F46E5]/30 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bell State</span>
            </button>

            {/* View Qiskit Code Toggle */}
            <button
              type="button"
              onClick={() => setShowQiskitCode(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FBFAF7] text-[#1F2433] border border-[#ECE8E1] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Code2 className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>{showQiskitCode ? 'Hide Code' : 'Qiskit Python'}</span>
            </button>
          </div>
        </div>

        {/* Qiskit Python Code Preview (Expandable) */}
        {showQiskitCode && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#4F46E5]" />
                <span className="font-heading font-bold text-xs text-[#1F2433]">
                  Exported Qiskit Python Code
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyQiskit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBFAF7] hover:bg-[#EEF0FF] text-[#4F46E5] text-xs font-semibold border border-[#ECE8E1] transition-all cursor-pointer shadow-2xs"
                title="Copy to Clipboard"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-[#1F2433]/20 shadow-xs">
              <SyntaxHighlighter
                language="python"
                style={vscDarkPlus}
                customStyle={{
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  margin: 0,
                  padding: '1rem',
                  lineHeight: '1.5'
                }}
              >
                {qiskitCode || '# Add gates to circuit to generate code'}
              </SyntaxHighlighter>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F8FAFC] border border-[#ECE8E1] text-xs text-[#4A5168]">
              <Info className="w-4 h-4 text-[#4F46E5] shrink-0" />
              <span>
                Run this code in your terminal:{' '}
                <code className="px-1.5 py-0.5 rounded-md bg-[#1F2433] text-[#38BDF8] font-mono text-[11px] font-semibold">
                  pip install qiskit
                </code>{' '}
                then{' '}
                <code className="px-1.5 py-0.5 rounded-md bg-[#1F2433] text-[#F3F4F6] font-mono text-[11px]">
                  python your_circuit.py
                </code>
              </span>
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE: 3-Column Layout (Gate Palette | Circuit Workspace | What Does This Gate Do?) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT PANEL: 6.2 Gate Palette (3 cols) */}
          <section className="lg:col-span-3 p-4 sm:p-5 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs space-y-4">
            <div className="space-y-1">
              <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4A5168]">
                Gate Palette
              </h2>
              <p className="text-[11px] text-[#4A5168]">Select a gate to place onto a wire.</p>
            </div>

            {/* Beginner Priority Gates */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5]">
                Core Beginner Gates
              </span>
              <div className="grid grid-cols-3 gap-2">
                {priorityGates.map(gate => {
                  const isSelected = selectedGate?.symbol === gate.symbol;
                  const colors = getGateColor(gate.symbol);

                  return (
                    <button
                      key={gate.symbol}
                      type="button"
                      onClick={() => {
                        setSelectedGate(gate);
                        setCnotControl(null);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? `${colors.bg} text-white shadow-xs border-transparent font-extrabold scale-102`
                          : 'bg-[#FBFAF7] border-[#ECE8E1] text-[#1F2433] hover:bg-white hover:border-[#4F46E5]/30'
                      }`}
                    >
                      <span className="font-mono text-base font-extrabold">{gate.symbol}</span>
                      <span className="text-[9px] mt-0.5 truncate max-w-full">
                        {gate.symbol === 'CNOT' ? '2 Qubits' : '1 Qubit'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* More Gates Dropdown */}
            {otherGates.length > 0 && (
              <div className="pt-2 border-t border-[#ECE8E1] space-y-2">
                <button
                  type="button"
                  onClick={() => setShowMoreGates(prev => !prev)}
                  className="w-full flex items-center justify-between text-xs text-[#4A5168] hover:text-[#1F2433] font-medium"
                >
                  <span>More Gates ({otherGates.length})</span>
                  {showMoreGates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showMoreGates && (
                  <div className="grid grid-cols-3 gap-2 pt-1 animate-in fade-in duration-150">
                    {otherGates.map(gate => {
                      const isSelected = selectedGate?.symbol === gate.symbol;
                      return (
                        <button
                          key={gate.symbol}
                          type="button"
                          onClick={() => {
                            setSelectedGate(gate);
                            setCnotControl(null);
                          }}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#1F2433] text-white shadow-xs border-transparent font-bold'
                              : 'bg-[#FBFAF7] border-[#ECE8E1] text-[#1F2433] hover:bg-white'
                          }`}
                        >
                          <span className="font-mono text-sm font-bold">{gate.symbol}</span>
                          <span className="text-[8px] text-[#4A5168] mt-0.5">{gate.name || 'Gate'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* CENTER PANEL: 6.3 Circuit Workspace (6 cols) */}
          <section className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs space-y-4">
            {/* Top Toolbar: Qubits count + Undo + Clear */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#ECE8E1]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#1F2433]">Register:</span>
                <button
                  type="button"
                  onClick={handleRemoveQubit}
                  disabled={numQubits <= 1}
                  className="p-1 rounded-lg border border-[#ECE8E1] text-[#4A5168] hover:text-[#1F2433] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Remove qubit"
                  aria-label="Remove qubit"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FBFAF7] border border-[#ECE8E1]">
                  {numQubits} Qubits
                </span>
                <button
                  type="button"
                  onClick={handleAddQubit}
                  disabled={numQubits >= 3}
                  className="p-1 rounded-lg border border-[#ECE8E1] text-[#4A5168] hover:text-[#1F2433] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Add qubit (up to 3)"
                  aria-label="Add qubit"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={operations.length === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ECE8E1] text-xs font-medium text-[#4A5168] hover:text-[#1F2433] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={operations.length === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ECE8E1] text-xs font-medium text-[#DC2626] hover:bg-[#FDECEC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Qubit Ordering Convention Banner */}
            <div className="px-3 py-1.5 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] flex items-center justify-between text-[11px] text-[#4A5168]">
              <span>Ordering Convention:</span>
              <span className="font-mono font-bold text-[#1F2433]">
                q0 is the left-most bit in |q0 q1...⟩
              </span>
            </div>

            {/* CNOT Guided Prompt (if in progress) */}
            {cnotControl !== null && (
              <div className="p-3 rounded-xl bg-[#E3F6F5] border border-[#0E9F9B]/30 text-xs text-[#0E9F9B] flex items-center justify-between animate-pulse">
                <span>
                  Control qubit chosen: <strong>q[{cnotControl}]</strong>. Now click the target qubit wire!
                </span>
                <button
                  type="button"
                  onClick={() => setCnotControl(null)}
                  className="text-xs underline font-bold"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Circuit Grid Canvas (Scrolls internally, never creates page-level overflow) */}
            <div className="w-full overflow-x-auto p-4 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1]">
              <div className="min-w-[420px] space-y-6 py-2">
                {Array.from({ length: numQubits }).map((_, qIdx) => {
                  // Find operations on this qubit
                  return (
                    <div key={qIdx} className="flex items-center gap-3 relative">
                      {/* Qubit label */}
                      <div className="w-14 shrink-0 flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-[#1F2433]">q[{qIdx}]</span>
                        <span className="text-[10px] text-[#4A5168]">|0⟩</span>
                      </div>

                      {/* Wire horizontal line */}
                      <div className="flex-1 relative flex items-center h-10">
                        <div className="absolute inset-x-0 h-0.5 bg-[#CBD5E1] top-1/2 -translate-y-1/2" />

                        {/* Interactive Click-to-Place Wire Slots */}
                        <div className="relative z-10 w-full flex items-center gap-4 px-2">
                          {Array.from({ length: Math.max(operations.length + 1, 5) }).map((_, slotIdx) => {
                            const op = operations[slotIdx];
                            const isSlotActive = op && op.qubits.includes(qIdx);

                            if (op) {
                              const gate = op.gate;
                              const isCnot = gate === 'CNOT';
                              const isControl = isCnot && op.qubits[0] === qIdx;
                              const isTarget = isCnot && op.qubits[1] === qIdx;

                              return (
                                <div
                                  key={slotIdx}
                                  className="w-10 h-10 shrink-0 flex items-center justify-center relative"
                                >
                                  {isCnot ? (
                                    isControl ? (
                                      <div className="w-4 h-4 rounded-full bg-[#0E9F9B] shadow-xs" title={`CNOT Control (q${qIdx})`} />
                                    ) : isTarget ? (
                                      <div className="w-8 h-8 rounded-full border-2 border-[#0E9F9B] bg-white flex items-center justify-center text-[#0E9F9B] font-bold text-base shadow-xs" title={`CNOT Target (q${qIdx})`}>
                                        ⊕
                                      </div>
                                    ) : null
                                  ) : isSlotActive ? (
                                    <div
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shadow-xs text-white ${
                                        gate === 'H' ? 'bg-[#4F46E5]' : gate === 'X' ? 'bg-[#F2705A]' : 'bg-[#16A34A]'
                                      }`}
                                      title={`${gate} gate on q${qIdx}`}
                                    >
                                      {gate}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            }

                            // Empty placement slot
                            return (
                              <button
                                key={slotIdx}
                                type="button"
                                onClick={() => handleWireSlotClick(qIdx)}
                                className={`w-9 h-9 shrink-0 rounded-lg border-2 border-dashed transition-all flex items-center justify-center text-xs font-semibold cursor-pointer ${
                                  cnotControl === qIdx
                                    ? 'border-[#0E9F9B] bg-[#E3F6F5] text-[#0E9F9B]'
                                    : 'border-[#CBD5E1] bg-white hover:border-[#4F46E5] hover:bg-[#EEF0FF] text-[#4A5168]'
                                }`}
                                title={`Click to place ${selectedGate?.symbol || 'gate'} on wire q${qIdx}`}
                                aria-label={`Place gate on qubit ${qIdx}`}
                              >
                                +
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Empty state prompt */}
            {operations.length === 0 && (
              <div className="text-center py-2 text-xs text-[#4A5168]">
                <span>Your circuit is empty. Choose a gate and click any <strong>+</strong> wire position, or </span>
                <button
                  type="button"
                  onClick={handleLoadBellState}
                  className="font-bold text-[#4F46E5] hover:underline"
                >
                  load the Bell-state example
                </button>.
              </div>
            )}

            {/* Run Circuit & Qiskit Code Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleRunCircuit}
                disabled={simulating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-heading font-extrabold text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing Statevector Simulation...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Circuit on Simulator</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQiskitCode(prev => !prev)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#FBFAF7] hover:bg-white text-[#1F2433] border border-[#ECE8E1] font-heading font-bold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <Code2 className="w-4 h-4 text-[#4F46E5]" />
                <span>{showQiskitCode ? 'Hide Qiskit Code' : 'Qiskit Export'}</span>
              </button>
            </div>

            {/* Standalone Qiskit Code Viewer (Visible when user clicks Qiskit Export button before running simulation) */}
            {showQiskitCode && !telemetry && (
              <div className="p-4 rounded-2xl bg-[#1E1E1E] text-white space-y-3 animate-in fade-in duration-200 mt-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#818CF8]" />
                    <span className="font-heading font-bold text-xs text-gray-200">
                      Runnable Qiskit Python Code (Auto-Generated)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyQiskit}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 border border-gray-600 transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-gray-400">
                  Execute this circuit locally in Python or Jupyter Notebook via <code className="text-indigo-300 font-mono px-1 py-0.5 rounded bg-gray-800">pip install qiskit</code>.
                </p>

                <div className="rounded-xl overflow-hidden text-xs">
                  <SyntaxHighlighter
                    language="python"
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, padding: '12px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    {qiskitCode || '# Generating Qiskit export...'}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </section>

          {/* RIGHT PANEL: "What does this gate do?" (3 cols) */}
          <section className="lg:col-span-3 p-4 sm:p-5 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#4F46E5]" />
              <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4A5168]">
                What does this gate do?
              </h2>
            </div>

            {gateDetails ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm text-white ${
                      selectedGate.symbol === 'H'
                        ? 'bg-[#4F46E5]'
                        : selectedGate.symbol === 'X'
                        ? 'bg-[#F2705A]'
                        : 'bg-[#0E9F9B]'
                    }`}
                  >
                    {selectedGate.symbol}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#1F2433]">
                      {gateDetails.name}
                    </h3>
                    <span className="text-[10px] text-[#4A5168]">
                      {selectedGate.num_qubits}-qubit operation
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#4A5168] leading-relaxed">
                  {gateDetails.desc}
                </p>

                {/* Before / After Intuition */}
                <div className="p-3 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A5168]">
                    Transformation:
                  </span>
                  <div className="font-mono text-xs font-semibold text-[#1F2433]">
                    {gateDetails.beforeAfter}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-[#4A5168] italic">
                  Click any <strong>+</strong> on a wire to apply {selectedGate.symbol}.
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#4A5168]">Select a gate on the left to see what it does.</div>
            )}
          </section>
        </div>

        {/* ================================================== */}
        {/* 7. INLINE SIMULATION RESULTS (REVEALED BELOW CIRCUIT) */}
        {/* ================================================== */}
        {telemetry && (
          <section
            ref={resultsRef}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#ECE8E1] shadow-xs space-y-6 animate-in fade-in duration-300 scroll-mt-20"
          >
            {/* Header: Simulation Complete Banner + Verification Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#ECE8E1]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#E4F6EA] text-[#16A34A] flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-heading text-xl font-extrabold text-[#1F2433]">
                    Simulation Complete
                  </h2>
                  <p className="text-xs text-[#4A5168]">
                    Exact statevector telemetry computed by NumPy simulator.
                  </p>
                </div>
              </div>

              {/* Verification Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {telemetry.cross_checked_with_aer ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4F6EA] text-[#16A34A] text-xs font-semibold border border-[#16A34A]/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified by Qiskit Aer</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FF] text-[#4F46E5] text-xs font-semibold border border-[#4F46E5]/20">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>NumPy Simulator</span>
                  </span>
                )}
              </div>
            </div>

            {/* Visual Representation Mode Selector Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[#FBFAF7] border border-[#ECE8E1]">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#4A5168] pl-2 hidden sm:inline">
                  Visual Representation:
                </span>
                <div className="flex items-center gap-1 p-1 bg-white border border-[#ECE8E1] rounded-xl shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setResultVisualMode('both')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      resultVisualMode === 'both'
                        ? 'bg-[#4F46E5] text-white shadow-xs'
                        : 'text-[#4A5168] hover:text-[#1F2433] hover:bg-[#FBFAF7]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Dual View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultVisualMode('bloch')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      resultVisualMode === 'bloch'
                        ? 'bg-[#4F46E5] text-white shadow-xs'
                        : 'text-[#4A5168] hover:text-[#1F2433] hover:bg-[#FBFAF7]'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>3D Bloch Sphere</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultVisualMode('probabilities')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      resultVisualMode === 'probabilities'
                        ? 'bg-[#4F46E5] text-white shadow-xs'
                        : 'text-[#4A5168] hover:text-[#1F2433] hover:bg-[#FBFAF7]'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Probabilities</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultVisualMode('sampler')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      resultVisualMode === 'sampler'
                        ? 'bg-[#4F46E5] text-white shadow-xs'
                        : 'text-[#4A5168] hover:text-[#1F2433] hover:bg-[#FBFAF7]'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>1024-Shot Sampler</span>
                  </button>
                </div>
              </div>

              {/* Multi-qubit selector for 3D Bloch Sphere */}
              {resultVisualMode !== 'probabilities' && numQubits > 1 && (
                <div className="flex items-center gap-2 pr-1">
                  <span className="text-xs font-semibold text-[#4A5168]">Bloch Qubit:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: numQubits }, (_, qIdx) => {
                      const qTelem = telemetry.qubit_telemetry?.[qIdx] || telemetry.qubit_telemetry?.[String(qIdx)];
                      const isQubitEntangled = qTelem?.is_entangled;
                      return (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => setActiveBlochQubit(qIdx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            activeBlochQubit === qIdx
                              ? 'bg-[#4F46E5] text-white shadow-xs'
                              : 'bg-white text-[#4A5168] border border-[#ECE8E1] hover:text-[#1F2433]'
                          }`}
                        >
                          <span>q[{qIdx}]</span>
                          {isQubitEntangled && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" title="Entangled" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Results Visualizations Grid */}
            <div className={`grid gap-6 items-start ${
              resultVisualMode === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}>
              {/* Visual 1: 3D Bloch Sphere */}
              {(resultVisualMode === 'both' || resultVisualMode === 'bloch') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4A5168] flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#4F46E5]" />
                      <span>3D Bloch Sphere Representation</span>
                    </h3>
                    <span className="text-[11px] text-[#4A5168] font-medium hidden sm:inline">
                      Interactive 3D Three.js Statevector
                    </span>
                  </div>

                  {(() => {
                    const activeQ = Math.min(activeBlochQubit, numQubits - 1);
                    const qData = telemetry.qubit_telemetry?.[activeQ] || telemetry.qubit_telemetry?.[String(activeQ)];
                    return (
                      <BlochSphere3D
                        qubitIndex={activeQ}
                        blochVector={qData?.bloch_vector || null}
                        isEntangled={qData?.is_entangled ?? telemetry.is_entangled}
                        purity={qData?.purity ?? (telemetry.is_entangled ? 0.5 : 1.0)}
                        height={resultVisualMode === 'bloch' ? 440 : 380}
                      />
                    );
                  })()}
                </div>
              )}

              {/* Visual 2: Probability Bars */}
              {(resultVisualMode === 'both' || resultVisualMode === 'probabilities') && (
                <div className="space-y-3">
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4A5168] flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-[#4F46E5]" />
                    <span>Statevector Probabilities (|α|²)</span>
                  </h3>

                  <ProbabilityBars
                    probabilities={telemetry.probabilities}
                    caption="Probabilities computed live from the simulator statevector."
                    altText="Simulation probabilities distribution"
                    explanation="Each bar represents a possible measurement outcome in the computational basis. In a Bell state, outcomes |00⟩ and |11⟩ each have a 50% chance, while |01⟩ and |10⟩ never occur."
                    isSimulatorDerived={true}
                  />
                </div>
              )}

              {/* Visual 3: Monte Carlo 1024-Shot Measurement Sampler */}
              {resultVisualMode === 'sampler' && (
                <div className="space-y-3">
                  <MeasurementVisualizer
                    probabilities={telemetry.probabilities}
                  />
                </div>
              )}
            </div>

            {/* Explanation & Action Footer */}
            <div className="p-5 rounded-2xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading font-bold text-sm text-[#1F2433] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                  <span>What Happened? (Grounded Mathematical Telemetry)</span>
                </h3>

                {/* Entanglement Telemetry Badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#4A5168]">Register State:</span>
                  <span className={`font-semibold px-2.5 py-0.5 rounded-full ${
                    telemetry.is_entangled
                      ? 'bg-[#E3F6F5] text-[#0E9F9B] border border-[#0E9F9B]/30'
                      : 'bg-white text-[#16A34A] border border-[#16A34A]/30'
                  }`}>
                    {telemetry.is_entangled ? 'Entangled (Purity < 1.0)' : 'Separable Product State'}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#1F2433] leading-relaxed whitespace-pre-line">
                {telemetry.explanation}
              </p>

              {/* Actions: Ask Tutor About This Result + Try Another */}
              <div className="pt-2 border-t border-[#ECE8E1] flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAskAIAboutResult}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#7C3AED] border border-[#7C3AED]/20 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ask AI About This Result</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FBFAF7] text-[#1F2433] border border-[#ECE8E1] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#4A5168]" />
                  <span>Build Another Circuit</span>
                </button>
              </div>
            </div>

            {/* Quick Check on Results */}
            <div className="p-5 rounded-2xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F2705A]">
                Check Your Understanding of This Result
              </span>

              <p className="text-xs sm:text-sm font-semibold text-[#1F2433]">
                {telemetry.is_entangled
                  ? 'Why can neither qubit be described by an individual, independent statevector in this state?'
                  : 'What determines the measurement probabilities observed in this circuit?'}
              </p>

              <div className="space-y-2">
                {[
                  telemetry.is_entangled
                    ? 'Because quantum entanglement causes the qubits to be correlated such that only the joint state is defined.'
                    : 'The squared absolute values of the complex probability amplitudes (|α|²).',
                  'Because the simulator randomly picks one answer every time.',
                  'Because quantum computers calculate every classical answer simultaneously.'
                ].map((opt, oIdx) => {
                  const isSelected = quizAnswered === oIdx;
                  let style = 'bg-white border-[#ECE8E1] text-[#1F2433] hover:border-[#4F46E5]/40';

                  if (quizSubmitted) {
                    if (oIdx === 0) {
                      style = 'bg-[#E4F6EA] border-[#16A34A] text-[#16A34A] font-bold';
                    } else if (isSelected) {
                      style = 'bg-[#FDECEC] border-[#DC2626] text-[#DC2626] font-semibold';
                    } else {
                      style = 'bg-white border-[#ECE8E1] text-[#4A5168] opacity-60';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => {
                        if (quizSubmitted) return;
                        setQuizAnswered(oIdx);
                        setQuizSubmitted(true);
                        if (location.state?.topicId) {
                          recordAssessmentAnswer(location.state.topicId, 'QC_SIM_RESULT', oIdx === 0);
                        }
                      }}
                      disabled={quizSubmitted}
                      className={`w-full text-left p-3 rounded-xl border text-xs leading-snug transition-all flex items-start gap-2.5 cursor-pointer ${style}`}
                    >
                      <span className="font-mono font-bold text-[11px] shrink-0 mt-0.5">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {quizSubmitted && (
                <div className="p-3 rounded-xl bg-[#E4F6EA] text-[#16A34A] text-xs leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold mr-1">
                      {quizAnswered === 0 ? 'Correct!' : 'Reviewing mathematics:'}
                    </span>
                    <span>
                      {telemetry.is_entangled
                        ? 'In an entangled Bell state (|00⟩ + |11⟩)/√2, individual qubits have reduced density matrix purity 0.5 < 1.0, meaning single-qubit states are mixed.'
                        : 'The Born rule states that the measurement probability in the computational basis is P(m) = |⟨m|ψ⟩|².'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Obvious Primary Next Action */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE8E1]">
              <span className="text-xs text-[#4A5168]">
                Ready to test your knowledge with topic assessments?
              </span>

              <Link
                to={location.state?.topicId ? `/practice?topic=${encodeURIComponent(location.state.topicId)}` : '/practice'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2705A] hover:bg-[#E05638] text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Continue to Practice</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Simulation Error Alert */}
        {simulationError && (
          <div className="p-4 rounded-2xl bg-[#FDECEC] border border-[#DC2626]/20 text-[#DC2626] text-xs flex items-center justify-between">
            <span>{simulationError}</span>
            <button
              type="button"
              onClick={handleRunCircuit}
              className="px-3 py-1 rounded-lg bg-[#DC2626] text-white font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
