import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToggleOn, faToggleOff, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { UserRole } from '../../../types';
import { ROLE_LABELS } from '../../../types/employeeTypes';
import {
  Overlay, ModalCard, ModalHeader, ModalBody, ModalFooter,
} from '../../ui/Modal';
import { labelCls, inputCls, selectCls } from '../../ui/Form';

interface EmployeeFormFields {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  password: string;
}

interface EmployeeFormModalProps {
  mode: 'create' | 'edit';
  form: EmployeeFormFields;
  saving: boolean;
  onChange: (key: keyof EmployeeFormFields, value: string | boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [UserRole, string][];

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  mode, form, saving, onChange, onSave, onClose,
}) => {
  const title = mode === 'create' ? 'Thêm nhân viên' : 'Cập nhật nhân viên';
  const saveLabel = mode === 'create' ? 'Thêm nhân viên' : 'Lưu thay đổi';

  return (
    <Overlay onClose={onClose}>
      <ModalCard>
        <ModalHeader title={title} onClose={onClose} />
        <ModalBody>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Họ và tên <span className="text-red-500">*</span></label>
                <input
                  className={inputCls}
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={e => onChange('fullName', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Số điện thoại</label>
                <input
                  className={inputCls}
                  placeholder="0900 000 000"
                  value={form.phone}
                  onChange={e => onChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Email <span className="text-red-500">*</span></label>
              <input
                className={inputCls}
                type="email"
                placeholder="nhanvien@cafe.vn"
                value={form.email}
                onChange={e => onChange('email', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                {mode === 'create' ? 'Mật khẩu' : 'Đổi mật khẩu'}
                {mode === 'create'
                  ? <span className="text-red-500"> *</span>
                  : <span className="text-[11px] font-normal text-gray-400 ml-1">(để trống nếu không đổi)</span>
                }
              </label>
              <input
                className={inputCls}
                type="password"
                placeholder={mode === 'create' ? 'Tối thiểu 6 ký tự' : 'Mật khẩu mới...'}
                value={form.password}
                onChange={e => onChange('password', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Vai trò <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    className={`${selectCls} w-full`}
                    value={form.role}
                    onChange={e => onChange('role', e.target.value)}
                  >
                    {ROLE_OPTIONS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Trạng thái</label>
                <button
                  type="button"
                  className={`flex items-center gap-2 h-10 px-3 rounded-lg border cursor-pointer text-[13px] font-semibold transition-all font-[inherit] ${
                    form.isActive
                      ? 'border-green-500 text-green-600 bg-green-50'
                      : 'border-gray-200 text-gray-400 bg-slate-50'
                  }`}
                  onClick={() => onChange('isActive', !form.isActive)}
                >
                  <FontAwesomeIcon icon={form.isActive ? faToggleOn : faToggleOff} />
                  {form.isActive
                    ? (mode === 'create' ? 'Kích hoạt ngay' : 'Đang hoạt động')
                    : (mode === 'create' ? 'Chưa kích hoạt' : 'Đã khóa')
                  }
                </button>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter onCancel={onClose} onSave={onSave} saveLabel={saveLabel} saving={saving} />
      </ModalCard>
    </Overlay>
  );
};

export default EmployeeFormModal;
