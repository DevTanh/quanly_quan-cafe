import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown, faChevronUp, faSearch, faFilter, faXmark,
} from '@fortawesome/free-solid-svg-icons';

interface CollapseSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CollapseSection: React.FC<CollapseSectionProps> = ({
  title, open, onToggle, children,
}) => (
  <div className="bg-white rounded-lg px-3.5 pt-3.5 pb-2.5 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <div
      className="flex items-center justify-between cursor-pointer select-none mb-2"
      onClick={onToggle}
    >
      <span className="text-[13px] font-semibold text-gray-700">{title}</span>
      <FontAwesomeIcon
        icon={open ? faChevronUp : faChevronDown}
        className="text-[11px] text-gray-400"
      />
    </div>
    {open && <div className="flex flex-col gap-1.5">{children}</div>}
  </div>
);

interface FilterCheckboxProps {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}

export const FilterCheckbox: React.FC<FilterCheckboxProps> = ({
  label, count, checked, onChange,
}) => (
  <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
    <input
      type="checkbox"
      className="w-[15px] h-[15px] accent-green-600 cursor-pointer"
      checked={checked}
      onChange={onChange}
    />
    <span className="flex-1">{label}</span>
    {count !== undefined && (
      <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-px rounded-xl font-semibold">
        {count}
      </span>
    )}
  </label>
);

interface ActiveFilterBadgeProps {
  count: number;
  onClear: () => void;
}

export const ActiveFilterBadge: React.FC<ActiveFilterBadgeProps> = ({ count, onClear }) => {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2 text-xs text-amber-800 mb-2">
      <FontAwesomeIcon icon={faFilter} className="text-amber-400" />
      <span>Đang lọc: {count} bộ lọc</span>
      <button
        className="ml-auto bg-transparent border-none text-red-500 text-xs cursor-pointer underline p-0 font-[inherit]"
        onClick={onClear}
      >
        Xoá hết
      </button>
    </div>
  );
};

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onEnter?: () => void;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value, onChange, placeholder = 'Tìm kiếm...', onClear, onEnter, className = '',
}) => (
  <div className={`relative flex items-center h-9 border border-gray-200 rounded-lg bg-slate-50 overflow-hidden transition-all focus-within:border-green-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] ${className}`}>
    <FontAwesomeIcon
      icon={faSearch}
      className="px-2.5 text-gray-400 text-xs flex-shrink-0 pointer-events-none"
    />
    <input
      className="h-full px-0 border-none bg-transparent text-[13px] text-slate-900 outline-none flex-1 font-[inherit] placeholder:text-gray-400"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onEnter?.()}
    />
    {value && (
      <button
        className="px-2.5 border-none bg-transparent text-gray-400 cursor-pointer text-xs flex items-center hover:text-red-500 transition-colors"
        onClick={() => { onChange(''); onClear?.(); }}
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    )}
  </div>
);
