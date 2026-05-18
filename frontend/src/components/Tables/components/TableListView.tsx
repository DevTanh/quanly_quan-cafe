import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash, faChair, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';

interface TableItem {
  id: string; name: string; seats: number; note: string; status: 'active' | 'inactive';
}

interface Props {
  tables: TableItem[];
  onEdit: (t: TableItem) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const COLS = ['Tên phòng/bàn', 'Số ghế', 'Ghi chú', 'Trạng thái', 'Thao tác'];
const GRID = '2fr 90px 2fr 140px 100px';

const TableListView: React.FC<Props> = ({ tables, onEdit, onToggle, onDelete }) => (
  <div className="flex-1 overflow-y-auto m-4 bg-white rounded-xl border border-[#e8eaed] overflow-hidden [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
    {/* Header */}
    <div className="grid border-b border-[#e8eaed] bg-[#f9fafb] sticky top-0 z-[1]"
      style={{ gridTemplateColumns: GRID }}>
      {COLS.map(col => (
        <div key={col} className="px-4 py-3 text-[12px] text-[#9ca3af] font-bold uppercase tracking-[0.3px]">
          {col}
        </div>
      ))}
    </div>

    {/* Rows */}
    {tables.map((t, i) => (
      <div
        key={t.id}
        className={[
          'grid border-b border-[#f5f5f5] items-center transition-colors',
          i % 2 === 1 ? 'bg-[#fafafa] hover:bg-[#f4f5f7]' : 'hover:bg-[#fafbfc]',
          t.status === 'inactive' ? 'opacity-45' : '',
        ].join(' ')}
        style={{ gridTemplateColumns: GRID }}
      >
        <div className="px-4 py-3">
          <span className="font-semibold text-gray-900 text-[13.5px]">{t.name}</span>
        </div>
        <div className="px-4 py-3 text-[13.5px] text-gray-700 flex items-center gap-1.5">
          <FontAwesomeIcon icon={faChair} className="text-[#9ca3af] text-[11px]" /> {t.seats}
        </div>
        <div className="px-4 py-3 text-[13.5px] text-gray-700">{t.note || '—'}</div>
        <div className="px-4 py-3">
          <button
            onClick={() => onToggle(t.id)}
            className="inline-flex items-center gap-1.5 border-none bg-transparent cursor-pointer text-[13px] text-gray-500 px-2 py-[5px] rounded-md transition-colors hover:bg-gray-100 font-[inherit]"
          >
            <FontAwesomeIcon
              icon={t.status === 'active' ? faToggleOn : faToggleOff}
              className={t.status === 'active' ? 'text-[#3dba74] text-[15px]' : 'text-[#d1d5db] text-[15px]'}
            />
            <span>{t.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}</span>
          </button>
        </div>
        <div className="px-4 py-3 flex items-center gap-1.5">
          <button
            onClick={() => onEdit(t)}
            className="w-[30px] h-[30px] border-none rounded-[7px] cursor-pointer text-[12px] inline-flex items-center justify-center transition-all bg-[#eff6ff] text-[#3b82f6] hover:bg-[#dbeafe]"
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
          <button
            onClick={() => onDelete(t.id)}
            className="w-[30px] h-[30px] border-none rounded-[7px] cursor-pointer text-[12px] inline-flex items-center justify-center transition-all bg-[#fff1f2] text-[#e11d48] hover:bg-[#fecdd3]"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>
    ))}
  </div>
);

export default TableListView;
