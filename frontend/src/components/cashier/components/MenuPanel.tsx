// src/components/cashier/components/MenuPanel.tsx
import React from 'react';
import type { MenuItem } from '../../../types/cashier.types';
import { fmt } from '../hooks/useCashier';

interface Props {
  loading: boolean;
  menuFetched: boolean;
  filteredMenu: MenuItem[];
  searchMenu: string;
  setSearchMenu: (v: string) => void;
  searchCategory: string;
  setSearchCategory: (v: string) => void;
  categories: string[];
  onAddItem: (item: MenuItem) => void;
  onClose: () => void;
}

const MenuPanel: React.FC<Props> = ({
  loading, menuFetched, filteredMenu, searchMenu, setSearchMenu,
  searchCategory, setSearchCategory, categories, onAddItem, onClose,
}) => (
  <div className="border-b border-[#e6e6e2] shrink-0 bg-[#fafafa]">
    {/* Header */}
    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
      <input
        value={searchMenu}
        onChange={e => setSearchMenu(e.target.value)}
        placeholder="Tìm món..."
        autoFocus
        className="flex-1 h-8 px-3 rounded-lg border-[1.5px] border-[#e6e6e2] bg-white text-[12.5px] text-[#111110] outline-none transition-colors focus:border-[#111110] placeholder:text-[#a8a8a3]"
      />
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-lg border-[1.5px] border-[#e6e6e2] bg-white text-[#6b6b68] hover:text-[#111110] transition-colors shrink-0"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 1l10 10M11 1L1 11" />
        </svg>
      </button>
    </div>

    {/* Category tabs */}
    {categories.length > 0 && (
      <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSearchCategory('')}
          className={[
            'shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all',
            !searchCategory
              ? 'bg-[#111110] text-white border-[#111110]'
              : 'bg-white text-[#6b6b68] border-[#e6e6e2] hover:border-[#cacac4]',
          ].join(' ')}
        >
          Tất cả
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSearchCategory(cat === searchCategory ? '' : cat)}
            className={[
              'shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all whitespace-nowrap',
              searchCategory === cat
                ? 'bg-[#111110] text-white border-[#111110]'
                : 'bg-white text-[#6b6b68] border-[#e6e6e2] hover:border-[#cacac4]',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>
    )}

    {/* Grid */}
    <div className="px-3 pb-3">
      {loading ? (
        <div className="grid grid-cols-2 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-lg bg-[#e8e8e5] animate-pulse" />
          ))}
        </div>
      ) : filteredMenu.length === 0 ? (
        <p className="text-[12px] text-[#a8a8a3] text-center py-3">
          {menuFetched ? 'Không tìm thấy món' : 'Không thể tải thực đơn'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-[#cacac4]">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => onAddItem(item)}
              className="flex flex-col items-start px-[10px] py-[8px] rounded-lg border-[1.5px] border-[#e6e6e2] bg-white text-left cursor-pointer transition-all hover:border-[#111110] hover:shadow-sm active:scale-[0.98]"
            >
              <span className="text-[12.5px] font-semibold text-[#111110] leading-[1.3] line-clamp-1">
                {item.name}
              </span>
              <span className="font-mono text-[11.5px] text-[#6b6b68] mt-0.5">
                {fmt(item.price)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default MenuPanel;