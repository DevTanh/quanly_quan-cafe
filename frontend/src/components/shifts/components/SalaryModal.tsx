import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faMoneyBill, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { fmt } from '../hooks/useAttendance';

interface Employee { id: string; name: string }

interface Props {
  employees: Employee[];
  salaryEdit: Record<string, string>;
  onChange: (empId: string, val: string) => void;
  fmtInput: (val: string) => string;
  onSave: () => void;
  onClose: () => void;
}

const SalaryModal: React.FC<Props> = ({
  employees, salaryEdit, onChange, fmtInput, onSave, onClose,
}) => (
  <div
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000]"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-[18px] w-[540px] max-w-[96vw] max-h-[85vh] flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.18)] overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
        <div>
          <h3 className="text-[17px] font-black text-slate-900 m-0 tracking-tight">Cấu hình mức lương</h3>
          <p className="text-[13px] text-gray-400 mt-0.5 m-0">Đơn vị: VND / giờ làm việc</p>
        </div>
        <button
          className="w-8 h-8 bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all"
          onClick={onClose}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
        {employees.map(emp => {
          const rawVal = salaryEdit[emp.id] ?? '';
          const numVal = parseInt(rawVal.replace(/\D/g, '') || '0', 10);
          return (
            <div
              key={emp.id}
              className="grid items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
              style={{ gridTemplateColumns: '1fr 160px 120px' }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold text-slate-900">{emp.name}</span>
                <span className="text-[11px] text-gray-400 font-mono">{emp.id}</span>
              </div>
              <div className="flex items-center border-[1.5px] border-gray-200 rounded-lg bg-white overflow-hidden transition-all focus-within:border-amber-400 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
                <input
                  className="flex-1 h-[38px] px-2.5 border-none bg-transparent text-sm font-bold text-slate-900 outline-none font-[inherit] text-right min-w-0"
                  placeholder="25.000"
                  value={rawVal}
                  onChange={e => onChange(emp.id, fmtInput(e.target.value))}
                />
                <span className="px-2.5 text-xs font-semibold text-gray-400 bg-slate-50 border-l border-gray-200 h-[38px] flex items-center whitespace-nowrap">
                  đ/giờ
                </span>
              </div>
              <div className="text-[11.5px] text-amber-600 font-medium text-right">
                {rawVal ? `≈ ${fmt(numVal * 8)}/ngày` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info bar */}
      <div className="flex items-start gap-2 px-6 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800 leading-relaxed shrink-0">
        <FontAwesomeIcon icon={faMoneyBill} className="shrink-0 mt-px text-amber-600" />
        Lương mỗi ca = Mức lương/giờ × Số giờ ca đó. Trạng thái "Nghỉ" và "Chấm công thiếu" không tính lương.
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 shrink-0">
        <button
          className="h-10 px-5 border border-gray-200 bg-white rounded-lg text-[13.5px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 font-[inherit]"
          onClick={onClose}
        >
          Huỷ
        </button>
        <button
          className="flex items-center gap-1.5 h-10 px-6 border-none bg-green-600 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-700 hover:shadow-[0_4px_14px_rgba(22,163,74,0.4)] hover:-translate-y-px transition-all font-[inherit]"
          onClick={onSave}
        >
          <FontAwesomeIcon icon={faCheckCircle} /> Lưu cấu hình
        </button>
      </div>
    </div>
  </div>
);

export default SalaryModal;
