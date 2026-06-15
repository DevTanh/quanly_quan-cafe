// src/components/tables/components/TableListView.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash, faChair, faToggleOn, faToggleOff, faQrcode } from '@fortawesome/free-solid-svg-icons';

interface TableItem {
  id: string;
  name: string;
  seats: number;
  note: string;
  status: 'active' | 'inactive';
}

interface Props {
  tables: TableItem[];
  onEdit: (t: TableItem) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onShowQr: (t: TableItem) => void;  // mới
}

const COLS = ['Tên phòng/bàn', 'Số ghế', 'Ghi chú', 'Trạng thái', 'Mã QR', 'Thao tác'];
const GRID = '2fr 80px 2fr 130px 70px 120px';

const TableListView: React.FC<Props> = ({ tables, onEdit, onToggle, onDelete, onShowQr }) => (
  <div className="flex-1 overflow-y-auto m-4 bg-white rounded-xl border border-[#e8eaed] overflow-hidden [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
    {/* Header */}
    <div
      className="grid border-b border-[#e8eaed] bg-[#f9fafb] sticky top-0 z-[1]"
      style={{ gridTemplateColumns: GRID }}
    >
      {COLS.map(col => (
        <div key={col} className="px-4 py-3 text-[12px] text-[#9ca3af] font-bold uppercase tracking-[0.3px]">
          {col}
        </div>
      ))}
    </div>

    {/* Rows */}
    {tables.map(t => (
      <div
        key={t.id}
        className={[
          'grid border-b border-[#f5f5f5] last:border-0 items-center transition-colors',
          t.status === 'inactive' ? 'opacity-55 bg-gray-50' : 'hover:bg-[#f9fffe]',
        ].join(' ')}
        style={{ gridTemplateColumns: GRID }}
      >
        {/* Name */}
        <div className="px-4 py-3">
          <span className="text-[13.5px] font-semibold text-gray-900">{t.name}</span>
        </div>

        {/* Seats */}
        <div className="px-4 py-3 flex items-center gap-1.5 text-[13px] text-gray-600">
          <FontAwesomeIcon icon={faChair} className="text-[#9ca3af] text-[11px]" />
          {t.seats}
        </div>

        {/* Note */}
        <div className="px-4 py-3 text-[12.5px] text-[#9ca3af] italic truncate max-w-[200px]">
          {t.note || '—'}
        </div>

        {/* Status */}
        <div className="px-4 py-3">
          <button
            onClick={() => onToggle(t.id)}
            className={[
              'flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-semibold border transition-colors',
              t.status === 'active'
                ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7]'
                : 'border-gray-200 bg-gray-50 text-[#9ca3af] hover:bg-gray-100',
            ].join(' ')}
          >
            <FontAwesomeIcon icon={t.status === 'active' ? faToggleOn : faToggleOff} />
            {t.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}
          </button>
        </div>

        {/* QR — chỉ hiện khi bàn active */}
        <div className="px-4 py-3">
          {t.status === 'active' ? (
            <button
              onClick={() => onShowQr(t)}
              title="Xem mã QR gọi món"
              className="w-8 h-8 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] flex items-center justify-center text-[#16a34a] hover:bg-[#dcfce7] transition-colors"
            >
              <FontAwesomeIcon icon={faQrcode} className="text-sm" />
            </button>
          ) : (
            <span className="text-[12px] text-gray-300">—</span>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-1.5">
          <button
            onClick={() => onEdit(t)}
            className="flex items-center gap-1 h-7 px-2.5 border-none rounded-[7px] text-[11.5px] font-semibold cursor-pointer transition-all bg-[#eff6ff] text-[#3b82f6] hover:bg-[#dbeafe]"
          >
            <FontAwesomeIcon icon={faPen} /> Sửa
          </button>
          <button
            onClick={() => onDelete(t.id)}
            className="h-7 px-2.5 border-none rounded-[7px] text-[11.5px] cursor-pointer flex items-center justify-center transition-all bg-[#fff1f2] text-[#e11d48] hover:bg-[#fecdd3]"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>
    ))}

    {tables.length === 0 && (
      <div className="flex items-center justify-center py-14 text-[13px] text-gray-300">
        Chưa có phòng/bàn nào
      </div>
    )}
  </div>
);

export default TableListView;