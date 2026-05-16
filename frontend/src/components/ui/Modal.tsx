import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { BtnOutline, BtnDanger, BtnPrimary } from './Button';

export const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose, children,
}) => (
  <div
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000] animate-[fadeIn_0.15s_ease]"
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    {children}
  </div>
);

export const ModalCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = '',
}) => (
  <div className={`bg-white rounded-[18px] w-[520px] max-w-[96vw] max-h-[90vh] flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.18)] ${className}`}>
    {children}
  </div>
);

export const ModalHeader: React.FC<{ title: string; onClose: () => void }> = ({
  title, onClose,
}) => (
  <div className="flex items-center justify-between px-5 py-[18px] pb-4 border-b border-slate-100 flex-shrink-0">
    <h3 className="text-base font-black text-slate-900 m-0 tracking-tight">{title}</h3>
    <button
      className="w-8 h-8 bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all"
      onClick={onClose}
    >
      <FontAwesomeIcon icon={faXmark} />
    </button>
  </div>
);

export const ModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = '',
}) => (
  <div className={`flex-1 overflow-y-auto px-5 py-5 ${className}`}>
    {children}
  </div>
);

interface ModalFooterProps {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel, onSave, saveLabel = 'Lưu', saving,
}) => (
  <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 flex-shrink-0">
    <BtnOutline onClick={onCancel}>Huỷ</BtnOutline>
    <BtnPrimary onClick={onSave} loading={saving}>
      {saveLabel}
    </BtnPrimary>
  </div>
);

interface ConfirmModalProps {
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  running?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message, confirmLabel = 'Xác nhận', onCancel, onConfirm, running,
}) => (
  <Overlay onClose={() => !running && onCancel()}>
    <div className="bg-white rounded-2xl p-7 w-[380px] max-w-[96vw] shadow-[0_32px_80px_rgba(0,0,0,0.18)] text-center">
      <p className="text-sm text-slate-600 leading-relaxed m-0 mb-5">{message}</p>
      <div className="flex justify-center gap-2.5">
        <BtnOutline onClick={onCancel}>Huỷ</BtnOutline>
        <BtnDanger onClick={onConfirm} loading={running}>
          {confirmLabel}
        </BtnDanger>
      </div>
    </div>
  </Overlay>
);
