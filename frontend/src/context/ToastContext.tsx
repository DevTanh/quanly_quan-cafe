import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = ++counter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const value: ToastContextValue = {
    success: (msg) => add('success', msg),
    error: (msg) => add('error', msg),
    warning: (msg) => add('warning', msg),
    info: (msg) => add('info', msg),
  };

  const colorMap: Record<ToastType, string> = {
    success: 'bg-[#16a34a] border-[#15803d]',
    error: 'bg-[#dc2626] border-[#b91c1c]',
    warning: 'bg-[#d97706] border-[#b45309]',
    info: 'bg-[#2563eb] border-[#1d4ed8]',
  };

  const iconMap: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={[
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-white text-[13.5px] font-medium',
              'min-w-[280px] max-w-[400px] pointer-events-auto',
              'animate-[slideIn_0.25s_ease-out]',
              colorMap[toast.type],
            ].join(' ')}
            style={{
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-[12px] shrink-0 font-bold">
              {iconMap[toast.type]}
            </span>
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

/** Singleton toast emitter — dùng bên ngoài React tree (trong api.ts interceptor) */
type ToastEmitter = { emit: (type: ToastType, message: string) => void };
const toastEmitter: ToastEmitter = { emit: () => {} };
export const registerToastEmitter = (fn: ToastEmitter['emit']) => {
  toastEmitter.emit = fn;
};
export const globalToast = {
  success: (msg: string) => toastEmitter.emit('success', msg),
  error: (msg: string) => toastEmitter.emit('error', msg),
  warning: (msg: string) => toastEmitter.emit('warning', msg),
  info: (msg: string) => toastEmitter.emit('info', msg),
};
