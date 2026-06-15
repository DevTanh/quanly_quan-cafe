// src/components/reports/Reports.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine, faBoxOpen, faTrophy, faCreditCard,
  faSpinner, faSyncAlt, faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

/* ── Helpers ── */
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + '₫';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ── Types ── */
interface DashboardData {
  revenue: number;
  paidOrders: number;
  averageOrderValue: number;
  paymentMethods: { method: string; amount: number; count: number }[];
  topProducts: { productId: number; productName: string; quantity: number; revenue: number }[];
  lowStockCount: number;
  lowStockProducts: { id: number; code: string; name: string; stock: number; minStock: number; category: string }[];
}

interface RevenueData {
  totalRevenue: number;
  totalOrders: number;
  daily: { date: string; revenue: number; orders: number }[];
}

interface ShiftData {
  hourly: { hour: number; revenue: number; orders: number }[];
  topProducts: { productId: number; productName: string; quantity: number; revenue: number }[];
}

type ActiveTab = 'overview' | 'revenue' | 'shift';

const PRESET_RANGES = [
  { label: 'Hôm nay', from: () => today(), to: () => today() },
  { label: 'Hôm qua', from: () => daysAgo(1), to: () => daysAgo(1) },
  { label: '7 ngày', from: () => daysAgo(6), to: () => today() },
  { label: 'Tháng này', from: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }, to: () => today() },
];

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  payos_qr: 'QR PayOS',
};

function MiniBarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="flex items-end gap-1 h-24 mt-2">
      {bars.map(bar => {
        const pct = Math.round((bar.value / max) * 100);
        return (
          <div key={bar.label} className="flex flex-col items-center gap-1 flex-1 min-w-0" title={`${bar.label}: ${fmt(bar.value)}`}>
            <div className="w-full flex flex-col justify-end" style={{ height: 70 }}>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(pct, pct > 0 ? 8 : 0)}%`,
                  background: pct > 0 ? '#16a34a' : '#f3f4f6',
                  transition: 'height 0.35s ease',
                  minHeight: pct > 0 ? 4 : 0,
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
const Reports: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [presetIdx, setPresetIdx] = useState(0);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [shiftData, setShiftData] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const getParams = useCallback(() => {
    if (useCustom) {
      return { from: customFrom, to: customTo };
    }
    const preset = PRESET_RANGES[presetIdx];
    return { from: preset.from(), to: preset.to() };
  }, [useCustom, customFrom, customTo, presetIdx]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = getParams();

      const [dashRes, revenueRes, shiftRes] = await Promise.allSettled([
        api.get<DashboardData>('/reports/dashboard', { params }),
        api.get<RevenueData>('/reports/revenue', { params }),
        api.get<ShiftData>('/reports/shift', { params }),
      ]);

      if (dashRes.status === 'fulfilled') setDashData(dashRes.value.data);
      if (revenueRes.status === 'fulfilled') setRevenueData(revenueRes.value.data);
      if (shiftRes.status === 'fulfilled') setShiftData(shiftRes.value.data);
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [getParams, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentLabel = useCustom
    ? `${customFrom} → ${customTo}`
    : PRESET_RANGES[presetIdx].label;

  const TABS = [
    { key: 'overview' as ActiveTab, label: 'Tổng quan', icon: faChartLine },
    { key: 'revenue' as ActiveTab, label: 'Doanh thu', icon: faCreditCard },
    { key: 'shift' as ActiveTab, label: 'Theo ca', icon: faCalendarAlt },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 font-['Segoe_UI',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-extrabold text-gray-800 m-0">Báo cáo</h1>
            <p className="text-[12.5px] text-gray-400 mt-0.5">
              {loading ? 'Đang tải...' : `Kỳ: ${currentLabel}`}
            </p>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            Làm mới
          </button>
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_RANGES.map((p, i) => (
            <button
              key={p.label}
              onClick={() => { setPresetIdx(i); setUseCustom(false); }}
              className={[
                'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border',
                !useCustom && presetIdx === i
                  ? 'bg-[#3dba74] text-white border-[#3dba74]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#3dba74] hover:text-[#3dba74]',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3dba74]"
            />
            <span className="text-gray-400 text-[13px]">→</span>
            <input
              type="date"
              value={customTo}
              onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3dba74]"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 -mb-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.key
                  ? 'border-[#16a34a] text-[#16a34a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-[12px]" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#3dba74]" />
          <span className="text-[14px]">Đang tải báo cáo...</span>
        </div>
      )}

      {/* ── TAB: OVERVIEW ── */}
      {!loading && activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* KPI Cards */}
          {isAdmin && (
            <>
              <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#3b82f6]">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Doanh thu</p>
                <p className="text-[26px] font-extrabold text-gray-800">{fmt(dashData?.revenue ?? 0)}</p>
                <p className="text-[12px] text-gray-400 mt-1">{dashData?.paidOrders ?? 0} đơn hoàn thành</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#16a34a]">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-1">TB / đơn</p>
                <p className="text-[26px] font-extrabold text-gray-800">{fmt(dashData?.averageOrderValue ?? 0)}</p>
                <p className="text-[12px] text-gray-400 mt-1">Giá trị trung bình mỗi hóa đơn</p>
              </div>
            </>
          )}

          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#f59e0b]">
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Sắp hết hàng</p>
            <p className="text-[26px] font-extrabold text-gray-800">{dashData?.lowStockCount ?? 0}</p>
            <p className="text-[12px] text-gray-400 mt-1">Sản phẩm cần nhập thêm</p>
          </div>

          {/* Payment methods */}
          {isAdmin && (dashData?.paymentMethods ?? []).length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm col-span-1">
              <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faCreditCard} className="text-[#3b82f6]" /> Phương thức TT
              </h3>
              {(dashData?.paymentMethods ?? []).map(pm => (
                <div key={pm.method} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-[13px] text-gray-700">{METHOD_LABELS[pm.method] ?? pm.method}</span>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-gray-800">{fmt(pm.amount)}</div>
                    <div className="text-[11px] text-gray-400">{pm.count} đơn</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top products */}
          {(dashData?.topProducts ?? []).length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm col-span-1 xl:col-span-2">
              <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-[#f59e0b]" /> Top sản phẩm
              </h3>
              {(dashData?.topProducts ?? []).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={[
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0',
                    i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600',
                  ].join(' ')}>{i + 1}</span>
                  <span className="flex-1 text-[13px] text-gray-700 truncate">{p.productName}</span>
                  <span className="text-[12px] text-gray-400 shrink-0">{p.quantity} phần</span>
                  {isAdmin && <span className="text-[13px] font-semibold text-[#16a34a] shrink-0">{fmt(p.revenue)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Low stock */}
          {(dashData?.lowStockProducts ?? []).length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#f59e0b]">
              <h3 className="text-[12px] font-bold text-yellow-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faBoxOpen} className="text-[#f59e0b]" /> Cảnh báo tồn kho
              </h3>
              {(dashData?.lowStockProducts ?? []).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-yellow-50 last:border-0">
                  <div>
                    <p className="text-[13px] text-gray-700 font-medium m-0">{p.name}</p>
                    <p className="text-[11px] text-gray-400 m-0">{p.category}</p>
                  </div>
                  <span className={[
                    'text-[12px] font-bold px-2 py-0.5 rounded',
                    p.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700',
                  ].join(' ')}>
                    {p.stock === 0 ? 'Hết' : `Còn ${p.stock}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: REVENUE ── */}
      {!loading && activeTab === 'revenue' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {isAdmin && (
            <>
              <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#3b82f6]">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tổng doanh thu</p>
                <p className="text-[26px] font-extrabold text-gray-800">{fmt(revenueData?.totalRevenue ?? 0)}</p>
                <p className="text-[12px] text-gray-400">{revenueData?.totalOrders ?? 0} đơn hoàn thành</p>
              </div>
            </>
          )}

          <div className="bg-white rounded-xl p-5 shadow-sm xl:col-span-3">
            <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Doanh thu theo ngày</h3>
            {(revenueData?.daily ?? []).length > 0 ? (
              <MiniBarChart
                bars={(revenueData?.daily ?? []).map(d => ({
                  label: d.date.slice(5).replace('-', '/'),
                  value: d.revenue,
                }))}
              />
            ) : (
              <div className="flex items-center justify-center py-10 text-gray-300 text-[13px]">Không có dữ liệu</div>
            )}
          </div>

          {/* Daily table */}
          {(revenueData?.daily ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden xl:col-span-3">
              <table className="w-full">
                <thead className="bg-gray-50 text-[12px] font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="p-3 text-left">Ngày</th>
                    {isAdmin && <th className="p-3 text-right">Doanh thu</th>}
                    <th className="p-3 text-right">Số đơn</th>
                    {isAdmin && <th className="p-3 text-right">TB/đơn</th>}
                  </tr>
                </thead>
                <tbody>
                  {(revenueData?.daily ?? []).map(d => (
                    <tr key={d.date} className="border-t border-gray-50 hover:bg-gray-50 text-[13px]">
                      <td className="p-3 text-gray-600">{d.date}</td>
                      {isAdmin && <td className="p-3 text-right font-semibold text-gray-800">{fmt(d.revenue)}</td>}
                      <td className="p-3 text-right text-gray-500">{d.orders}</td>
                      {isAdmin && <td className="p-3 text-right text-gray-400">{d.orders > 0 ? fmt(d.revenue / d.orders) : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SHIFT ── */}
      {!loading && activeTab === 'shift' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Doanh thu theo giờ</h3>
            {(shiftData?.hourly ?? []).length > 0 ? (
              <MiniBarChart
                bars={(shiftData?.hourly ?? []).map(h => ({
                  label: `${h.hour}h`,
                  value: h.revenue,
                }))}
              />
            ) : (
              <div className="flex items-center justify-center py-10 text-gray-300 text-[13px]">Không có dữ liệu</div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faTrophy} className="text-[#f59e0b]" /> Bán chạy trong kỳ
            </h3>
            {(shiftData?.topProducts ?? []).length > 0 ? (
              (shiftData?.topProducts ?? []).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={[
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                    i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600',
                  ].join(' ')}>{i + 1}</span>
                  <span className="flex-1 text-[13px] text-gray-700 truncate">{p.productName}</span>
                  <span className="text-[12px] font-semibold text-[#16a34a]">{p.quantity} phần</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-10 text-gray-300 text-[13px]">Không có dữ liệu</div>
            )}
          </div>

          {/* Hourly table */}
          {(shiftData?.hourly ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden xl:col-span-2">
              <table className="w-full">
                <thead className="bg-gray-50 text-[12px] font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="p-3 text-left">Giờ</th>
                    {isAdmin && <th className="p-3 text-right">Doanh thu</th>}
                    <th className="p-3 text-right">Số đơn</th>
                  </tr>
                </thead>
                <tbody>
                  {(shiftData?.hourly ?? []).filter(h => h.orders > 0).map(h => (
                    <tr key={h.hour} className="border-t border-gray-50 hover:bg-gray-50 text-[13px]">
                      <td className="p-3 text-gray-600">{h.hour}:00 — {h.hour + 1}:00</td>
                      {isAdmin && <td className="p-3 text-right font-semibold text-gray-800">{fmt(h.revenue)}</td>}
                      <td className="p-3 text-right text-gray-500">{h.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
