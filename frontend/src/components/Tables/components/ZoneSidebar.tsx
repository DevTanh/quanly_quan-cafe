import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faPen, faTrash, faToggleOn, faToggleOff, faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';

interface TableItem {
  id: string; name: string; seats: number; note: string; status: 'active' | 'inactive';
}
interface Zone {
  id: string; name: string; note: string; status: 'active' | 'inactive'; tables: TableItem[];
}

interface Props {
  zones: Zone[];
  activeZone: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (z: Zone) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const ZoneSidebar: React.FC<Props> = ({
  zones, activeZone, onSelect, onAdd, onEdit, onToggle, onDelete,
}) => (
  <aside className="w-[220px] shrink-0 bg-white border-r border-[#e8eaed] flex flex-col overflow-hidden">
    <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-gray-100">
      <span className="text-[12px] font-bold text-[#888] uppercase tracking-[0.5px] flex items-center gap-1.5">
        <FontAwesomeIcon icon={faLayerGroup} /> Khu vực
      </span>
      <button
        onClick={onAdd}
        title="Thêm khu vực"
        className="w-[26px] h-[26px] border-none rounded-[6px] bg-[#f0fbf5] text-[#3dba74] cursor-pointer text-[12px] flex items-center justify-center font-bold transition-all hover:bg-[#3dba74] hover:text-white"
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-2 py-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
      {zones.map(z => (
        <div
          key={z.id}
          onClick={() => onSelect(z.id)}
          className={[
            'flex items-center justify-between px-2.5 py-[9px] rounded-lg cursor-pointer transition-all mb-0.5 gap-1.5 group',
            activeZone === z.id ? 'bg-[#f0fbf5] shadow-[inset_3px_0_0_#3dba74]' : 'hover:bg-[#f7f8fa]',
            z.status === 'inactive' ? 'opacity-45' : '',
          ].join(' ')}
        >
          <div className="flex-1 min-w-0">
            <span className={`block text-[13.5px] font-semibold truncate ${activeZone === z.id ? 'text-[#2a9e5e]' : 'text-[#1a1a1a]'}`}>
              {z.name}
            </span>
            <span className="block text-[11px] text-[#bbb] mt-px">{z.tables.length} bàn</span>
          </div>

          <div className="flex gap-px opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button title="Chỉnh sửa" onClick={() => onEdit(z)}
              className="w-6 h-6 border-none bg-transparent rounded-[5px] cursor-pointer text-[11px] text-[#bbb] flex items-center justify-center transition-all hover:bg-[#f0f0f0] hover:text-[#555]">
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              title={z.status === 'active' ? 'Ngừng hoạt động' : 'Cho phép hoạt động'}
              onClick={() => onToggle(z.id)}
              className="w-6 h-6 border-none bg-transparent rounded-[5px] cursor-pointer text-[11px] text-[#bbb] flex items-center justify-center transition-all hover:bg-[#f0f0f0] hover:text-[#555]"
            >
              <FontAwesomeIcon
                icon={z.status === 'active' ? faToggleOn : faToggleOff}
                className={z.status === 'active' ? 'text-[#3dba74] text-[15px]' : 'text-[#d1d5db] text-[15px]'}
              />
            </button>
            <button title="Xoá khu vực" onClick={() => onDelete(z.id)}
              className="w-6 h-6 border-none bg-transparent rounded-[5px] cursor-pointer text-[11px] text-[#bbb] flex items-center justify-center transition-all hover:bg-[#fff1f1] hover:text-[#e03e3e]">
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </aside>
);

export default ZoneSidebar;
