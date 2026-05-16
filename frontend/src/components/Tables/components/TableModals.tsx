import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  children: React.ReactNode;
}

export const TableModal: React.FC<ModalProps> = ({
  title, onClose, onSave, saveLabel = 'Lưu', children,
}) => (
  <div
    className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-[1000] animate-[tbFade_0.15s_ease]"
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div className="bg-white rounded-2xl w-[440px] max-w-[95vw] shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden animate-[tbSlide_0.22s_cubic-bezier(0.34,1.3,0.64,1)]">
      <div className="flex items-center justify-between px-[22px] pt-[18px] pb-4 border-b border-gray-100">
        <h3 className="text-base font-extrabold text-gray-900 m-0">{title}</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 border-none bg-gray-100 rounded-lg cursor-pointer text-gray-500 text-sm flex items-center justify-center transition-all hover:bg-red-100 hover:text-red-600"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <div className="px-[22px] py-5">{children}</div>
      <div className="flex justify-end gap-2.5 px-[22px] pt-3.5 pb-[18px] border-t border-gray-100">
        <button
          onClick={onClose}
          className="h-10 px-5 border border-gray-200 bg-white rounded-[9px] text-[13.5px] font-semibold text-gray-500 cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300 font-[inherit]"
        >
          Huỷ
        </button>
        <button
          onClick={onSave}
          className="h-10 px-6 border-none bg-[#3dba74] rounded-[9px] text-[13.5px] font-bold text-white cursor-pointer transition-all hover:bg-[#16a34a] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(61,186,116,0.3)] font-[inherit]"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  </div>
);

interface ConfirmProps {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const TableConfirmModal: React.FC<ConfirmProps> = ({ message, onCancel, onConfirm }) => (
  <div
    className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-[1000]"
    onClick={e => e.target === e.currentTarget && onCancel()}
  >
    <div className="bg-white rounded-2xl px-[26px] pt-7 pb-[22px] w-[380px] max-w-[95vw] shadow-[0_24px_64px_rgba(0,0,0,0.18)] text-center animate-[tbSlide_0.22s_cubic-bezier(0.34,1.3,0.64,1)]">
      <p className="text-[14px] text-gray-700 leading-[1.65] mb-[22px]">{message}</p>
      <div className="flex justify-center gap-2.5">
        <button
          onClick={onCancel}
          className="h-10 px-5 border border-gray-200 bg-white rounded-[9px] text-[13.5px] font-semibold text-gray-500 cursor-pointer transition-all hover:bg-gray-50 font-[inherit]"
        >
          Huỷ
        </button>
        <button
          onClick={onConfirm}
          className="h-10 px-6 border-none bg-[#e11d48] rounded-[9px] text-[13.5px] font-bold text-white cursor-pointer transition-all hover:bg-[#be123c] font-[inherit]"
        >
          Xoá
        </button>
      </div>
    </div>
  </div>
);
