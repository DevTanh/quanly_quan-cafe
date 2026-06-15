// src/components/customers/Customers.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faSearch, faPlus, faEdit, faTimes,
  faStar, faSpinner, faToggleOn, faToggleOff,
  faSyncAlt, faChevronLeft, faChevronRight, faPhone,
  faEnvelope, faGift,
} from '@fortawesome/free-solid-svg-icons';
import {
  customersApi,
  type Customer,
  type CreateCustomerDto,
  type UpdateCustomerDto,
} from '../../api/customers.api';
import { useToast } from '../../context/ToastContext';

/* ─── Helpers ─── */
const fmt = (n: number) => n.toLocaleString('vi-VN');

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const EMPTY_CREATE: CreateCustomerDto = { fullName: '', phone: '', email: '', note: '' };

/* ─── Modal props ─── */
interface CustomerModalProps {
  mode: 'create' | 'edit';
  initial?: Customer | null;
  saving: boolean;
  onClose: () => void;
  onSave: (dto: CreateCustomerDto | UpdateCustomerDto) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ mode, initial, saving, onClose, onSave }) => {
  const [form, setForm] = useState<CreateCustomerDto>({
    fullName: initial?.fullName ?? '',
    phone:    initial?.phone ?? '',
    email:    initial?.email ?? '',
    note:     initial?.note ?? '',
  });
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => firstRef.current?.focus(), 80);
  }, []);

  const set = (k: keyof CreateCustomerDto, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.fullName.trim().length >= 2 && /^\d{9,11}$/.test(form.phone.trim());

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-[440px] font-['Segoe_UI',sans-serif] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-bold text-gray-900 m-0">
            {mode === 'create' ? 'Thêm khách hàng mới' : 'Sửa thông tin khách hàng'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            <FontAwesomeIcon icon={faTimes} className="text-xs" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstRef}
              value={form.fullName}
              onChange={e => set('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#16a34a] transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="0912345678"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-[14px] outline-none focus:border-[#16a34a] transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <div className="relative">
              <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="example@email.com"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-[14px] outline-none focus:border-[#16a34a] transition-colors"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Ghi chú
            </label>
            <textarea
              value={form.note}
              onChange={e => set('note', e.target.value)}
              rows={2}
              placeholder="Khách thân thiết, dị ứng lactose..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#16a34a] transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 h-[42px] border border-gray-200 rounded-xl text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!valid || saving}
            className="flex-[1.5] h-[42px] bg-[#16a34a] text-white rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-2 hover:bg-[#15803d] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : mode === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Points Modal ─── */
interface PointsModalProps {
  customer: Customer;
  saving: boolean;
  onClose: () => void;
  onSave: (delta: number, reason: string) => void;
}
const PointsModal: React.FC<PointsModalProps> = ({ customer, saving, onClose, onSave }) => {
  const [delta, setDelta]   = useState(0);
  const [reason, setReason] = useState('');
  const valid = delta !== 0 && reason.trim().length >= 3;
  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-[380px] font-['Segoe_UI',sans-serif] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-bold text-gray-900 m-0 flex items-center gap-2">
            <FontAwesomeIcon icon={faGift} className="text-[#f59e0b]" />
            Điều chỉnh điểm — {customer.fullName}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <FontAwesomeIcon icon={faTimes} className="text-xs" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <FontAwesomeIcon icon={faStar} className="text-amber-500" />
            <div>
              <p className="text-[13px] font-semibold text-amber-700 m-0">Điểm hiện tại</p>
              <p className="text-[18px] font-bold text-amber-600 m-0">{fmt(customer.points)} điểm</p>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Số điểm thay đổi (âm để trừ)
            </label>
            <input
              type="number"
              value={delta || ''}
              onChange={e => setDelta(Number(e.target.value))}
              placeholder="+100 hoặc -50"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#16a34a] transition-colors"
            />
            {delta !== 0 && (
              <p className="text-[12px] mt-1 text-gray-500">
                Sau điều chỉnh: <strong className="text-gray-800">{fmt(customer.points + delta)} điểm</strong>
              </p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Lý do <span className="text-red-500">*</span>
            </label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Tặng thưởng sinh nhật, Đổi quà..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#16a34a] transition-colors"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 h-[42px] border border-gray-200 rounded-xl text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Hủy
          </button>
          <button
            onClick={() => onSave(delta, reason)}
            disabled={!valid || saving}
            className="flex-[1.5] h-[42px] bg-amber-500 text-white rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Cập nhật điểm'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════ */
/* Main page                                                        */
/* ════════════════════════════════════════════════════════════════ */
const Customers: React.FC = () => {
  const toast = useToast();

  /* ── Data ── */
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 15;

  /* ── UI ── */
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterActive, setFilterActive]       = useState<'all' | 'active' | 'inactive'>('all');

  /* ── Modals ── */
  const [createModal, setCreateModal]         = useState(false);
  const [editTarget, setEditTarget]           = useState<Customer | null>(null);
  const [pointsTarget, setPointsTarget]       = useState<Customer | null>(null);
  const [saving, setSaving]                   = useState(false);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 380);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Fetch ── */
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterActive === 'active')   params.isActive = true;
      if (filterActive === 'inactive') params.isActive = false;
      const res = await customersApi.findAll(params);
      setCustomers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages ?? Math.ceil(res.total / LIMIT));
    } catch {
      toast.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterActive, toast]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  /* ── CRUD handlers ── */
  const handleCreate = async (dto: CreateCustomerDto) => {
    setSaving(true);
    try {
      await customersApi.create(dto);
      toast.success('Đã thêm khách hàng mới');
      setCreateModal(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Thêm khách hàng thất bại');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (dto: UpdateCustomerDto) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await customersApi.update(editTarget.id, dto);
      toast.success('Đã cập nhật thông tin');
      setEditTarget(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật thất bại');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (c: Customer) => {
    try {
      if (c.isActive) {
        await customersApi.disable(c.id);
        toast.success(`Đã vô hiệu hóa "${c.fullName}"`);
      } else {
        await customersApi.enable(c.id);
        toast.success(`Đã kích hoạt "${c.fullName}"`);
      }
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Thao tác thất bại');
    }
  };

  const handleUpdatePoints = async (delta: number, reason: string) => {
    if (!pointsTarget) return;
    setSaving(true);
    try {
      await customersApi.updatePoints(pointsTarget.id, delta, reason);
      toast.success(`Đã điều chỉnh ${delta > 0 ? '+' : ''}${delta} điểm cho "${pointsTarget.fullName}"`);
      setPointsTarget(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Điều chỉnh điểm thất bại');
    } finally { setSaving(false); }
  };

  /* ── Render ── */
  return (
    <div className="p-5 font-['Segoe_UI',sans-serif] bg-[#f3f4f6] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-800 flex items-center gap-2 m-0">
            <FontAwesomeIcon icon={faUsers} className="text-[#3dba74]" />
            Quản lý khách hàng
          </h1>
          <p className="text-[12.5px] text-gray-400 mt-0.5 m-0">
            {loading ? 'Đang tải...' : `Tổng ${fmt(total)} khách hàng`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#16a34a] text-white rounded-lg text-[13px] font-semibold hover:bg-[#15803d] transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} />
            Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, SĐT, email..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-[13.5px] outline-none focus:border-[#3dba74] transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setFilterActive(v); setPage(1); }}
              className={[
                'px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors',
                filterActive === v
                  ? 'bg-[#16a34a] border-[#16a34a] text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              {{ all: 'Tất cả', active: 'Đang hoạt động', inactive: 'Đã vô hiệu' }[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['Khách hàng', 'Số điện thoại', 'Email', 'Điểm tích lũy', 'Ngày tham gia', 'Trạng thái', 'Hành động'].map(h => (
                <th key={h} className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#3dba74]" />
                  <p className="text-[13px] text-gray-400 mt-2">Đang tải...</p>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                  <FontAwesomeIcon icon={faUsers} className="text-[40px] text-gray-200 mb-3 block mx-auto" />
                  Không có khách hàng nào
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  {/* Name + avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center text-white font-bold text-[14px] shrink-0">
                        {c.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 m-0">{c.fullName}</p>
                        {c.note && (
                          <p className="text-[11.5px] text-gray-400 m-0 truncate max-w-[160px]">{c.note}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Phone */}
                  <td className="px-4 py-3 text-gray-700">{c.phone}</td>
                  {/* Email */}
                  <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                  {/* Points */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faStar} className="text-amber-400 text-xs" />
                      <span className="font-semibold text-amber-700">{fmt(c.points)}</span>
                    </div>
                  </td>
                  {/* Date */}
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className="flex items-center gap-1.5 text-[13px]"
                      title={c.isActive ? 'Click để vô hiệu hóa' : 'Click để kích hoạt'}
                    >
                      <FontAwesomeIcon
                        icon={c.isActive ? faToggleOn : faToggleOff}
                        className={c.isActive ? 'text-[#16a34a] text-xl' : 'text-gray-400 text-xl'}
                      />
                      <span className={c.isActive ? 'text-[#16a34a]' : 'text-gray-400'}>
                        {c.isActive ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </button>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPointsTarget(c)}
                        title="Điều chỉnh điểm"
                        className="w-8 h-8 rounded-lg border border-amber-200 text-amber-500 flex items-center justify-center hover:bg-amber-50 transition-colors text-xs"
                      >
                        <FontAwesomeIcon icon={faGift} />
                      </button>
                      <button
                        onClick={() => setEditTarget(c)}
                        title="Sửa thông tin"
                        className="w-8 h-8 rounded-lg border border-blue-200 text-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors text-xs"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12.5px] text-gray-500">
            Hiển thị {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} / {fmt(total)}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={[
                    'w-8 h-8 rounded-lg border text-[13px] font-medium transition-colors',
                    p === page
                      ? 'bg-[#16a34a] border-[#16a34a] text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {createModal && (
        <CustomerModal mode="create" saving={saving} onClose={() => setCreateModal(false)} onSave={dto => handleCreate(dto as CreateCustomerDto)} />
      )}
      {editTarget && (
        <CustomerModal mode="edit" initial={editTarget} saving={saving} onClose={() => setEditTarget(null)} onSave={dto => handleUpdate(dto as UpdateCustomerDto)} />
      )}
      {pointsTarget && (
        <PointsModal customer={pointsTarget} saving={saving} onClose={() => setPointsTarget(null)} onSave={handleUpdatePoints} />
      )}
    </div>
  );
};

export default Customers;
