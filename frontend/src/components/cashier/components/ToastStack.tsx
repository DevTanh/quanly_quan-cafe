// src/components/cashier/components/ToastStack.tsx
import React from 'react';
import type { Toast } from '../hooks/useCashier';

interface Props {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ICONS: Record<Toast['type'], React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#22c55e"/>
      <path d="M4.5 8l2.5 2.5L11.5 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#ef4444"/>
      <path d="M5 5l6 6M11 5l-6 6" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#3b82f6"/>
      <path d="M8 7v4M8 5.5v.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

const ToastStack: React.FC<Props> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[2000] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 bg-white border border-[#e6e6e2] rounded-xl shadow-lg px-4 py-3 min-w-[260px] max-w-[360px] animate-[slideUp_0.2s_ease]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <span className="shrink-0">{ICONS[t.type]}</span>
          <span className="text-[13px] text-[#111110] flex-1 leading-[1.4]">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[#a8a8a3] hover:text-[#6b6b68] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M1 1l8 8M9 1L1 9"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
