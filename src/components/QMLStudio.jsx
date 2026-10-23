import React, { useState, useEffect, useRef } from 'react';
import {
  computeGramMatrix,
  trainQSVM,
  predictQSVM,
  exportToQiskitQSVC
} from '../quantum/qmlEngine.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  BrainCircuit,
  Play,
  RotateCcw,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

const PRESET_DATASETS = {
  circles: {
    name: 'Concentric Quantum Rings',
    description: 'Requires non-linear ZZ Hilbert space entanglement to separate.',
    points: [
      { x: [0.3, 0.4], y: 1 },
      { x: [0.5, 0.3], y: 1 },
      { x: [0.4, 0.6], y: 1 },
      { x: [0.2, 0.5], y: 1 },
      { x: [1.8, 1.9], y: -1 },
      { x: [2.1, 1.6], y: -1 },
      { x: [1.6, 2.2], y: -1 },
      { x: [2.3, 2.0], y: -1 }
    ]
  },
  xor: {
    name: 'Quantum XOR Problem',
    description: 'Classic non-linearly separable problem resolved by quantum feature mapping.',
    points: [
      { x: [0.4, 0.4], y: -1 },
      { x: [2.2, 2.2], y: -1 },
      { x: [0.4, 2.2], y: 1 },
      { x: [2.2, 0.4], y: 1 },
      { x: [0.6, 0.5], y: -1 },
      { x: [2.0, 2.1], y: -1 },
      { x: [0.5, 2.0], y: 1 },
      { x: [2.1, 0.5], y: 1 }
    ]
  }
};

export default function QMLStudio() {
  const [activeDatasetKey, setActiveDatasetKey] = useState('circles');
  const [dataset, setDataset] = useState(PRESET_DATASETS.circles.points);
  const [gramMatrix, setGramMatrix] = useState(null);
  const [trainedModel, setTrainedModel] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedClass, setSelectedClass] = useState(1);
  const [showCode, setShowCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const canvasRef = useRef(null);

  // Re-compute Gram Matrix when dataset changes
  useEffect(() => {
    if (dataset.length > 0) {
      const gram = computeGramMatrix(dataset);
      setGramMatrix(gram);
      setTrainedModel(null);
    }
  }, [dataset]);

  // Draw Heatmap Canvas
  useEffect(() => {
    if (!gramMatrix || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const n = dataset.length;
    const cellSize = canvas.width / n;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const val = gramMatrix[i][j];
        // Colormap: Deep Indigo (0.0) -> Cyan -> Emerald (1.0)
        const r = Math.round(15 + val * 20);
        const g = Math.round(30 + val * 190);
        const b = Math.round(90 + val * 140);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(j * cellSize, i * cellSize, cellSize, cellSize);
      }
    }
  }, [gramMatrix, dataset]);

  const handleTrain = () => {
    if (!gramMatrix) return;
    setIsTraining(true);
    setTimeout(() => {
      const model = trainQSVM(dataset, gramMatrix);
      setTrainedModel(model);
      setIsTraining(false);
    }, 200);
  };

  const handleReset = () => {
    setDataset(PRESET_DATASETS[activeDatasetKey].points);
    setTrainedModel(null);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportToQiskitQSVC());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
              Pillar A : Quantum for AI
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Quantum Support Vector Machine Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Evaluates the Quantum Kernel Gram Matrix in 4-dimensional Hilbert space via non-linear ZZ-feature maps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCode(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{showCode ? 'Hide Qiskit QSVC' : 'View Qiskit QSVC Code'}</span>
          </button>
          <button
            type="button"
            onClick={handleTrain}
            disabled={isTraining}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? 'Solving Dual Optimizer...' : 'Train QSVM Model'}</span>
          </button>
        </div>
      </div>

      {/* Code Export Drawer if open */}
      {showCode && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#1e1e1e] overflow-hidden shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#333333]">
            <span className="text-xs font-mono text-slate-300">qiskit_qsvc_export.py</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#333333] hover:bg-[#444444] text-xs font-mono text-slate-200 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <div className="text-xs font-mono p-2">
            <SyntaxHighlighter language="python" style={vscDarkPlus} customStyle={{ margin: 0, background: 'transparent' }}>
              {exportToQiskitQSVC()}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 2D Feature Space Dataset */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Classical Feature Space (2D)</span>
            </h3>
            <div className="flex items-center gap-1.5">
              {Object.keys(PRESET_DATASETS).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveDatasetKey(key);
                    setDataset(PRESET_DATASETS[key].points);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeDatasetKey === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {PRESET_DATASETS[key].name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            {PRESET_DATASETS[activeDatasetKey].description}
          </p>

          {/* Scatter Plot Simulation Area */}
          <div className="relative h-64 w-full bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20 pointer-events-none">
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} className="border border-slate-400" />
              ))}
            </div>

            {/* Scatter Points */}
            <div className="absolute inset-4">
              {dataset.map((pt, idx) => {
                const left = `${(pt.x[0] / 3.0) * 100}%`;
                const top = `${100 - (pt.x[1] / 3.0) * 100}%`;
                const isClass1 = pt.y === 1;

                return (
                  <div
                    key={idx}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center shadow-xs transition-transform hover:scale-125 ${
                      isClass1
                        ? 'bg-indigo-600 text-white border-2 border-white dark:border-slate-800'
                        : 'bg-amber-500 text-slate-900 border-2 border-white dark:border-slate-800'
                    }`}
                    style={{ left, top }}
                    title={`Point ${idx}: [${pt.x[0]}, ${pt.x[1]}] | Class: ${pt.y}`}
                  >
                    <span className="text-[9px] font-bold">{isClass1 ? '+' : '-'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dataset Legend & Count */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Class +1 ({dataset.filter(d => d.y === 1).length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Class -1 ({dataset.filter(d => d.y === -1).length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Points</span>
            </button>
          </div>
        </div>

        {/* Right: Quantum Kernel Gram Matrix & Heatmap */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-emerald-600" />
              <span>Quantum Kernel Gram Matrix K(xi, xj)</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              {dataset.length} x {dataset.length} Elements
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Measures quantum overlap fidelity |⟨0| U†(xi) U(xj) |0⟩|² mapped through ZZ non-linear entanglement.
          </p>

          {/* Canvas Heatmap */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900 border border-slate-800">
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              className="rounded-lg shadow-inner w-60 h-60"
            />
            {/* Colorbar Indicator */}
            <div className="w-60 mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>0.0 (Orthogonal)</span>
              <div className="h-2 flex-1 mx-2 rounded-full bg-gradient-to-r from-[#0f1e5a] via-[#1ec796] to-[#2cd78c]" />
              <span>1.0 (Identical)</span>
            </div>
          </div>

          {/* Model Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Optimizer Convergence:
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {trainedModel ? 'Converged (Dual SMO)' : 'Ready for Training'}
              </span>
            </div>
            {trainedModel && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Active Support Vectors:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {trainedModel.supportVectors} / {dataset.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Optimal Bias (b):</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {trainedModel.bias.toFixed(4)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
