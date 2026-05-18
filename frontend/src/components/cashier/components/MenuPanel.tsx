import React from 'react';
import type { MenuItem } from '../../../types/cashier.types';
import { fmt } from '../hooks/useCashier';

interface Props {
  loading: boolean;
  menuFetched: boolean;
  filteredMenu: MenuItem[];
  searchMenu: string;
  setSearchMenu: (v: string) => void;
  onAddItem: (item: MenuItem) => void;
}

const MenuPanel: React.FC<Props> = ({
  loading, menuFetched, filteredMenu, searchMenu, setSearchMenu, onAddItem,
}) => (
  <div className="border-b border-[#e6e6e2] shrink-0 bg-[#f6f6f4] p-3">
    <input
      value={searchMenu}
      onChange={e => setSearchMenu(e.target.value)}
      placeholder="Tìm món..."
      className="w-full h-9 px-3 mb-2 rounded-lg border-[1.5px] border-[#e6e6e2] bg-[#f6f6f4] text-[13px] text-[#111110] outline-none transition-colors focus:border-[#111110] focus:bg-white placeholder:text-[#a8a8a3]"
    />

    {loading ? (
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[52px] rounded-lg bg-[#e8e8e5] animate-pulse" />
        ))}
      </div>
    ) : filteredMenu.length === 0 ? (
      <p className="text-[12.5px] text-[#a8a8a3] text-center py-3">
        {menuFetched ? 'Không tìm thấy món' : 'Không thể tải thực đơn'}
      </p>
    ) : (
      <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto scrollbar-thin scrollbar-thumb-[#cacac4]">
        {filteredMenu.map(item => (
          <button
            key={item.id}
            onClick={() => onAddItem(item)}
            className="flex flex-col items-start px-[11px] py-[9px] rounded-lg border-[1.5px] border-[#e6e6e2] bg-white text-left cursor-pointer transition-all hover:border-[#111110] hover:bg-[#f6f6f4]"
          >
            <span className="text-[12.5px] font-semibold text-[#111110] tracking-[-0.01em] leading-[1.35]">
              {item.name}
            </span>
            <span className="font-mono text-[12px] text-[#6b6b68] mt-0.5">
              {fmt(item.price)}
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
);

export default MenuPanel;
