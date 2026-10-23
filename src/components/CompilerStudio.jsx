import React, { useState } from 'react';
import {
  optimizeCircuit,
  routeToHardware,
  runQASSearch,
  huntQuantumBugs,
  HARDWARE_TOPOLOGIES,
  QAS_TARGETS
} from '../quantum/compiler.js';
import {
  Cpu,
  Zap,
  Network,
  Bug,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  RotateCcw
} from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { useNavigate } from 'react-router-dom';

export default function CompilerStudio() {
  const learningCtx = useLearning();
  const navigate = useNavigate();

  const currentCircuit = learningCtx?.contextState?.circuit || {
    num_qubits: 2,
    operations: [
      { gate: 'H', qubits: [0] },
      { gate: 'H', qubits: [0] },
      { gate: 'H', qubits: [0] },
      { gate: 'CNOT', qubits: [0, 1] }
    ]
  };

  const [activeTab, setActiveTab] = useState('qas'); // 'qas', 'optimizer', 'router', 'bughunter'
  const [selectedTarget, setSelectedTarget] = useState('bell');
  const [qasResult, setQasResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Optimizer state
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Router state
  const [selectedTopology, setSelectedTopology] = useState('linear');
  const [routingResult, setRoutingResult] = useState(null);

  // Bug Hunter state
  const [bugReport, setBugReport] = useState(null);

  const handleRunQAS = () => {
    setIsSearching(true);
    setTimeout(() => {
      const res = runQASSearch(selectedTarget);
      setQasResult(res);
      setIsSearching(false);
    }, 250);
  };

  const handleOptimize = () => {
    const res = optimizeCircuit(currentCircuit);
    setOptimizationResult(res);
  };

  const handleRoute = () => {
    const res = routeToHardware(currentCircuit, selectedTopology);
    setRoutingResult(res);
  };

  const handleHuntBugs = () => {
    const res = huntQuantumBugs(currentCircuit, selectedTarget);
    setBugReport(res);
  };

  const handleDeployToLab = (circuitOps, numQ = 2) => {
    if (learningCtx?.setCircuitContext) {
      learningCtx.setCircuitContext({
        num_qubits: numQ,
        operations: circuitOps
      });
    }
    navigate('/lab');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
              Pillars C, D & F : AI for Quantum
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Autonomous Quantum Compiler & QAS Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Heuristic A* Architecture Search, Algebraic Identity Cancellation, and Hardware Coupling Map Routing.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('qas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'qas'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Pillar C: Autonomous QAS Search</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('optimizer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'optimizer'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Pillar D: AI Circuit Optimizer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('router')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'router'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Pillar D: Hardware Router</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bughunter')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bughunter'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Pillar F: Neuro-Symbolic Bug Hunter</span>
        </button>
      </div>

      {/* Tab 1: QAS Search */}
      {activeTab === 'qas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>Target State Synthesis Objective</span>
            </h3>
            <p className="text-xs text-slate-500">
              The AI search agent searches the Clifford+T tree space to discover minimal-depth gate configurations.
            </p>

            <div className="space-y-2">
              {Object.keys(QAS_TARGETS).map(key => {
                const item = QAS_TARGETS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTarget(key)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selectedTarget === key
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">{item.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                        {item.qubits} Qubits
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleRunQAS}
              disabled={isSearching}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Searching A* Clifford+T Graph...' : 'Run Autonomous Search'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Synthesized Minimal Circuit Result</span>
            </h3>

            {qasResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block">State Overlap:</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {(qasResult.simulatedFidelity * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nodes Explored:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {qasResult.searchNodesExplored}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Synthesis Latency:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {qasResult.convergenceTimeMs} ms
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-1">
                  <span className="text-slate-400 block text-[11px] mb-2">// Optimal Gate Sequence</span>
                  {qasResult.circuit.map((op, i) => (
                    <div key={i} className="text-emerald-400">
                      Step {i + 1}: Apply {op.gate} on Qubit [{op.qubits.join(', ')}]
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeployToLab(qasResult.circuit, qasResult.qubits)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Deploy Synthesized Circuit into Composer Lab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Click "Run Autonomous Search" to discover the minimal-depth circuit layout.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: AI Circuit Optimizer */}
      {activeTab === 'optimizer' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Algebraic Identity Gate Cancellation Engine
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Eliminates adjacent involutory self-inverse operations (H·H = I, X·X = I, Z·Z = I, CNOT·CNOT = I) to reduce circuit depth.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOptimize}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all"
            >
              Analyze & Optimize Active Circuit
            </button>
          </div>

          {optimizationResult ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Original Depth:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">
                    {optimizationResult.originalDepth} Gates
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Optimized Depth:</span>
                  <span className="font-bold text-emerald-600 font-mono text-sm">
                    {optimizationResult.optimizedDepth} Gates
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Eliminated Gates:</span>
                  <span className="font-bold text-indigo-600 font-mono text-sm">
                    {optimizationResult.eliminatedGates} Redundant
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Depth Reduction:</span>
                  <span className="font-bold text-emerald-600 font-mono text-sm">
                    {optimizationResult.depthReductionPct}%
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeployToLab(optimizationResult.operations, optimizationResult.num_qubits)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Deploy Optimized Circuit to Composer
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
              Click "Analyze & Optimize Active Circuit" to run the algebraic cancellation pass.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Hardware Router */}
      {activeTab === 'router' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Topological Coupling Map Router
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Routes non-adjacent CNOTs on real QPU physical topologies via automated SWAP gate insertions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {Object.keys(HARDWARE_TOPOLOGIES).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTopology(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    selectedTopology === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {HARDWARE_TOPOLOGIES[key].name}
                </button>
              ))}
              <button
                type="button"
                onClick={handleRoute}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Route Circuit
              </button>
            </div>
          </div>

          {routingResult ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Target Topology:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{routingResult.topology}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SWAP Gates Inserted:</span>
                  <span className="font-bold font-mono text-indigo-600">{routingResult.insertedSwaps} SWAPs</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Routed Total Depth:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{routingResult.totalDepth} Operations</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
              Select a hardware lattice topology and click "Route Circuit".
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Bug Hunter */}
      {activeTab === 'bughunter' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Neuro-Symbolic Quantum Bug Hunter
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates exact quantum statevector overlap fidelity F = |⟨target|actual⟩|² and flags gate misconfigurations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleHuntBugs}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              Analyze Circuit vs Target
            </button>
          </div>

          {bugReport ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Target Objective:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{bugReport.targetName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Overlap Fidelity:</span>
                  <span className="font-bold font-mono text-emerald-600 text-sm">{bugReport.fidelityPercent}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Diagnostic Status:</span>
                  <span className={`font-bold ${bugReport.isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {bugReport.isPassed ? '100% Fidelity (No Bugs)' : `${bugReport.bugsFound} Discrepancy Found`}
                  </span>
                </div>
              </div>

              {bugReport.bugs.length > 0 && (
                <div className="space-y-2">
                  {bugReport.bugs.map((b, i) => (
                    <div key={i} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold">{b.type}: </span>
                        <span>{b.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
              Click "Analyze Circuit vs Target" to verify state fidelity.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
