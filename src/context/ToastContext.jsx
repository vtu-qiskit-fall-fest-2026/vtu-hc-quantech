import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {}
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, duration) => showToast(msg, 'success', duration), [showToast]);
  const error = useCallback((msg, duration) => showToast(msg, 'error', duration), [showToast]);
  const info = useCallback((msg, duration) => showToast(msg, 'info', duration), [showToast]);

  const value = useMemo(() => ({
    showToast,
    success,
    error,
    info
  }), [showToast, success, error, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              t.type === 'success'
                ? 'bg-[#E4F6EA] dark:bg-[#14532D] text-[#16A34A] dark:text-[#4ADE80] border-[#16A34A]/30'
                : t.type === 'error'
                ? 'bg-[#FDECEC] dark:bg-[#7F1D1D] text-[#DC2626] dark:text-[#F87171] border-[#DC2626]/30'
                : 'bg-white dark:bg-[#151926] text-[#1F2433] dark:text-[#F1F5F9] border-[#ECE8E1] dark:border-[#232A3D]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A] dark:text-[#4ADE80]" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] dark:text-[#F87171]" />}
              {t.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[#4F46E5] dark:text-[#818CF8]" />}
              <span className="text-xs font-medium leading-relaxed break-words">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export default ToastContext;
