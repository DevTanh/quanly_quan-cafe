import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';

interface Props {
  productName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<Props> = ({ productName, onCancel, onConfirm }) => (
  <div
    className="fixed inset-0 bg-black/45 backdrop-blur-[3px] flex items-center justify-center z-[1100] animate-[fadeIn_0.15s_ease]"
    onClick={e => e.target === e.currentTarget && onCancel()}
  >
    <div className="bg-white rounded-2xl w-[380px] max-w-[94vw] px-7 pt-8 pb-6 relative text-center shadow-[0_16px_48px_rgba(0,0,0,0.16)] animate-[modalIn_0.2s_cubic-bezier(0.34,1.3,0.64,1)]">
      {/* Close */}
      <button
        className="absolute top-3 right-3 w-7 h-7 border-none bg-gray-100 rounded-lg cursor-pointer text-gray-500 text-sm flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all"
        onClick={onCancel}
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>

      {/* Icon */}
      <div className="w-[60px] h-[60px] bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[26px] text-amber-400" />
      </div>

      <h3 className="text-[17px] font-bold text-gray-900 m-0 mb-2.5">Xác nhận xoá</h3>
      <p className="text-[13.5px] text-gray-500 leading-relaxed m-0 mb-6">
        Bạn có chắc muốn xoá sản phẩm <strong className="text-gray-900">"{productName}"</strong>?<br />
        Hành động này không thể hoàn tác.
      </p>

      <div className="flex gap-2.5 justify-center">
        <button
          className="flex-1 h-[38px] border-[1.5px] border-gray-300 bg-white rounded-lg text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors font-[inherit]"
          onClick={onCancel}
        >
          Huỷ bỏ
        </button>
        <button
          className="flex-1 h-[38px] border-none bg-red-500 rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-red-600 active:scale-95 transition-all font-[inherit]"
          onClick={onConfirm}
        >
          Xoá
        </button>
      </div>
    </div>
  </div>
);

export default DeleteConfirmModal;