// src/components/employees/EmployeeList.tsx
// UI giữ nguyên từ bản gốc — chỉ đổi types để khớp với BE /users.
// Các field BE chưa có (departmentId, positionId, gender, birthDate, address, startDate)
// được giữ dưới dạng UI-only: hiển thị '—' ở chi tiết, không gửi lên BE.

import React, { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus, faPen, faSearch, faFilter,
  faToggleOn, faToggleOff, faXmark, faChevronDown,
  faUser, faPhone, faEnvelope, faUserTie,
  faKey, faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import type { UserRecord, CreateUserPayload, UpdateUserPayload, QueryUserParams } from '../../api/users.api'
import type { UserRole } from '../../types'
import {
  initials, avatarColor,
  ROLE_LABELS, ROLE_COLORS,
  INIT_CREATE_FORM, toUpdateForm,
} from '../../types/employeeTypes'

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000] animate-[fadeIn_0.15s_ease]"
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    {children}
  </div>
)

const labelCls = 'text-[12.5px] font-bold text-slate-600'
const inputCls = 'h-10 px-3 border border-gray-200 rounded-lg text-[13.5px] text-slate-900 bg-slate-50 outline-none transition-all font-[inherit] focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,163,74,0.12)]'
const selectCls = `${inputCls} appearance-none pr-8 cursor-pointer`

const BtnPrimary: React.FC<{ onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string }> = ({ onClick, disabled, children, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 h-9 px-4 border-none bg-green-600 rounded-lg text-[13px] font-bold text-white cursor-pointer hover:bg-green-700 hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(22,163,74,0.35)] transition-all font-[inherit] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${className}`}
  >
    {children}
  </button>
)

const BtnOutline: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit] whitespace-nowrap ${className}`}
  >
    {children}
  </button>
)

const ModalHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <div className="flex items-center justify-between px-5 py-[18px] pb-4 border-b border-slate-100 flex-shrink-0">
    <h3 className="text-base font-black text-slate-900 m-0 tracking-tight">{title}</h3>
    <button className="w-8 h-8 bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all" onClick={onClose}>
      <FontAwesomeIcon icon={faXmark} />
    </button>
  </div>
)

const ModalFooter: React.FC<{ onCancel: () => void; onSave: () => void; saveLabel: string; saving?: boolean }> = ({ onCancel, onSave, saveLabel, saving }) => (
  <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 flex-shrink-0">
    <BtnOutline onClick={onCancel}>Huỷ</BtnOutline>
    <BtnPrimary onClick={onSave} disabled={saving}>
      {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : saveLabel}
    </BtnPrimary>
  </div>
)

// ─── Role badge ───────────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const c = ROLE_COLORS[role]
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold border" style={{ background: c.bg, color: c.text, borderColor: c.bg }}>
      {ROLE_LABELS[role]}
    </span>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  employees: UserRecord[]
  loading: boolean
  error: string | null
  onSearch: (params: QueryUserParams) => void
  onCreate: (p: CreateUserPayload) => Promise<UserRecord>
  onUpdate: (id: number, p: UpdateUserPayload) => Promise<UserRecord>
  onToggleActive: (emp: UserRecord) => Promise<void>
  onRetry: () => void
}

// ─── Create form state ───────────────────────────────────────────────────────

type CreateForm = {
  fullName: string; email: string; phone: string
  password: string; role: UserRole; isActive: boolean
}

type EditForm = {
  fullName: string; email: string; phone: string
  role: UserRole; isActive: boolean; password: string
}

// ─── Component ───────────────────────────────────────────────────────────────

const EmployeeList: React.FC<Props> = ({
  employees, loading, error,
  onSearch, onCreate, onUpdate, onToggleActive, onRetry,
}) => {

  // ── Filter state (client-side + server-side) ──
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | ''>('')
  const [filterStatus, setFilterStatus] = useState<'true' | 'false' | ''>('')
  const [showFilter, setShowFilter] = useState(false)

  // ── Modals ──
  const [createModal, setCreateModal] = useState<{ open: boolean; form: CreateForm; saving: boolean }>({
    open: false, saving: false,
    form: { ...INIT_CREATE_FORM, password: '' } as CreateForm,
  })
  const [editModal, setEditModal] = useState<{ open: boolean; id: number | null; form: EditForm; saving: boolean }>({
    open: false, id: null, saving: false,
    form: { fullName: '', email: '', phone: '', role: 'staff', isActive: true, password: '' },
  })
  const [detailId, setDetailId] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<{ open: boolean; message: string; onConfirm: () => Promise<void>; running: boolean }>({
    open: false, message: '', onConfirm: async () => { }, running: false,
  })
  const [apiError, setApiError] = useState<string | null>(null)

  // ── Derived ──
  const filtered = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase()
      if (q && !e.fullName.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q) && !(e.phone ?? '').includes(q)) return false
      if (filterRole && e.role !== filterRole) return false
      if (filterStatus !== '' && String(e.isActive) !== filterStatus) return false
      return true
    })
  }, [employees, search, filterRole, filterStatus])

  const activeFilters = [filterRole, filterStatus].filter(Boolean).length
  const detailEmp = employees.find(e => e.id === detailId)

  // ── Handlers ──
  const handleSearch = () => {
    onSearch({
      search: search || undefined,
      role: filterRole || undefined,
      isActive: filterStatus !== '' ? filterStatus === 'true' : undefined,
    })
  }

  const handleCreateSave = async () => {
    const f = createModal.form
    if (!f.fullName.trim() || !f.email.trim() || !f.password.trim()) return
    setCreateModal(v => ({ ...v, saving: true }))
    setApiError(null)
    try {
      await onCreate({ fullName: f.fullName, email: f.email, phone: f.phone || undefined, password: f.password, role: f.role, isActive: f.isActive })
      setCreateModal(v => ({ ...v, open: false, saving: false }))
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setApiError(Array.isArray(msg) ? msg[0] : msg ?? 'Tạo thất bại')
      setCreateModal(v => ({ ...v, saving: false }))
    }
  }

  const openEdit = (emp: UserRecord) => {
    const f = toUpdateForm(emp)
    setEditModal({
      open: true, id: emp.id, saving: false,
      form: { fullName: f.fullName ?? '', email: f.email ?? '', phone: f.phone ?? '', role: f.role ?? 'staff', isActive: f.isActive ?? true, password: '' },
    })
    setDetailId(null)
  }

  const handleEditSave = async () => {
    if (!editModal.id) return
    const f = editModal.form
    if (!f.fullName.trim() || !f.email.trim()) return
    setEditModal(v => ({ ...v, saving: true }))
    setApiError(null)
    try {
      const payload: UpdateUserPayload = { fullName: f.fullName, email: f.email, phone: f.phone || undefined, role: f.role, isActive: f.isActive }
      if (f.password.trim()) payload.password = f.password
      await onUpdate(editModal.id, payload)
      setEditModal(v => ({ ...v, open: false, saving: false }))
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setApiError(Array.isArray(msg) ? msg[0] : msg ?? 'Cập nhật thất bại')
      setEditModal(v => ({ ...v, saving: false }))
    }
  }

  const handleToggle = (emp: UserRecord) => {
    setConfirm({
      open: true, running: false,
      message: emp.isActive
        ? `Khóa tài khoản của "${emp.fullName}"? Nhân viên sẽ không thể đăng nhập.`
        : `Mở lại tài khoản "${emp.fullName}"?`,
      onConfirm: async () => {
        setConfirm(v => ({ ...v, running: true }))
        try {
          await onToggleActive(emp)
          setDetailId(null)
        } finally {
          setConfirm(v => ({ ...v, open: false, running: false }))
        }
      },
    })
  }

  const setCreate = (k: keyof CreateForm, v: string | boolean) =>
    setCreateModal(prev => ({ ...prev, form: { ...prev.form, [k]: v } }))

  const setEdit = (k: keyof EditForm, v: string | boolean) =>
    setEditModal(prev => ({ ...prev, form: { ...prev.form, [k]: v } }))

  // ─── Loading / Error states ───────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-96px)] gap-4 text-slate-400">
      <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-green-500" />
      <p className="text-sm">Đang tải danh sách nhân viên...</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-96px)] gap-4">
      <p className="text-sm text-red-500">{error}</p>
      <BtnOutline onClick={onRetry}>Thử lại</BtnOutline>
    </div>
  )

  // ─── Main render ──────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-slate-50 overflow-hidden font-[Segoe_UI,sans-serif]">

      {/* API error toast */}
      {apiError && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600 flex items-center justify-between flex-shrink-0">
          <span>{apiError}</span>
          <button className="ml-3 text-red-400 hover:text-red-600" onClick={() => setApiError(null)}><FontAwesomeIcon icon={faXmark} /></button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200 flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex items-center h-9 border border-gray-200 rounded-lg bg-slate-50 overflow-hidden transition-all focus-within:border-green-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]">
            <FontAwesomeIcon icon={faSearch} className="px-2.5 text-gray-400 text-xs flex-shrink-0 pointer-events-none" />
            <input
              className="h-full px-0 border-none bg-transparent text-[13px] text-slate-900 outline-none w-60 font-[inherit] placeholder:text-gray-400"
              placeholder="Tên, email, số điện thoại..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            {search && (
              <button className="px-2.5 border-none bg-transparent text-gray-400 cursor-pointer text-xs flex items-center hover:text-red-500 transition-colors" onClick={() => { setSearch(''); onSearch({}) }}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>

          {/* Filter btn */}
          <button
            className={`flex items-center gap-1.5 h-9 px-3.5 border rounded-lg text-[13px] font-semibold cursor-pointer transition-all font-[inherit] ${showFilter ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-slate-600 bg-white hover:border-green-500 hover:text-green-600 hover:bg-green-50'}`}
            onClick={() => setShowFilter(!showFilter)}
          >
            <FontAwesomeIcon icon={faFilter} />
            Bộ lọc
            {activeFilters > 0 && (
              <span className="bg-green-600 text-white text-[10px] font-bold rounded-xl px-1.5 py-px min-w-[18px] text-center">{activeFilters}</span>
            )}
          </button>

          <BtnOutline onClick={handleSearch}>Tìm kiếm</BtnOutline>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] text-slate-500 whitespace-nowrap">
            Tổng <strong className="text-slate-900">{filtered.length}</strong> nhân viên
          </span>
          <BtnPrimary onClick={() => setCreateModal(v => ({ ...v, open: true, form: { ...INIT_CREATE_FORM, password: '' } as CreateForm }))}>
            <FontAwesomeIcon icon={faPlus} /> Thêm nhân viên
          </BtnPrimary>
        </div>
      </div>

      {/* ── Filter bar ── */}
      {showFilter && (
        <div className="flex items-end gap-3 px-6 py-3 bg-slate-50/80 border-b border-gray-200 flex-shrink-0 flex-wrap">
          {/* Role filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.4px]">Vai trò</label>
            <div className="relative">
              <select className={`${selectCls} min-w-[148px] h-[34px] pl-2.5`} value={filterRole} onChange={e => setFilterRole(e.target.value as UserRole | '')}>
                <option value="">Tất cả</option>
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Status filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.4px]">Trạng thái</label>
            <div className="relative">
              <select className={`${selectCls} min-w-[148px] h-[34px] pl-2.5`} value={filterStatus} onChange={e => setFilterStatus(e.target.value as 'true' | 'false' | '')}>
                <option value="">Tất cả</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã khóa</option>
              </select>
              <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
            </div>
          </div>

          {activeFilters > 0 && (
            <button
              className="h-[34px] px-3.5 border border-red-200 bg-red-50 rounded-lg text-[13px] font-semibold text-red-600 cursor-pointer hover:bg-red-200 transition-all font-[inherit] self-end"
              onClick={() => { setFilterRole(''); setFilterStatus(''); onSearch({ search: search || undefined }) }}
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.05)]">

          {/* Head */}
          <div className="grid [grid-template-columns:2.5fr_1.4fr_1.6fr_1.2fr_1.3fr_100px] items-center bg-slate-50 border-b-[1.5px] border-gray-200 sticky top-0 z-[1]">
            {['Nhân viên', 'Số điện thoại', 'Email', 'Vai trò', 'Trạng thái', 'Thao tác'].map(h => (
              <div key={h} className="px-3.5 py-2.5 text-[11px] text-gray-400 font-bold uppercase tracking-[0.4px]">{h}</div>
            ))}
          </div>

          {/* Body */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <FontAwesomeIcon icon={faUser} className="text-[44px] text-gray-200" />
              <p className="text-sm text-gray-400 m-0">Không tìm thấy nhân viên nào</p>
            </div>
          ) : filtered.map((e, i) => (
            <div
              key={e.id}
              className={`grid [grid-template-columns:2.5fr_1.4fr_1.6fr_1.2fr_1.3fr_100px] items-center border-b border-slate-50 cursor-pointer transition-colors last:border-b-0 ${i % 2 === 1 ? 'bg-slate-50/60' : ''} ${!e.isActive ? 'opacity-50' : ''} hover:bg-slate-50`}
              onClick={() => setDetailId(e.id)}
            >
              {/* Avatar + tên */}
              <div className="px-3.5 py-2.5 flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                  style={{ background: avatarColor(e.id) }}
                >
                  {initials(e.fullName)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-900 text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{e.fullName}</span>
                  <span className="text-[11px] text-gray-400 mt-px">#{e.id}</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 text-[13.5px] text-slate-600">{e.phone || '—'}</div>
              <div className="px-3.5 py-2.5 text-[13px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">{e.email}</div>
              <div className="px-3.5 py-2.5"><RoleBadge role={e.role} /></div>
              <div className="px-3.5 py-2.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold border ${e.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-gray-400 border-gray-200'}`}>
                  {e.isActive ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </div>

              {/* Actions */}
              <div className="px-3.5 py-2.5 flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                <button
                  className="w-[30px] h-[30px] border-none rounded-lg cursor-pointer text-xs flex items-center justify-center bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                  title="Chỉnh sửa" onClick={() => openEdit(e)}
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button
                  className="w-[30px] h-[30px] border-none rounded-lg cursor-pointer text-[15px] flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
                  title={e.isActive ? 'Khóa tài khoản' : 'Mở tài khoản'}
                  onClick={() => handleToggle(e)}
                >
                  <FontAwesomeIcon icon={e.isActive ? faToggleOn : faToggleOff} className={e.isActive ? 'text-green-500' : 'text-gray-300'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {detailEmp && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-[900] flex justify-end animate-[fadeIn_0.15s_ease]"
          onClick={() => setDetailId(null)}
        >
          <div
            className="w-[340px] h-full bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)] flex flex-col animate-[slideIn_0.22s_cubic-bezier(0.34,1.1,0.64,1)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3.5 p-5 pb-[18px] border-b border-slate-100">
              <div
                className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[18px] font-black text-white flex-shrink-0"
                style={{ background: avatarColor(detailEmp.id) }}
              >
                {initials(detailEmp.fullName)}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <h3 className="text-base font-black text-slate-900 m-0">{detailEmp.fullName}</h3>
                <RoleBadge role={detailEmp.role} />
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold border self-start ${detailEmp.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-gray-400 border-gray-200'}`}>
                  {detailEmp.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                </span>
              </div>
              <button
                className="w-[30px] h-[30px] bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center flex-shrink-0 hover:bg-red-100 hover:text-red-500 transition-all"
                onClick={() => setDetailId(null)}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.5px] m-0">Thông tin liên hệ</p>
                <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
                  <FontAwesomeIcon icon={faPhone} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
                  <span>{detailEmp.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
                  <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
                  <span className="break-all">{detailEmp.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.5px] m-0">Thông tin tài khoản</p>
                <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
                  <FontAwesomeIcon icon={faUserTie} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
                  <span>{ROLE_LABELS[detailEmp.role]}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13.5px] text-slate-500">
                  <FontAwesomeIcon icon={faKey} className="text-gray-400 text-[13px] w-4 flex-shrink-0" />
                  <span>Lần đăng nhập cuối: {detailEmp.lastLoginAt ? new Date(detailEmp.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</span>
                </div>
                <div className="text-[12px] text-gray-400">
                  Tạo ngày: {new Date(detailEmp.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t border-slate-100">
              <BtnOutline className="flex-1 justify-center" onClick={() => handleToggle(detailEmp)}>
                <FontAwesomeIcon icon={detailEmp.isActive ? faToggleOn : faToggleOff} />
                {detailEmp.isActive ? 'Khóa tài khoản' : 'Mở tài khoản'}
              </BtnOutline>
              <BtnPrimary className="flex-1 justify-center" onClick={() => openEdit(detailEmp)}>
                <FontAwesomeIcon icon={faPen} /> Cập nhật
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {createModal.open && (
        <Overlay onClose={() => setCreateModal(v => ({ ...v, open: false }))}>
          <div className="bg-white rounded-[18px] w-[520px] max-w-[96vw] max-h-[90vh] flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.18)]">
            <ModalHeader title="Thêm nhân viên" onClose={() => setCreateModal(v => ({ ...v, open: false }))} />
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-3.5">

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Họ và tên <span className="text-red-500">*</span></label>
                    <input className={inputCls} placeholder="Nguyễn Văn A" value={createModal.form.fullName} onChange={e => setCreate('fullName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Số điện thoại</label>
                    <input className={inputCls} placeholder="0900 000 000" value={createModal.form.phone} onChange={e => setCreate('phone', e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                  <input className={inputCls} type="email" placeholder="nhanvien@cafe.vn" value={createModal.form.email} onChange={e => setCreate('email', e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Mật khẩu <span className="text-red-500">*</span></label>
                  <input className={inputCls} type="password" placeholder="Tối thiểu 6 ký tự" value={createModal.form.password} onChange={e => setCreate('password', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Vai trò <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select className={`${selectCls} w-full`} value={createModal.form.role} onChange={e => setCreate('role', e.target.value)}>
                        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Trạng thái</label>
                    <button
                      className={`flex items-center gap-2 h-10 px-3 rounded-lg border cursor-pointer text-[13px] font-semibold transition-all font-[inherit] ${createModal.form.isActive ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-400 bg-slate-50'}`}
                      onClick={() => setCreate('isActive', !createModal.form.isActive as any)}
                    >
                      <FontAwesomeIcon icon={createModal.form.isActive ? faToggleOn : faToggleOff} />
                      {createModal.form.isActive ? 'Kích hoạt ngay' : 'Chưa kích hoạt'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <ModalFooter
              onCancel={() => setCreateModal(v => ({ ...v, open: false }))}
              onSave={handleCreateSave}
              saveLabel="Thêm nhân viên"
              saving={createModal.saving}
            />
          </div>
        </Overlay>
      )}

      {/* ── Edit modal ── */}
      {editModal.open && (
        <Overlay onClose={() => setEditModal(v => ({ ...v, open: false }))}>
          <div className="bg-white rounded-[18px] w-[520px] max-w-[96vw] max-h-[90vh] flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.18)]">
            <ModalHeader title="Cập nhật nhân viên" onClose={() => setEditModal(v => ({ ...v, open: false }))} />
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-3.5">

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Họ và tên <span className="text-red-500">*</span></label>
                    <input className={inputCls} placeholder="Nguyễn Văn A" value={editModal.form.fullName} onChange={e => setEdit('fullName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Số điện thoại</label>
                    <input className={inputCls} placeholder="0900 000 000" value={editModal.form.phone} onChange={e => setEdit('phone', e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                  <input className={inputCls} type="email" value={editModal.form.email} onChange={e => setEdit('email', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Vai trò</label>
                    <div className="relative">
                      <select className={`${selectCls} w-full`} value={editModal.form.role} onChange={e => setEdit('role', e.target.value)}>
                        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Trạng thái</label>
                    <button
                      className={`flex items-center gap-2 h-10 px-3 rounded-lg border cursor-pointer text-[13px] font-semibold transition-all font-[inherit] ${editModal.form.isActive ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-400 bg-slate-50'}`}
                      onClick={() => setEdit('isActive', !editModal.form.isActive as any)}
                    >
                      <FontAwesomeIcon icon={editModal.form.isActive ? faToggleOn : faToggleOff} />
                      {editModal.form.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Đổi mật khẩu <span className="text-[11px] font-normal text-gray-400">(để trống nếu không đổi)</span></label>
                  <input className={inputCls} type="password" placeholder="Mật khẩu mới..." value={editModal.form.password} onChange={e => setEdit('password', e.target.value)} />
                </div>
              </div>
            </div>
            <ModalFooter
              onCancel={() => setEditModal(v => ({ ...v, open: false }))}
              onSave={handleEditSave}
              saveLabel="Lưu thay đổi"
              saving={editModal.saving}
            />
          </div>
        </Overlay>
      )}

      {/* ── Confirm modal ── */}
      {confirm.open && (
        <Overlay onClose={() => !confirm.running && setConfirm(v => ({ ...v, open: false }))}>
          <div className="bg-white rounded-2xl p-7 w-[380px] max-w-[96vw] shadow-[0_32px_80px_rgba(0,0,0,0.18)] text-center">
            <p className="text-sm text-slate-600 leading-relaxed m-0 mb-5">{confirm.message}</p>
            <div className="flex justify-center gap-2.5">
              <BtnOutline onClick={() => setConfirm(v => ({ ...v, open: false }))}>Huỷ</BtnOutline>
              <button
                disabled={confirm.running}
                className="h-10 px-6 border-none bg-red-500 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-red-700 transition-colors font-[inherit] disabled:opacity-50"
                onClick={confirm.onConfirm}
              >
                {confirm.running ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Xác nhận'}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}

export default EmployeeList
