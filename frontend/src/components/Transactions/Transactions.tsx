import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileExport, faBars, faChevronDown, faChevronUp,
  faInbox, faCalendarAlt, faSpinner, faReceipt,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/api';
import { extractArray } from '../../utils/extractArray';

/* ── Types ── */
interface Payment {
  id: number;
  invoiceCode?: string;
  orderId: number;
  method: 'cash' | 'bank_transfer' | 'payos_qr';
  amount: number;
  receivedAmount: number;
  changeAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refund_pending' | 'refunded';
  paidAt: string;
  order?: {
    id: number;
    tableId: number;
  };
}

interface PaginatedPayments {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ── Helpers ── */
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n) + '₫';

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  payos_qr: 'QR PayOS',
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Đã thanh toán', cls: 'bg-green-100 text-green-700' },
  pending: { label: 'Chờ TT', cls: 'bg-yellow-100 text-yellow-700' },
  failed: { label: 'Thất bại', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Đã hủy', cls: 'bg-gray-100 text-gray-500' },
  refund_pending: { label: 'Chờ hoàn tiền', cls: 'bg-orange-100 text-orange-700' },
  refunded: { label: 'Đã hoàn tiền', cls: 'bg-purple-100 text-purple-700' },
};

/* ── Preset date helpers ── */
const getTodayRange = () => {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { from, to: from };
};

const getDateRange = (preset: string): { from: string; to: string } => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case 'today': return getTodayRange();
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const s = fmt(y); return { from: s, to: s };
    }
    case '7days': {
      const s = new Date(now); s.setDate(s.getDate() - 6);
      return { from: fmt(s), to: fmt(now) };
    }
    case 'month': {
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
    }
    default: return { from: '', to: '' };
  }
};

/* ══════════════════════════════════════════════════════════════ */
const Transactions: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchInvoice, setSearchInvoice] = useState('');
  const [preset, setPreset] = useState<string>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [timeType, setTimeType] = useState<'preset' | 'custom'>('preset');
  const [checkedMethods, setCheckedMethods] = useState<string[]>([]);
  const [checkedStatuses, setCheckedStatuses] = useState<string[]>(['paid']);
  const [limit, setLimit] = useState(20);

  // UI toggles
  const [showMethod, setShowMethod] = useState(true);
  const [showStatus, setShowStatus] = useState(true);

  const fetchPayments = useCallback(async (currentPage = 1) => {
    try {
      setLoading(true);
      const range = timeType === 'preset' ? getDateRange(preset) : { from: customFrom, to: customTo };

      const params: Record<string, any> = {
        page: currentPage,
        limit,
      };
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      if (searchInvoice.trim()) params.search = searchInvoice.trim();
      if (checkedMethods.length === 1) params.method = checkedMethods[0];
      if (checkedStatuses.length === 1) params.status = checkedStatuses[0];

      const { data } = await api.get<PaginatedPayments>('/payments', { params });
      const result: PaginatedPayments = data;
      setPayments(extractArray<Payment>(result as any) || result.data || []);
      setTotal(result.total ?? 0);
      setPage(result.page ?? 1);
      setTotalPages(result.totalPages ?? 1);
    } catch (err) {
      console.error('fetchPayments error:', err);
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo, timeType, searchInvoice, checkedMethods, checkedStatuses, limit]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const range = timeType === 'preset' ? getDateRange(preset) : { from: customFrom, to: customTo };
      const params: Record<string, any> = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      if (searchInvoice.trim()) params.search = searchInvoice.trim();

      const response = await api.get('/payments/export/excel', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `giao-dich-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const toggleArr = (arr: string[], val: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const CollapseSection: React.FC<{ title: string; open: boolean; toggle: () => void; children: React.ReactNode }> = ({ title, open, toggle, children }) => (
    <div className="border-b border-gray-200 py-3">
      <div className="flex items-center justify-between cursor-pointer mb-2" onClick={toggle}>
        <span className="text-[13px] font-semibold text-gray-700 uppercase tracking-tight">{title}</span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-[10px] text-gray-400" />
      </div>
      {open && children}
    </div>
  );

  const totalRevenue = payments
    .filter(p => p.paymentStatus === 'paid')
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="flex min-h-screen bg-gray-50 font-['Segoe_UI',sans-serif]">
      {/* ── Sidebar ── */}
      <aside className="w-[270px] bg-white border-r border-gray-200 p-4 shrink-0 h-screen overflow-y-auto">
        {/* Tìm kiếm */}
        <div className="mb-4">
          <div className="text-[13px] font-semibold text-gray-700 mb-2 uppercase">Tìm kiếm</div>
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 mb-2"
            placeholder="Mã hóa đơn..."
            value={searchInvoice}
            onChange={e => setSearchInvoice(e.target.value)}
          />
        </div>

        {/* Thời gian */}
        <div className="border-b border-gray-200 py-3">
          <div className="text-[13px] font-semibold text-gray-700 mb-2 uppercase">Thời gian</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="time" className="accent-blue-600" checked={timeType === 'preset'} onChange={() => setTimeType('preset')} />
              <select
                className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1 text-[13px] text-gray-700 outline-none cursor-pointer"
                value={preset}
                onChange={e => { setPreset(e.target.value); setTimeType('preset'); }}
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7days">7 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="">Toàn thời gian</option>
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="time" className="accent-blue-600" checked={timeType === 'custom'} onChange={() => setTimeType('custom')} />
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="date"
                  className="border border-gray-300 rounded-md px-2 py-1 text-[12px] outline-none"
                  value={customFrom}
                  onChange={e => { setCustomFrom(e.target.value); setTimeType('custom'); }}
                />
                <input
                  type="date"
                  className="border border-gray-300 rounded-md px-2 py-1 text-[12px] outline-none"
                  value={customTo}
                  onChange={e => { setCustomTo(e.target.value); setTimeType('custom'); }}
                />
              </div>
            </label>
          </div>
        </div>

        {/* Phương thức */}
        <CollapseSection title="Phương thức" open={showMethod} toggle={() => setShowMethod(!showMethod)}>
          <div className="space-y-2">
            {Object.entries(METHOD_LABEL).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={checkedMethods.includes(k)} onChange={() => toggleArr(checkedMethods, k, setCheckedMethods)} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </CollapseSection>

        {/* Trạng thái */}
        <CollapseSection title="Trạng thái" open={showStatus} toggle={() => setShowStatus(!showStatus)}>
          <div className="space-y-2">
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={checkedStatuses.includes(k)} onChange={() => toggleArr(checkedStatuses, k, setCheckedStatuses)} />
                <span>{v.label}</span>
              </label>
            ))}
          </div>
        </CollapseSection>

        {/* Số bản ghi */}
        <div className="py-3 flex items-center gap-2 text-[13px] text-gray-600">
          <span>Số bản ghi:</span>
          <select className="border border-gray-300 rounded px-2 py-0.5 outline-none" value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-800">Giao dịch</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              {loading ? 'Đang tải...' : `${total.toLocaleString('vi-VN')} giao dịch • Tổng: ${fmtMoney(totalRevenue)}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 border border-green-600 text-green-700 px-4 py-2 rounded-md hover:bg-green-50 text-[13.5px] transition-colors disabled:opacity-50"
            >
              {exporting
                ? <FontAwesomeIcon icon={faSpinner} spin />
                : <FontAwesomeIcon icon={faFileExport} />}
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex bg-gray-50 border-b border-gray-200 text-[12px] font-bold text-gray-500 uppercase tracking-wide">
            <div className="w-[150px] p-3">Mã hóa đơn</div>
            <div className="w-[170px] p-3">Thời gian</div>
            <div className="w-[70px] p-3 text-center">Bàn</div>
            <div className="w-[130px] p-3">Phương thức</div>
            <div className="w-[130px] p-3">Trạng thái</div>
            <div className="flex-1 p-3 text-right">Tổng tiền</div>
            <div className="flex-1 p-3 text-right">Khách trả</div>
            <div className="flex-1 p-3 text-right">Tiền thừa</div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
              <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#3dba74]" />
              <span className="text-[14px]">Đang tải dữ liệu...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FontAwesomeIcon icon={faInbox} className="text-gray-200 text-[56px] mb-4" />
              <p className="text-gray-400 text-[14px] font-medium">Không tìm thấy giao dịch nào</p>
              <p className="text-gray-300 text-[12.5px] mt-1">Thử thay đổi bộ lọc hoặc khoảng thời gian</p>
            </div>
          ) : (
            <>
              {payments.map(p => {
                const statusInfo = STATUS_LABEL[p.paymentStatus] ?? { label: p.paymentStatus, cls: 'bg-gray-100 text-gray-500' };
                return (
                  <div key={p.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors text-[13px]">
                    <div className="w-[150px] p-3 font-semibold text-blue-600 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faReceipt} className="text-[11px] text-gray-300" />
                      {p.invoiceCode ?? `#${p.orderId}`}
                    </div>
                    <div className="w-[170px] p-3 text-gray-500">{fmtDateTime(p.paidAt)}</div>
                    <div className="w-[70px] p-3 text-center text-gray-600">{p.order?.tableId ?? '—'}</div>
                    <div className="w-[130px] p-3 text-gray-600">{METHOD_LABEL[p.method] ?? p.method}</div>
                    <div className="w-[130px] p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11.5px] font-semibold ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex-1 p-3 text-right font-semibold text-gray-800">{fmtMoney(Number(p.amount))}</div>
                    <div className="flex-1 p-3 text-right text-gray-600">{fmtMoney(Number(p.receivedAmount))}</div>
                    <div className="flex-1 p-3 text-right text-gray-500">{fmtMoney(Number(p.changeAmount))}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-[13px] text-gray-400">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => fetchPayments(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                ← Trước
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p2 = Math.max(1, page - 2) + i;
                if (p2 > totalPages) return null;
                return (
                  <button
                    key={p2}
                    onClick={() => fetchPayments(p2)}
                    className={`w-9 h-9 rounded-lg text-[13px] font-medium transition-colors ${p2 === page ? 'bg-[#3dba74] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p2}
                  </button>
                );
              })}
              <button
                onClick={() => fetchPayments(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Transactions;
