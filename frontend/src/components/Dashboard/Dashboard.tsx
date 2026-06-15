// src/components/dashboard/Dashboard.tsx
// Refactored: uses GET /reports/dashboard instead of manual order counting
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign, faClipboardCheck, faBoxOpen,
  faArrowUp, faSyncAlt, faChevronDown,
  faInbox, faTriangleExclamation, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + '₫';

type TabType = 'Theo giờ' | 'Theo ngày';
const PERIODS = [
  { label: 'Hôm nay',    from: () => { const d = today(); return { from: d, to: d }; } },
  { label: 'Hôm qua',    from: () => { const d = daysAgo(1); return { from: d, to: d }; } },
  { label: '7 ngày qua', from: () => ({ from: daysAgo(6), to: today() }) },
  { label: 'Tháng này',  from: () => ({ from: firstOfMonth(), to: today() }) },
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`;
};

interface DashboardData {
  period: { from: string; to: string };
  revenue: number;
  paidOrders: number;
  averageOrderValue: number;
  paymentMethods: { method: string; amount: number; count: number }[];
  topProducts: { productId: number; productName: string; quantity: number; revenue: number }[];
  lowStockCount: number;
  lowStockProducts: {
    id: number; code: string; name: string;
    stock: number; minStock: number; category: string;
  }[];
}

interface ChartBar { label: string; value: number; }

function BarChart({ bars, maxVal }: { bars: ChartBar[]; maxVal: number }) {
  if (bars.every(b => b.value === 0)) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 0', gap: 8, color: '#9ca3af' }}>
      <FontAwesomeIcon icon={faInbox} style={{ fontSize: 32 }} />
      <p style={{ margin: 0, fontSize: 13 }}>Không có giao dịch</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px', overflowX: 'auto' }}>
      {bars.map(bar => {
        const pct = maxVal > 0 ? (bar.value / maxVal) * 100 : 0;
        return (
          <div key={bar.label} title={`${bar.label}: ${fmt(bar.value)}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '1 0 28px', minWidth: 28 }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 130 }}>
              <div style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                background: pct > 0 ? '#16a34a' : '#f3f4f6',
                height: `${Math.max(pct, pct > 0 ? 4 : 0)}%`,
                transition: 'height 0.4s ease', minHeight: pct > 0 ? 4 : 0,
              }} />
            </div>
            <span style={{
              fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap',
              writingMode: bars.length > 14 ? 'vertical-rl' : 'horizontal-tb',
              transform: bars.length > 14 ? 'rotate(180deg)' : 'none',
            }}>{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('Theo giờ');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [hourlyData, setHourlyData] = useState<{ hour: number; revenue: number; orders: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const selectedPeriod = PERIODS[selectedPeriodIdx];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = selectedPeriod.from();
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const [dashRes, shiftRes, revenueRes, activeRes] = await Promise.allSettled([
        api.get<DashboardData>('/reports/dashboard', { params }),
        api.get('/reports/shift', { params }),
        api.get('/reports/revenue', { params }),
        api.get('/orders', { params: { status: 'pending', limit: 1 } }),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashData(dashRes.value.data);
      }
      if (shiftRes.status === 'fulfilled') {
        setHourlyData(shiftRes.value.data?.hourly ?? []);
      }
      if (revenueRes.status === 'fulfilled') {
        setDailyData(revenueRes.value.data?.daily ?? []);
      }
      if (activeRes.status === 'fulfilled') {
        const d = activeRes.value.data;
        const arr = Array.isArray(d) ? d : d?.data ?? [];
        setActiveOrderCount(d?.total ?? arr.length);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodIdx, refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
  const chartBars: ChartBar[] = React.useMemo(() => {
    if (activeTab === 'Theo giờ') {
      const map: Record<number, number> = {};
      HOURS.forEach(h => { map[h] = 0; });
      hourlyData.forEach(row => { if (row.hour >= 6) map[row.hour] = row.revenue; });
      return HOURS.map(h => ({ label: `${h}h`, value: map[h] ?? 0 }));
    }
    // Theo ngày
    return dailyData.map(row => ({
      label: row.date.slice(5).replace('-', '/'),
      value: row.revenue,
    }));
  }, [activeTab, hourlyData, dailyData]);

  const maxVal = Math.max(...chartBars.map(b => b.value), 1);

  const revenue = dashData?.revenue ?? 0;
  const paidOrders = dashData?.paidOrders ?? 0;

  const STATS = [
    {
      icon: faDollarSign, iconBg: '#3b82f6',
      label: `${paidOrders} đơn hoàn thành`,
      value: isAdmin ? fmt(revenue) : `${paidOrders} đơn`,
      change: null,
      sub: `TB: ${isAdmin ? fmt(dashData?.averageOrderValue ?? 0) : ''}`,
    },
    {
      icon: faClipboardCheck, iconBg: '#14b8a6',
      label: 'Đang phục vụ',
      value: String(activeOrderCount),
      change: null, sub: 'Đơn đang mở bàn',
    },
    {
      icon: faBoxOpen, iconBg: (dashData?.lowStockCount ?? 0) > 0 ? '#f59e0b' : '#8b5cf6',
      label: 'Sắp hết hàng',
      value: String(dashData?.lowStockCount ?? 0),
      change: null,
      sub: (dashData?.lowStockCount ?? 0) > 0 ? 'Cần nhập thêm' : 'Tồn kho ổn định',
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, background: '#f3f4f6',
      minHeight: 'calc(100vh - 92px)', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

        {/* Stats card */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '0.5px', margin: 0 }}>
              KẾT QUẢ BÁN HÀNG — {selectedPeriod.label.toUpperCase()}
            </h2>
            <button onClick={() => setRefreshKey(k => k + 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 13, padding: 4 }}
              title="Làm mới">
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px 0', gap: 8, color: '#9ca3af' }}>
              <FontAwesomeIcon icon={faSpinner} spin />
              <span style={{ fontSize: 13 }}>Đang tải...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {STATS.map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && <div style={{ width: 1, height: 50, background: '#e5e7eb', margin: '0 4px' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1,
                    padding: '0 16px', ...(i === 0 ? { paddingLeft: 0 } : {}) }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: s.iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0 }}>
                      <FontAwesomeIcon icon={s.icon} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                          {s.value}
                        </span>
                        {s.change && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e',
                            display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FontAwesomeIcon icon={faArrowUp} /> {s.change}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{s.sub}</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Chart card */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '0.5px', margin: 0 }}>
                DOANH SỐ {selectedPeriod.label.toUpperCase()}
              </h2>
              {isAdmin && !loading && (
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{fmt(revenue)}</span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6,
                  fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setShowPeriodMenu(v => !v)}>
                {selectedPeriod.label} <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10 }} />
              </button>
              {showPeriodMenu && (
                <div style={{ position: 'absolute', top: 36, right: 0, width: 150, background: '#fff',
                  border: '1px solid #e5e7eb', borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}>
                  {PERIODS.map((p, i) => (
                    <div key={p.label}
                      style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                        color: i === selectedPeriodIdx ? '#16a34a' : '#374151',
                        fontWeight: i === selectedPeriodIdx ? 600 : 400,
                        background: i === selectedPeriodIdx ? '#f0fdf4' : 'transparent' }}
                      onClick={() => { setSelectedPeriodIdx(i); setShowPeriodMenu(false); }}>
                      {p.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
            {(['Theo giờ', 'Theo ngày'] as TabType[]).map(tab => (
              <button key={tab}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #16a34a' : '2px solid transparent',
                  marginBottom: -2, cursor: 'pointer', fontSize: 13.5,
                  color: activeTab === tab ? '#16a34a' : '#6b7280',
                  fontWeight: activeTab === tab ? 600 : 400, fontFamily: 'inherit' }}
                onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          {loading
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 160, color: '#9ca3af', gap: 8 }}>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span style={{ fontSize: 13 }}>Đang tải...</span>
              </div>
            : <BarChart bars={chartBars} maxVal={maxVal} />
          }

          {/* Top products */}
          {!loading && isAdmin && (dashData?.topProducts ?? []).length > 0 && (
            <div style={{ marginTop: 20, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 10px', letterSpacing: '0.5px' }}>
                TOP SẢN PHẨM
              </h3>
              {(dashData?.topProducts ?? []).map((p, i) => (
                <div key={p.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', width: 16 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.productName}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{p.quantity} phần</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {(dashData?.lowStockCount ?? 0) > 0 && (
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#92400e',
              margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.5px' }}>
              <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#f59e0b' }} />
              SẮP HẾT HÀNG ({dashData?.lowStockCount})
            </h3>
            {(dashData?.lowStockProducts ?? []).slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#374151', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{p.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700,
                  color: p.stock === 0 ? '#ef4444' : '#f59e0b',
                  background: p.stock === 0 ? '#fef2f2' : '#fffbeb',
                  padding: '2px 8px', borderRadius: 4 }}>
                  {p.stock === 0 ? 'Hết' : `Còn ${p.stock}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151',
            margin: '0 0 10px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FontAwesomeIcon icon={faClipboardCheck} style={{ color: '#14b8a6' }} />
            TÌNH TRẠNG HÔM NAY
          </h3>
          {loading
            ? <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ color: '#9ca3af' }} />
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Đơn hoàn thành', val: paidOrders, color: '#16a34a' },
                  { label: 'Đang phục vụ', val: activeOrderCount, color: '#14b8a6' },
                  ...(isAdmin ? [{ label: 'Doanh thu', val: fmt(revenue), color: '#3b82f6' }] : []),
                  ...(isAdmin ? [{ label: 'TB/đơn', val: fmt(dashData?.averageOrderValue ?? 0), color: '#8b5cf6' }] : []),
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '6px 10px', background: '#f9fafb', borderRadius: 6 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.val}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Phương thức thanh toán */}
        {isAdmin && !loading && (dashData?.paymentMethods ?? []).length > 0 && (
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 10px', letterSpacing: '0.5px' }}>
              PHƯƠNG THỨC THANH TOÁN
            </h3>
            {(dashData?.paymentMethods ?? []).map(pm => {
              const labels: Record<string, string> = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', payos_qr: 'QR PayOS' };
              return (
                <div key={pm.method} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{labels[pm.method] ?? pm.method}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmt(pm.amount)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{pm.count} đơn</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
};

export default Dashboard;
