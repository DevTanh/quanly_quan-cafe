import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFilter, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { UserRole } from '../../../types';
import { ROLE_LABELS } from '../../../types/employeeTypes';
import type { QueryUserParams } from '../../../api/users.api';
import { BtnOutline, BtnPrimary, SearchInput } from '../../ui';
import { selectCls } from '../../ui/Form';

interface EmployeeToolbarProps {
  search: string;
  filterRole: UserRole | '';
  filterStatus: 'true' | 'false' | '';
  showFilter: boolean;
  activeFilterCount: number;
  totalCount: number;
  onSearchChange: (v: string) => void;
  onFilterRoleChange: (v: UserRole | '') => void;
  onFilterStatusChange: (v: 'true' | 'false' | '') => void;
  onToggleFilter: () => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onAdd: () => void;
}

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [UserRole, string][];

const EmployeeToolbar: React.FC<EmployeeToolbarProps> = ({
  search, filterRole, filterStatus, showFilter, activeFilterCount,
  totalCount, onSearchChange, onFilterRoleChange, onFilterStatusChange,
  onToggleFilter, onSearch, onClearFilters, onAdd,
}) => (
  <>
    {/* Main toolbar */}
    <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200 flex-shrink-0 gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Tên, email, số điện thoại..."
          onEnter={onSearch}
          onClear={() => onSearch()}
          className="w-64"
        />

        <button
          className={`flex items-center gap-1.5 h-9 px-3.5 border rounded-lg text-[13px] font-semibold cursor-pointer transition-all font-[inherit] ${
            showFilter
              ? 'border-green-500 text-green-600 bg-green-50'
              : 'border-gray-200 text-slate-600 bg-white hover:border-green-500 hover:text-green-600 hover:bg-green-50'
          }`}
          onClick={onToggleFilter}
        >
          <FontAwesomeIcon icon={faFilter} />
          Bộ lọc
          {activeFilterCount > 0 && (
            <span className="bg-green-600 text-white text-[10px] font-bold rounded-xl px-1.5 py-px min-w-[18px] text-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <BtnOutline onClick={onSearch}>Tìm kiếm</BtnOutline>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px] text-slate-500 whitespace-nowrap">
          Tổng <strong className="text-slate-900">{totalCount}</strong> nhân viên
        </span>
        <BtnPrimary onClick={onAdd}>
          <FontAwesomeIcon icon={faPlus} /> Thêm nhân viên
        </BtnPrimary>
      </div>
    </div>

    {/* Filter bar */}
    {showFilter && (
      <div className="flex items-end gap-3 px-6 py-3 bg-slate-50/80 border-b border-gray-200 flex-shrink-0 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.4px]">Vai trò</label>
          <div className="relative">
            <select
              className={`${selectCls} min-w-[148px] h-[34px] pl-2.5`}
              value={filterRole}
              onChange={e => onFilterRoleChange(e.target.value as UserRole | '')}
            >
              <option value="">Tất cả</option>
              {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.4px]">Trạng thái</label>
          <div className="relative">
            <select
              className={`${selectCls} min-w-[148px] h-[34px] pl-2.5`}
              value={filterStatus}
              onChange={e => onFilterStatusChange(e.target.value as 'true' | 'false' | '')}
            >
              <option value="">Tất cả</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <button
            className="h-[34px] px-3.5 border border-red-200 bg-red-50 rounded-lg text-[13px] font-semibold text-red-600 cursor-pointer hover:bg-red-200 transition-all font-[inherit] self-end"
            onClick={onClearFilters}
          >
            Xoá bộ lọc
          </button>
        )}
      </div>
    )}
  </>
);

export default EmployeeToolbar;
