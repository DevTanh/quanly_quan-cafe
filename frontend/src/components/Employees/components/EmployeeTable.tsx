import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faToggleOn, faToggleOff, faUser } from '@fortawesome/free-solid-svg-icons';
import type { UserRecord } from '../../../api/users.api';
import type { UserRole } from '../../../types';
import { ROLE_LABELS, ROLE_COLORS, initials, avatarColor } from '../../../types/employeeTypes';
import { IconBtn } from '../../ui';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const c = ROLE_COLORS[role];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold border"
      style={{ background: c.bg, color: c.text, borderColor: c.bg }}
    >
      {ROLE_LABELS[role]}
    </span>
  );
};

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold border ${
    active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-gray-400 border-gray-200'
  }`}>
    {active ? 'Hoạt động' : 'Đã khóa'}
  </span>
);

const HEADERS = ['Nhân viên', 'Số điện thoại', 'Email', 'Vai trò', 'Trạng thái', 'Thao tác'];
const GRID_COLS = '2.5fr 1.4fr 1.6fr 1.2fr 1.3fr 100px';

interface EmployeeTableProps {
  employees: UserRecord[];
  onRowClick: (emp: UserRecord) => void;
  onEdit: (emp: UserRecord) => void;
  onToggle: (emp: UserRecord) => void;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees, onRowClick, onEdit, onToggle,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
    {/* Head */}
    <div
      className="grid items-center bg-slate-50 border-b-[1.5px] border-gray-200 sticky top-0 z-[1]"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      {HEADERS.map(h => (
        <div key={h} className="px-3.5 py-2.5 text-[11px] text-gray-400 font-bold uppercase tracking-[0.4px]">
          {h}
        </div>
      ))}
    </div>

    {/* Body */}
    {employees.length === 0 ? (
      <div className="flex flex-col items-center gap-3 py-16">
        <FontAwesomeIcon icon={faUser} className="text-[44px] text-gray-200" />
        <p className="text-sm text-gray-400 m-0">Không tìm thấy nhân viên nào</p>
      </div>
    ) : (
      employees.map((emp, i) => (
        <div
          key={emp.id}
          className={`grid items-center border-b border-slate-50 cursor-pointer transition-colors last:border-b-0 hover:bg-slate-50 ${
            i % 2 === 1 ? 'bg-slate-50/60' : ''
          } ${!emp.isActive ? 'opacity-50' : ''}`}
          style={{ gridTemplateColumns: GRID_COLS }}
          onClick={() => onRowClick(emp)}
        >
          {/* Avatar + name */}
          <div className="px-3.5 py-2.5 flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
              style={{ background: avatarColor(emp.id) }}
            >
              {initials(emp.fullName)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-900 text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">
                {emp.fullName}
              </span>
              <span className="text-[11px] text-gray-400 mt-px">#{emp.id}</span>
            </div>
          </div>

          <div className="px-3.5 py-2.5 text-[13.5px] text-slate-600">{emp.phone || '—'}</div>
          <div className="px-3.5 py-2.5 text-[13px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">{emp.email}</div>
          <div className="px-3.5 py-2.5"><RoleBadge role={emp.role} /></div>
          <div className="px-3.5 py-2.5"><StatusBadge active={emp.isActive} /></div>

          {/* Actions */}
          <div className="px-3.5 py-2.5 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <IconBtn variant="edit" title="Chỉnh sửa" onClick={() => onEdit(emp)}>
              <FontAwesomeIcon icon={faPen} />
            </IconBtn>
            <IconBtn variant="neutral" title={emp.isActive ? 'Khóa tài khoản' : 'Mở tài khoản'} onClick={() => onToggle(emp)}>
              <FontAwesomeIcon
                icon={emp.isActive ? faToggleOn : faToggleOff}
                className={`text-[15px] ${emp.isActive ? 'text-green-500' : 'text-gray-300'}`}
              />
            </IconBtn>
          </div>
        </div>
      ))
    )}
  </div>
);

export { RoleBadge, StatusBadge };
export default EmployeeTable;
