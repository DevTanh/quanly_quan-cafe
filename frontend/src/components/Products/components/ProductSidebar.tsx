import React, { useState } from 'react';
import type { Category } from '../../../api/products.api';
import {
  CollapseSection, FilterCheckbox, ActiveFilterBadge, SearchInput,
} from '../../ui';

const MENU_TYPE_OPTIONS = [
  { value: 'beverage', label: 'Đồ uống' },
  { value: 'food', label: 'Đồ ăn' },
  { value: 'other', label: 'Khác' },
];

const STATUS_OPTIONS = ['Đang kinh doanh', 'Ngừng kinh doanh'];

interface ProductSidebarProps {
  search: string;
  onSearchChange: (v: string) => void;
  menuTypes: string[];
  categoryIds: number[];
  statuses: string[];
  categories: Array<Category & { count: number }>;
  activeFilterCount: number;
  onToggleMenu: (val: string) => void;
  onToggleCategory: (id: number) => void;
  onToggleStatus: (val: string) => void;
  onClearFilters: () => void;
}

const ProductSidebar: React.FC<ProductSidebarProps> = ({
  search, onSearchChange,
  menuTypes, categoryIds, statuses,
  categories, activeFilterCount,
  onToggleMenu, onToggleCategory, onToggleStatus, onClearFilters,
}) => {
  const [showMenu, setShowMenu] = useState(true);
  const [showCat, setShowCat] = useState(true);
  const [showStatus, setShowStatus] = useState(true);

  return (
    <>
      {/* Search */}
      <div className="bg-white rounded-lg px-3.5 py-3.5 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Theo mã, tên hàng hóa"
          className="border-gray-300 focus-within:border-green-500"
        />
      </div>

      <ActiveFilterBadge count={activeFilterCount} onClear={onClearFilters} />

      <CollapseSection
        title="Loại thực đơn"
        open={showMenu}
        onToggle={() => setShowMenu(v => !v)}
      >
        {MENU_TYPE_OPTIONS.map(({ value, label }) => (
          <FilterCheckbox
            key={value}
            label={label}
            checked={menuTypes.includes(value)}
            onChange={() => onToggleMenu(value)}
          />
        ))}
      </CollapseSection>

      <CollapseSection
        title="Danh mục"
        open={showCat}
        onToggle={() => setShowCat(v => !v)}
      >
        {categories.map(cat => (
          <FilterCheckbox
            key={cat.id}
            label={cat.name}
            count={cat.count}
            checked={categoryIds.includes(cat.id)}
            onChange={() => onToggleCategory(cat.id)}
          />
        ))}
      </CollapseSection>

      <CollapseSection
        title="Trạng thái"
        open={showStatus}
        onToggle={() => setShowStatus(v => !v)}
      >
        {STATUS_OPTIONS.map(t => (
          <FilterCheckbox
            key={t}
            label={t}
            checked={statuses.includes(t)}
            onChange={() => onToggleStatus(t)}
          />
        ))}
      </CollapseSection>
    </>
  );
};

export default ProductSidebar;
