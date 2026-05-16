import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faPen, faToggleOn, faToggleOff,
  faPhone, faEnvelope, faUserTie, faKey,
} from '@fortawesome/free-solid-svg-icons';
import type { UserRecord } from '../../../api/users.api';
import { initials, avatarColor, ROLE_LABELS } from '../../../types/employeeTypes';
import { BtnOutline, BtnPrimary } from '../../ui';
import { RoleBadge, StatusBadge } from './EmployeeTable';

interface EmployeeDetailDrawerProps {
  employee: UserRecord;
  onClose: () => void;
  onEdit: (emp: UserRecord) => void;
  onToggle: (emp: UserRecord) => void;
}

const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({
  employee: emp, onClose, onEdit, onToggle,
}) => (
  <div
    className="fixed inset-0 bg-slate-900/30 z-[900] flex justify-end animate-[fadeIn_0.15s_ease]"
    onClick={onClose}
  >
    <div
      className="w-[340px] h-full bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)] flex flex-col animate-[slideIn_0.22s_cubic-bezier(0.34,1.1,0.64,1)]"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start gap-3.5 p-5 pb-[18px] border-b border-slate-100">
        <div
          className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[18px] font-black text-white flex-shrink-0"
          style={{ background: avatarColor(emp.id) }}
        >
          {initials(emp.fullName)}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <h3 className="text-base font-black text-slate-900 m-0">{emp.fullName}</h3>
          <RoleBadge role={emp.role} />
          <StatusBadge active={emp.isActive} />
        </div>
        <button
          className="w-[30px] h-[30px] bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center flex-shrink-0 hover:bg-red-100 hover:text-red-500 transition-all"
          onClick={onClose}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <section className="flex flex-col gap-2.5">
          <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.5px] m-0">Thông tin liên hệ</p>
          <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
            <FontAwesomeIcon icon={faPhone} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
            <span>{emp.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
            <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
            <span className="break-all">{emp.email}</span>
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.5px] m-0">Thông tin tài khoản</p>
          <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
            <FontAwesomeIcon icon={faUserTie} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
            <span>{ROLE_LABELS[emp.role]}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13.5px] text-slate-500">
            <FontAwesomeIcon icon={faKey} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
            <span>
              Đăng nhập cuối:{' '}
              {emp.lastLoginAt
                ? new Date(emp.lastLoginAt).toLocaleString('vi-VN')
                : 'Chưa đăng nhập'}
            </span>
          </div>
          <div className="text-[12px] text-gray-400">
            Tạo ngày: {new Date(emp.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-slate-100">
        <BtnOutline className="flex-1 justify-center" onClick={() => onToggle(emp)}>
          <FontAwesomeIcon icon={emp.isActive ? faToggleOn : faToggleOff} />
          {emp.isActive ? 'Khóa tài khoản' : 'Mở tài khoản'}
        </BtnOutline>
        <BtnPrimary className="flex-1 justify-center" onClick={() => onEdit(emp)}>
          <FontAwesomeIcon icon={faPen} /> Cập nhật
        </BtnPrimary>
      </div>
    </div>
  </div>
);

export default EmployeeDetailDrawer;
