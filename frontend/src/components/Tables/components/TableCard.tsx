import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash, faChair } from '@fortawesome/free-solid-svg-icons';

interface TableItem {
  id: string; name: string; seats: number; note: string; status: 'active' | 'inactive';
}

interface Props {
  table: TableItem;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const TableCard: React.FC<Props> = ({ table: t, onEdit, onToggle, onDelete }) => (
  <div className={[
    'bg-white rounded-2xl px-4 pt-[18px] pb-3.5 border flex flex-col gap-2.5 transition-all relative cursor-default',
    t.status === 'inactive'
      ? 'opacity-50 border-dashed border-gray-200 hover:border-gray-300'
      : 'border-[1.5px] border-[#f0f0f0] hover:border-[#3dba74] hover:shadow-[0_6px_24px_rgba(61,186,116,0.12)] hover:-translate-y-0.5',
  ].join(' ')}>
    <div className="flex items-start justify-between gap-1.5">
      <span className="text-[15px] font-bold text-gray-900 leading-snug">{t.name}</span>
      <div
        title={t.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}
        className="w-[9px] h-[9px] rounded-full shrink-0 mt-1 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
        style={{ background: t.status === 'active' ? '#3dba74' : '#d1d5db' }}
      />
    </div>

    <div className="flex items-center gap-1.5 text-[12.5px] text-gray-500 font-medium">
      <FontAwesomeIcon icon={faChair} className="text-[#9ca3af] text-[11px]" />
      <span>{t.seats} ghế</span>
    </div>

    {t.note && <p className="text-[11.5px] text-[#9ca3af] m-0 italic truncate">{t.note}</p>}

    <div className="h-px bg-[#f5f5f5] -mx-1" />

    <div className="flex gap-1.5 pt-0.5">
      <button
        onClick={onEdit}
        className="flex-1 h-7 border-none rounded-[7px] text-[11.5px] font-semibold cursor-pointer flex items-center justify-center gap-1 transition-all bg-[#eff6ff] text-[#3b82f6] hover:bg-[#dbeafe]"
      >
        <FontAwesomeIcon icon={faPen} /> Sửa
      </button>
      <button
        onClick={onToggle}
        className={[
          'flex-[1.5] h-7 border-none rounded-[7px] text-[11px] font-semibold cursor-pointer flex items-center justify-center transition-all',
          t.status === 'active'
            ? 'bg-[#fff7ed] text-[#ea580c] hover:bg-[#fed7aa]'
            : 'bg-[#f0fdf4] text-[#16a34a] hover:bg-[#bbf7d0]',
        ].join(' ')}
      >
        {t.status === 'active' ? 'Ngừng HĐ' : 'Hoạt động'}
      </button>
      <button
        onClick={onDelete}
        className="flex-[0.7] h-7 border-none rounded-[7px] text-[11.5px] cursor-pointer flex items-center justify-center transition-all bg-[#fff1f2] text-[#e11d48] hover:bg-[#fecdd3]"
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>
  </div>
);

export default TableCard;
