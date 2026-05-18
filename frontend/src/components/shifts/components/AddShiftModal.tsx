import React from 'react';
import { parseHours } from '../hooks/useAttendance';

interface Props {
  newShift: { name: string; startTime: string; endTime: string };
  onChange: (field: string, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const inputCls = 'h-10 px-3 border border-gray-200 rounded-lg text-[13.5px] text-slate-900 bg-slate-50 outline-none transition-all font-[inherit] focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,163,74,0.12)]';

const AddShiftModal: React.FC<Props> = ({ newShift, onChange, onSave, onClose }) => (
  <div
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000]"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-[18px] w-[400px] max-w-[96vw] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.18)]"
      onClick={e => e.stopPropagation()}
    >
      <h3 className="text-[17px] font-black text-slate-900 m-0 mb-5 tracking-tight">Thêm ca làm việc</h3>

      <div className="flex flex-col gap-3.5 mb-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-bold text-slate-600">Tên ca <span className="text-red-500">*</span></label>
          <input
            className={inputCls}
            placeholder="VD: Ca sáng, Ca khuya..."
            value={newShift.name}
            onChange={e => onChange('name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-slate-600">Giờ bắt đầu</label>
            <input
              className={inputCls}
              type="time"
              value={newShift.startTime}
              onChange={e => onChange('startTime', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-slate-600">Giờ kết thúc</label>
            <input
              className={inputCls}
              type="time"
              value={newShift.endTime}
              onChange={e => onChange('endTime', e.target.value)}
            />
          </div>
        </div>

        {newShift.startTime && newShift.endTime && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5 text-[13px] text-green-800">
            Số giờ: <strong className="text-[15px]">{parseHours(newShift.startTime, newShift.endTime)}h</strong>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="h-10 px-5 border border-gray-200 bg-white rounded-lg text-[13.5px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 font-[inherit]"
          onClick={onClose}
        >
          Huỷ
        </button>
        <button
          className="h-10 px-6 border-none bg-green-600 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-700 hover:shadow-[0_4px_14px_rgba(22,163,74,0.4)] hover:-translate-y-px transition-all font-[inherit]"
          onClick={onSave}
        >
          Lưu ca
        </button>
      </div>
    </div>
  </div>
);

export default AddShiftModal;
