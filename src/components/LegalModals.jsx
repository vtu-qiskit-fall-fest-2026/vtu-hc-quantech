import React, { useEffect } from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

export default function LegalModals({ activeModal, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {activeModal === 'privacy' ? (
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            )}
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {activeModal === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions of Service'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed font-sans">
          {activeModal === 'privacy' ? (
            <>
              <p>
                <strong>Effective Date:</strong> October 2026.
              </p>
              <p>
                QuantaLearn AI ("we", "us", or "our") provides an offline-first quantum computing education and simulation platform. We are committed to protecting the privacy and personal data of students, instructors, and corporate learners.
              </p>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">1. Client-Side Data Processing</h3>
              <p>
                All quantum circuit simulations, Bloch sphere vector calculations, and neural copilot inferences execute directly inside the client browser. No telemetry or quantum statevector arrays are logged to external servers without explicit user intent.
              </p>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">2. Authentication and Account Data</h3>
              <p>
                Account passwords are cryptographically hashed using SHA-256 before storage. User progress, quiz scores, and preferences are stored locally in the browser's persistent storage.
              </p>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">3. Third-Party Services</h3>
              <p>
                QuantaLearn AI does not sell, rent, or monetize personal student data. We comply with Indian Digital Personal Data Protection (DPDP) Act requirements and educational standards under NEP 2020.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Effective Date:</strong> October 2026.
              </p>
              <p>
                Welcome to QuantaLearn AI. By accessing or using our platform, learning modules, or circuit composer, you agree to be bound by these Terms and Conditions.
              </p>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">1. Educational Use License</h3>
              <p>
                QuantaLearn AI grants enrolled students, academic institutions, and enterprise cohort trainees a non-exclusive, non-transferable license to access curriculum materials, practice exercises, and exported Qiskit, Cirq, and PyTorch code snippets for personal or institutional education.
              </p>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">2. Intellectual Property</h3>
              <p>
                The proprietary simulation kernels, neural pedagogical routing weights, user interface layouts, and trademark designations are the sole property of QuantaLearn Technologies.
              </p>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">3. Disclaimer of Quantum Hardware Warranties</h3>
              <p>
                Simulation results reflect exact theoretical linear algebra and Lindblad master equation models. Actual physical quantum processing unit (QPU) executions are subject to physical environmental noise and calibration variances.
              </p>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
          >
            I Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
