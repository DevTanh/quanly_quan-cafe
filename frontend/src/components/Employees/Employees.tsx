import React, { useState, useMemo } from 'react';
import type { UserRecord } from '../../api/users.api';
import type { UserRole } from '../../types';
import { INIT_CREATE_FORM, toUpdateForm } from '../../types/employeeTypes';
import { LoadingState, ErrorState, ConfirmModal, ApiErrorToast } from '../ui';
import { useEmployees } from './hooks/useEmployees';
import EmployeeToolbar from './components/EmployeeToolbar';
import EmployeeTable from './components/EmployeeTable';
import EmployeeDetailDrawer from './components/EmployeeDetailDrawer';
import EmployeeFormModal from './components/EmployeeFormModal';

type FormFields = {
  fullName: string; email: string; phone: string;
  role: UserRole; isActive: boolean; password: string;
};

const EMPTY_FORM: FormFields = {
  fullName: '', email: '', phone: '', role: 'staff', isActive: true, password: '',
};

const Employees: React.FC = () => {
  const { employees, loading, error, search: fetchSearch, retry,
    createEmployee, updateEmployee, toggleActive } = useEmployees();

  // ── Filter state ──
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | ''>('');
  const [filterStatus, setFilterStatus] = useState<'true' | 'false' | ''>('');
  const [showFilter, setShowFilter] = useState(false);

  // ── Modal state ──
  const [detailId, setDetailId] = useState<number | null>(null);
  const [createModal, setCreateModal] = useState<{ open: boolean; form: FormFields; saving: boolean }>(
    { open: false, form: { ...EMPTY_FORM }, saving: false },
  );
  const [editModal, setEditModal] = useState<{ open: boolean; id: number | null; form: FormFields; saving: boolean }>(
    { open: false, id: null, form: { ...EMPTY_FORM }, saving: false },
  );
  const [confirm, setConfirm] = useState<{ open: boolean; message: string; onConfirm: () => Promise<void>; running: boolean }>(
    { open: false, message: '', onConfirm: async () => {}, running: false },
  );
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Derived ──
  const filtered = useMemo(() => employees.filter(e => {
    const q = searchText.toLowerCase();
    if (q && !e.fullName.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q) && !(e.phone ?? '').includes(q)) return false;
    if (filterRole && e.role !== filterRole) return false;
    if (filterStatus !== '' && String(e.isActive) !== filterStatus) return false;
    return true;
  }), [employees, searchText, filterRole, filterStatus]);

  const activeFilterCount = [filterRole, filterStatus].filter(Boolean).length;
  const detailEmp = employees.find(e => e.id === detailId);

  // ── Handlers ──
  const handleSearch = () => fetchSearch({
    search: searchText || undefined,
    role: filterRole || undefined,
    isActive: filterStatus !== '' ? filterStatus === 'true' : undefined,
  });

  const handleClearFilters = () => {
    setFilterRole(''); setFilterStatus('');
    fetchSearch({ search: searchText || undefined });
  };

  const openCreate = () => setCreateModal({ open: true, form: { ...EMPTY_FORM }, saving: false });

  const handleCreate = async () => {
    const f = createModal.form;
    if (!f.fullName.trim() || !f.email.trim() || !f.password.trim()) return;
    setCreateModal(v => ({ ...v, saving: true }));
    setApiError(null);
    try {
      await createEmployee({ fullName: f.fullName, email: f.email, phone: f.phone || undefined, password: f.password, role: f.role, isActive: f.isActive });
      setCreateModal(v => ({ ...v, open: false, saving: false }));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setApiError(Array.isArray(msg) ? msg[0] : msg ?? 'Tạo thất bại');
      setCreateModal(v => ({ ...v, saving: false }));
    }
  };

  const openEdit = (emp: UserRecord) => {
    const f = toUpdateForm(emp);
    setEditModal({
      open: true, id: emp.id, saving: false,
      form: { fullName: f.fullName ?? '', email: f.email ?? '', phone: f.phone ?? '', role: f.role ?? 'staff', isActive: f.isActive ?? true, password: '' },
    });
    setDetailId(null);
  };

  const handleEdit = async () => {
    if (!editModal.id) return;
    const f = editModal.form;
    if (!f.fullName.trim() || !f.email.trim()) return;
    setEditModal(v => ({ ...v, saving: true }));
    setApiError(null);
    try {
      const payload: any = { fullName: f.fullName, email: f.email, phone: f.phone || undefined, role: f.role, isActive: f.isActive };
      if (f.password.trim()) payload.password = f.password;
      await updateEmployee(editModal.id, payload);
      setEditModal(v => ({ ...v, open: false, saving: false }));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setApiError(Array.isArray(msg) ? msg[0] : msg ?? 'Cập nhật thất bại');
      setEditModal(v => ({ ...v, saving: false }));
    }
  };

  const handleToggle = (emp: UserRecord) => {
    setConfirm({
      open: true, running: false,
      message: emp.isActive
        ? `Khóa tài khoản của "${emp.fullName}"? Nhân viên sẽ không thể đăng nhập.`
        : `Mở lại tài khoản "${emp.fullName}"?`,
      onConfirm: async () => {
        setConfirm(v => ({ ...v, running: true }));
        try {
          await toggleActive(emp);
          setDetailId(null);
        } finally {
          setConfirm(v => ({ ...v, open: false, running: false }));
        }
      },
    });
  };

  // ── Render ──
  if (loading) return <LoadingState message="Đang tải danh sách nhân viên..." className="h-[calc(100vh-96px)]" />;
  if (error) return <ErrorState message={error} onRetry={retry} className="h-[calc(100vh-96px)]" />;

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-slate-50 overflow-hidden font-[Segoe_UI,sans-serif]">
      {apiError && <ApiErrorToast message={apiError} onDismiss={() => setApiError(null)} />}

      <EmployeeToolbar
        search={searchText}
        filterRole={filterRole}
        filterStatus={filterStatus}
        showFilter={showFilter}
        activeFilterCount={activeFilterCount}
        totalCount={filtered.length}
        onSearchChange={setSearchText}
        onFilterRoleChange={setFilterRole}
        onFilterStatusChange={setFilterStatus}
        onToggleFilter={() => setShowFilter(v => !v)}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
        onAdd={openCreate}
      />

      <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
        <EmployeeTable
          employees={filtered}
          onRowClick={emp => setDetailId(emp.id)}
          onEdit={openEdit}
          onToggle={handleToggle}
        />
      </div>

      {detailEmp && (
        <EmployeeDetailDrawer
          employee={detailEmp}
          onClose={() => setDetailId(null)}
          onEdit={openEdit}
          onToggle={handleToggle}
        />
      )}

      {createModal.open && (
        <EmployeeFormModal
          mode="create"
          form={createModal.form}
          saving={createModal.saving}
          onChange={(k, v) => setCreateModal(prev => ({ ...prev, form: { ...prev.form, [k]: v } }))}
          onSave={handleCreate}
          onClose={() => setCreateModal(v => ({ ...v, open: false }))}
        />
      )}

      {editModal.open && (
        <EmployeeFormModal
          mode="edit"
          form={editModal.form}
          saving={editModal.saving}
          onChange={(k, v) => setEditModal(prev => ({ ...prev, form: { ...prev.form, [k]: v } }))}
          onSave={handleEdit}
          onClose={() => setEditModal(v => ({ ...v, open: false }))}
        />
      )}

      {confirm.open && (
        <ConfirmModal
          message={confirm.message}
          onCancel={() => setConfirm(v => ({ ...v, open: false }))}
          onConfirm={confirm.onConfirm}
          running={confirm.running}
        />
      )}
    </div>
  );
};

export default Employees;
