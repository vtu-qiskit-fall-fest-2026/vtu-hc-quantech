import React, { useState, useEffect } from 'react';
import {
  transpileToQiskit,
  transpileToCirq,
  transpileToPennyLane,
  transpileToPyTorchLayer,
  transpileToOpenQASM
} from '../quantum/transpiler.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Code2,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Flame
} from 'lucide-react';
import { useLearning } from '../context/LearningContext';

const FRAMEWORKS = [
  {
    id: 'pytorch',
    name: 'PyTorch TorchLayer',
    category: 'QML Convergence',
    lang: 'python',
    badge: 'Pillar B',
    description: 'Drop-in torch.nn.Module with analytical parameter-shift gradients for end-to-end backprop.'
  },
  {
    id: 'qiskit',
    name: 'IBM Qiskit 1.x',
    category: 'Industry Standard',
    lang: 'python',
    badge: 'Qiskit 1.x',
    description: 'Directly compatible with IBM Quantum QPUs and modern Qiskit Aer 1.x primitives.'
  },
  {
    id: 'pennylane',
    name: 'Xanadu PennyLane',
    category: 'Differentiable QML',
    lang: 'python',
    badge: 'PennyLane',
    description: 'Full automatic differentiation with JAX, PyTorch, and TensorFlow quantum backends.'
  },
  {
    id: 'cirq',
    name: 'Google Cirq',
    category: 'NISQ Research',
    lang: 'python',
    badge: 'Cirq',
    description: 'Designed specifically for noisy intermediate-scale quantum (NISQ) circuit scheduling.'
  },
  {
    id: 'openqasm',
    name: 'OpenQASM 2.0',
    category: 'IR Standard',
    lang: 'clike',
    badge: 'Assembly',
    description: 'Universal quantum intermediate representation understood by all hardware providers.'
  }
];

export default function CodeStudio() {
  const learningCtx = useLearning();
  const currentCircuit = learningCtx?.contextState?.circuit || {
    num_qubits: 2,
    operations: [
      { gate: 'H', qubits: [0] },
      { gate: 'CNOT', qubits: [0, 1] }
    ]
  };

  const [activeFramework, setActiveFramework] = useState('pytorch');
  const [copied, setCopied] = useState(false);

  const getCode = (id) => {
    switch (id) {
      case 'pytorch':
        return transpileToPyTorchLayer(currentCircuit);
      case 'qiskit':
        return transpileToQiskit(currentCircuit);
      case 'pennylane':
        return transpileToPennyLane(currentCircuit);
      case 'cirq':
        return transpileToCirq(currentCircuit);
      case 'openqasm':
        return transpileToOpenQASM(currentCircuit);
      default:
        return transpileToQiskit(currentCircuit);
    }
  };

  const currentCode = getCode(activeFramework);
  const activeMeta = FRAMEWORKS.find(f => f.id === activeFramework);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
              Pillar B : Multi-Framework Transpiler
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Quantum Code Studio & Transpiler
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Transpile visual circuits into production code for PyTorch TorchLayer, Qiskit 1.x, PennyLane, Cirq, and OpenQASM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Framework Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FRAMEWORKS.map(fw => {
          const isActive = activeFramework === fw.id;
          return (
            <button
              key={fw.id}
              type="button"
              onClick={() => setActiveFramework(fw.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500/80 shadow-xs ring-1 ring-indigo-500/30'
                  : 'bg-white dark:bg-[#161B26] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {fw.badge}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {fw.name}
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block truncate">
                {fw.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Framework Details Card */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100 mr-2">Target Architecture:</span>
          {activeMeta.description}
        </div>
        <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 ml-4">
          Circuit: {currentCircuit.num_qubits} Qubits, {currentCircuit.operations.length} Gates
        </span>
      </div>

      {/* Syntax-Highlighted Code Editor Display */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#1e1e1e] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#333333]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            <span className="text-xs font-mono text-slate-300 ml-2">
              {activeFramework === 'openqasm' ? 'circuit.qasm' : `export_${activeFramework}.py`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#333333] hover:bg-[#444444] text-xs font-mono text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="p-4 text-xs font-mono overflow-x-auto">
          <SyntaxHighlighter
            language={activeMeta.lang}
            style={vscDarkPlus}
            customStyle={{ margin: 0, background: 'transparent' }}
          >
            {currentCode}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
