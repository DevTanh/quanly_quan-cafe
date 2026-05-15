import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { cashierApi } from '../../api/cashier.api';
import type { Zone, TableItem, MenuItem } from '../../types/cashier.types';
import type { CreatePaymentDto } from '../../types';

/* ── Types local ── */
interface FlatTable extends TableItem {
  zoneName: string;
  zoneId: string;
}
interface SpecialTable {
  id: string;
  name: string;
  special: true;
}
type SelectedTable = FlatTable | SpecialTable;

// OrderItem local (dùng trong POS cart, khác với OrderItem trong types.ts)
interface CartItem extends MenuItem {
  qty: number;
  note?: string;
}

/* ── Helpers ── */
const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';

/* ── CSS (giữ nguyên từ bản cũ) ── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');

  .pos-root *, .pos-root *::before, .pos-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .pos-root {
    font-family: 'DM Sans', sans-serif;
    --bg: #f6f6f4; --surface: #ffffff; --border: #e6e6e2; --border-strong: #cacac4;
    --text-primary: #111110; --text-secondary: #6b6b68; --text-muted: #a8a8a3;
    --accent: #111110; --accent-fg: #ffffff;
    --green: #16a34a; --green-bg: #f0fdf4; --green-border: #bbf7d0;
    --mono: 'DM Mono', monospace;
  }
  .pos-scroll::-webkit-scrollbar { width: 3px; height: 3px; }
  .pos-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px; }
  .ztab { padding: 5px 13px; border-radius: 6px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: transparent; border: none; cursor: pointer; white-space: nowrap; transition: background .12s, color .12s; letter-spacing: -.015em; }
  .ztab:hover { background: var(--border); color: var(--text-primary); }
  .ztab.on { background: var(--accent); color: var(--accent-fg); }
  .chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 99px; font-size: 12.5px; font-weight: 500; border: 1.5px solid var(--border); color: var(--text-secondary); background: transparent; cursor: pointer; transition: all .12s; letter-spacing: -.01em; }
  .chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
  .chip.on { border-color: var(--accent); color: var(--accent); background: rgba(17,17,16,.05); }
  .chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .55; flex-shrink: 0; }
  .tcard { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 15px 8px 13px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface); cursor: pointer; transition: all .15s; min-height: 96px; text-align: center; }
  .tcard:hover { border-color: var(--border-strong); box-shadow: 0 2px 10px rgba(0,0,0,.07); transform: translateY(-1px); }
  .tcard:active { transform: none; box-shadow: none; }
  .tcard.occ { border-color: var(--green-border); background: var(--green-bg); }
  .tcard.sel { border-color: var(--accent); background: var(--accent); box-shadow: 0 6px 22px rgba(0,0,0,.18); transform: translateY(-2px); }
  .tcard.off { opacity: .38; cursor: not-allowed; pointer-events: none; }
  .tname { font-size: 12.5px; font-weight: 600; color: var(--text-primary); letter-spacing: -.015em; line-height: 1; }
  .tcard.occ .tname { color: var(--green); }
  .tcard.sel .tname { color: #fff; }
  .tseats { font-family: var(--mono); font-size: 11px; color: var(--text-muted); }
  .tcard.sel .tseats { color: rgba(255,255,255,.45); }
  .occ-dot { position: absolute; top: 8px; right: 8px; width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 2.5px var(--green-bg); }
  .tcard.sel .occ-dot { background: #4ade80; box-shadow: 0 0 0 2.5px #1a1a18; }
  .sbtn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 62px; height: 54px; border-radius: 9px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; font-size: 10.5px; font-weight: 600; letter-spacing: -.01em; transition: all .12s; flex-shrink: 0; }
  .sbtn:hover { border-color: var(--border-strong); color: var(--text-primary); }
  .sbtn.on { border-color: var(--accent); background: var(--accent); color: #fff; }
  .ibtn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 7px; border: 1.5px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; transition: all .12s; flex-shrink: 0; }
  .ibtn:hover { border-color: var(--border-strong); color: var(--text-primary); background: var(--bg); }
  .orow { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .orow:last-child { border-bottom: none; }
  .qbtn { width: 26px; height: 26px; border-radius: 6px; border: 1.5px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all .1s; }
  .qbtn:hover { border-color: var(--border-strong); color: var(--text-primary); background: var(--bg); }
  .pbtn { display: flex; align-items: center; justify-content: center; gap: 7px; height: 46px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: none; letter-spacing: -.02em; transition: all .14s; font-family: 'DM Sans', sans-serif; }
  .pbtn.p { background: var(--accent); color: #fff; }
  .pbtn.p:hover:not(:disabled) { background: #2c2c2a; transform: translateY(-1px); box-shadow: 0 4px 18px rgba(0,0,0,.22); }
  .pbtn.p:disabled { background: #d0d0cc; cursor: not-allowed; color: #a0a09c; }
  .pbtn.s { background: transparent; color: var(--text-secondary); border: 1.5px solid var(--border); }
  .pbtn.s:hover { border-color: var(--border-strong); color: var(--text-primary); }
  .mcard { display: flex; flex-direction: column; align-items: flex-start; padding: 9px 11px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--surface); cursor: pointer; text-align: left; transition: all .1s; font-family: 'DM Sans', sans-serif; }
  .mcard:hover { border-color: var(--accent); background: var(--bg); }
  .pgbtn { width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all .1s; }
  .pgbtn:hover:not(:disabled) { border-color: var(--border-strong); color: var(--text-primary); }
  .pgbtn:disabled { opacity: .28; cursor: not-allowed; }
  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--text-muted); }
  .empty p { font-size: 13px; text-align: center; line-height: 1.7; }
  .sinput { width: 100%; height: 36px; padding: 0 12px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg); font-size: 13px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); outline: none; transition: border-color .12s; }
  .sinput:focus { border-color: var(--accent); background: var(--surface); }
  .sinput::placeholder { color: var(--text-muted); }
  .skeleton { background: linear-gradient(90deg, #f0f0ee 25%, #e8e8e5 50%, #f0f0ee 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
  @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
`;

/* ── TableCard ── */
const TableCard: React.FC<{
  table: FlatTable;
  isSelected: boolean;
  isOccupied: boolean;
  onClick: (t: FlatTable) => void;
}> = ({ table, isSelected, isOccupied, onClick }) => {
  const occ = isOccupied;
  const off = table.status === 'inactive';
  const cls = ['tcard', occ ? 'occ' : '', isSelected ? 'sel' : '', off ? 'off' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={() => onClick(table)}>
      <svg width="38" height="26" viewBox="0 0 38 26" fill="none">
        <rect x="1" y="1" width="36" height="24" rx="6"
          stroke={isSelected ? 'rgba(255,255,255,.35)' : occ ? '#86efac' : '#dededa'}
          strokeWidth="1.5"
          fill={isSelected ? 'rgba(255,255,255,.07)' : occ ? '#dcfce7' : 'transparent'}
        />
        {[7, 18, 29].map(x => (
          <React.Fragment key={x}>
            <rect x={x} y={-1} width={5} height={3} rx={1.5} fill={isSelected ? 'rgba(255,255,255,.3)' : occ ? '#86efac' : '#d4d4d0'} />
            <rect x={x} y={24} width={5} height={3} rx={1.5} fill={isSelected ? 'rgba(255,255,255,.3)' : occ ? '#86efac' : '#d4d4d0'} />
          </React.Fragment>
        ))}
      </svg>
      <span className="tname">{table.name}</span>
      <span className="tseats">{table.seats} chỗ</span>
      {occ && <span className="occ-dot" />}
    </button>
  );
};

/* ── Loading skeleton cho grid bàn ── */
const TableSkeleton: React.FC = () => (
  <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════ */
const CashierPOS: React.FC = () => {
  /* ── Remote state ── */
  const [zones, setZones]           = useState<Zone[]>([]);
  const [menuItems, setMenuItems]   = useState<MenuItem[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingMenu, setLoadingMenu]   = useState(false);
  const [errorZones, setErrorZones]     = useState<string | null>(null);
  const [menuFetched, setMenuFetched]   = useState(false);
  // Set tableId (number) của các bàn đang có order pending/processing
  const [occupied, setOccupied]         = useState<Set<number>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── UI state ── */
  const [activeZoneId, setActiveZoneId]   = useState('all');
  const [filterStatus, setFilterStatus]   = useState<'all' | 'occupied' | 'empty'>('all');
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null);
  const [orderItems, setOrderItems]       = useState<CartItem[]>([]);
  const [searchMenu, setSearchMenu]       = useState('');
  const [showMenu, setShowMenu]           = useState(false);
  const [page, setPage]                   = useState(1);
  const PER = 12;

  /* ── Fetch occupied table IDs ── */
  const fetchOccupied = useCallback(async () => {
    try {
      const ids = await cashierApi.getOccupiedTableIds();
      setOccupied(ids);
    } catch {
      // giữ nguyên state cũ nếu lỗi, không crash
    }
  }, []);

  /* ── Fetch zones on mount, polling occupied mỗi 30s ── */
  useEffect(() => {
    cashierApi.getTables()
      .then(data => {
        setZones(data);
        setActiveZoneId('all');
      })
      .catch(() => setErrorZones('Không thể tải dữ liệu bàn. Vui lòng thử lại.'))
      .finally(() => setLoadingZones(false));

    fetchOccupied();
    pollRef.current = setInterval(fetchOccupied, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOccupied]);

  /* ── Fetch menu (lazy, chỉ gọi 1 lần khi mở menu panel) ── */
  const handleOpenMenu = async () => {
    setShowMenu(p => !p);
    if (!menuFetched) {
      setLoadingMenu(true);
      try {
        const items = await cashierApi.getMenuItems();
        setMenuItems(items);
        setMenuFetched(true);
      } catch {
        // giữ nguyên rỗng, không crash
      } finally {
        setLoadingMenu(false);
      }
    }
  };

  /* ── Derived data ── */
  const allTables = useMemo<FlatTable[]>(() =>
    zones.flatMap(z => z.tables.map(t => ({ ...t, zoneName: z.name, zoneId: z.id }))),
    [zones]
  );

  const zoneTables = useMemo<FlatTable[]>(() => {
    let list = activeZoneId === 'all' ? allTables : allTables.filter(t => t.zoneId === activeZoneId);
    if (filterStatus === 'occupied') list = list.filter(t => occupied.has(Number(t.id)));
    if (filterStatus === 'empty')    list = list.filter(t => !occupied.has(Number(t.id)) && t.status === 'active');
    return list;
  }, [activeZoneId, filterStatus, allTables]);

  const totalPages  = Math.ceil(zoneTables.length / PER);
  const paged       = zoneTables.slice((page - 1) * PER, page * PER);
  const totalActive = allTables.filter(t => t.status === 'active').length;
  const totalOcc    = allTables.filter(t => occupied.has(Number(t.id))).length;

  /* ── Order helpers ── */
  const addItem = (item: MenuItem) =>
    setOrderItems(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });

  const changeQty = (id: string, delta: number) =>
    setOrderItems(prev =>
      prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
          .filter(i => i.qty > 0)
    );

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const vat      = Math.round(subtotal * 0.08);
  const total    = subtotal + vat;

  const filteredMenu = menuItems.filter(m =>
    m.name.toLowerCase().includes(searchMenu.toLowerCase())
  );

  const handlePay = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    try {
      // Bước 1: Tạo order
      const tableId = selectedTable.id === 'takeaway' || selectedTable.id === 'delivery'
        ? 0  // TODO: BE cần hỗ trợ takeaway/delivery không có tableId
        : Number(selectedTable.id);

      const order = await cashierApi.createOrder({
        tableId,
        items: orderItems.map(i => ({
          productId: Number(i.id),
          quantity: i.qty,
          note: i.note,
        })),
      });

      // Bước 2: Thanh toán tiền mặt (mặc định) — có thể mở rộng modal chọn phương thức
      const paymentDto: CreatePaymentDto = { method: 'cash' };
      await cashierApi.pay(order.id, paymentDto);

      // Bước 3: Cập nhật UI
      alert(`Thanh toán thành công! Đơn #${order.id}`);
      setOrderItems([]);
      setSelectedTable(null);
      setShowMenu(false);
      // Refresh trạng thái bàn
      fetchOccupied();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(Array.isArray(msg) ? msg[0] : msg ?? 'Thanh toán thất bại. Vui lòng thử lại.');
    }
  };

  const S: React.CSSProperties = { display: 'flex' };

  /* ── Error state ── */
  if (errorZones) return (
    <>
      <style>{CSS}</style>
      <div className="pos-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 88px)', flexDirection: 'column', gap: 12, color: '#6b6b68' }}>
        <p style={{ fontSize: 14 }}>{errorZones}</p>
        <button
          className="pbtn p"
          style={{ width: 120 }}
          onClick={() => {
            setErrorZones(null);
            setLoadingZones(true);
            cashierApi.getTables()
              .then(data => { setZones(data); fetchOccupied(); })
              .catch(() => setErrorZones('Không thể tải dữ liệu bàn.'))
              .finally(() => setLoadingZones(false));
          }}
        >
          Thử lại
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="pos-root" style={{ ...S, height: 'calc(100vh - 88px)', background: 'var(--bg)', overflow: 'hidden' }}>

        {/* ══ LEFT ══ */}
        <div style={{ ...S, flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

          {/* Topbar */}
          <div style={{ ...S, alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              className={`sbtn${selectedTable?.id === 'takeaway' ? ' on' : ''}`}
              onClick={() => { setSelectedTable({ id: 'takeaway', name: 'Mang về', special: true }); setOrderItems([]); }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2h12l2 7H4L6 2z"/><path d="M4 9v11a2 2 0 002 2h12a2 2 0 002-2V9"/><path d="M9 13h6"/>
              </svg>
              Mang về
            </button>
            <button
              className={`sbtn${selectedTable?.id === 'delivery' ? ' on' : ''}`}
              onClick={() => { setSelectedTable({ id: 'delivery', name: 'Giao đi', special: true }); setOrderItems([]); }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>
                <path d="M3 9l2-5h8l3 7H3z" strokeLinejoin="round"/><path d="M13 11l2 5h5l1-3"/>
              </svg>
              Giao đi
            </button>

            <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0, margin: '0 2px' }} />

            {/* Zone tabs — chỉ render sau khi load xong */}
            <div className="pos-scroll" style={{ ...S, gap: 2, flex: 1, overflowX: 'auto' }}>
              {loadingZones ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {[80, 60, 90, 72].map((w, i) => (
                    <div key={i} className="skeleton" style={{ width: w, height: 28, borderRadius: 6 }} />
                  ))}
                </div>
              ) : (
                [{ id: 'all', name: 'Tất cả' }, ...zones].map(z => (
                  <button
                    key={z.id}
                    className={`ztab${activeZoneId === z.id ? ' on' : ''}`}
                    onClick={() => { setActiveZoneId(z.id); setPage(1); }}
                  >
                    {z.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ ...S, alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {([
              { val: 'all',      label: 'Tất cả',     count: totalActive },
              { val: 'occupied', label: 'Đang dùng',  count: totalOcc },
              { val: 'empty',    label: 'Còn trống',  count: totalActive - totalOcc },
            ] as { val: 'all' | 'occupied' | 'empty'; label: string; count: number }[]).map(f => (
              <button
                key={f.val}
                className={`chip${filterStatus === f.val ? ' on' : ''}`}
                onClick={() => { setFilterStatus(f.val); setPage(1); }}
              >
                {f.val !== 'all' && <span className="dot" />}
                {f.label}
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--border)', borderRadius: 4, padding: '0 4px', color: 'var(--text-muted)', marginLeft: 1 }}>
                  {loadingZones ? '—' : f.count}
                </span>
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>
              {loadingZones ? '…' : `${zoneTables.length} bàn`}
            </span>
          </div>

          {/* Grid */}
          <div className="pos-scroll" style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
            {loadingZones ? (
              <TableSkeleton />
            ) : paged.length === 0 ? (
              <div className="empty">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect x="3" y="6" width="30" height="24" rx="5" stroke="var(--border-strong)" strokeWidth="2"/>
                </svg>
                <p>Không có bàn nào</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}>
                {paged.map(t => (
                  <TableCard
                    key={t.id}
                    table={t}
                    isSelected={selectedTable?.id === t.id}
                    isOccupied={occupied.has(Number(t.id))}
                    onClick={(tbl) => { setSelectedTable(tbl); setOrderItems([]); setShowMenu(false); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{ ...S, alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <label style={{ ...S, alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
              Mở thực đơn khi chọn bàn
            </label>
            {totalPages > 1 && (
              <div style={{ ...S, alignItems: 'center', gap: 6 }}>
                <button className="pgbtn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{page}/{totalPages}</span>
                <button className="pgbtn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div style={{ width: 356, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', ...S, flexDirection: 'column', overflow: 'hidden' }}>

          {/* Customer search */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ ...S, alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 13, cursor: 'text' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="4.5"/><path d="M10 10l2.5 2.5" strokeLinecap="round"/></svg>
              Tìm khách hàng
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, opacity: .55 }}>F4</span>
            </div>
          </div>

          {/* Table label */}
          <div style={{ ...S, alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, minHeight: 44 }}>
            {selectedTable ? (
              <>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.02em' }}>{selectedTable.name}</span>
                {'special' in selectedTable === false && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {occupied.has(Number((selectedTable as FlatTable).id)) ? '· Đang có khách' : '· Còn trống'}
                  </span>
                )}
                <button
                  onClick={handleOpenMenu}
                  style={{
                    marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
                    background: showMenu ? 'var(--bg)' : 'transparent',
                    border: '1.5px solid var(--border)', borderRadius: 6,
                    padding: '3px 10px', cursor: 'pointer', letterSpacing: '-.01em', transition: 'all .12s',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {showMenu ? 'Ẩn' : '+ Thêm món'}
                </button>
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa chọn bàn</span>
            )}
          </div>

          {/* Menu panel */}
          {showMenu && selectedTable && (
            <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg)', padding: 12 }}>
              <input
                className="sinput"
                value={searchMenu}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchMenu(e.target.value)}
                placeholder="Tìm món..."
                style={{ marginBottom: 8 }}
              />
              {loadingMenu ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
                  ))}
                </div>
              ) : filteredMenu.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                  {menuFetched ? 'Không tìm thấy món' : 'Không thể tải thực đơn'}
                </p>
              ) : (
                <div className="pos-scroll" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 176, overflowY: 'auto' }}>
                  {filteredMenu.map(item => (
                    <button key={item.id} className="mcard" onClick={() => addItem(item)}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.01em', lineHeight: 1.35 }}>{item.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{fmt(item.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order list */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedTable ? (
              <div className="empty">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect x="4" y="10" width="36" height="26" rx="5" stroke="var(--border-strong)" strokeWidth="1.8"/>
                  <path d="M13 10V8a2 2 0 012-2h14a2 2 0 012 2v2" stroke="var(--border-strong)" strokeWidth="1.8"/>
                  <path d="M16 22h12M16 28h8" stroke="var(--border-strong)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <p>Chọn bàn để bắt đầu<br/><span style={{ fontSize: 12 }}>Chọn bàn bên trái</span></p>
              </div>
            ) : orderItems.length === 0 ? (
              <div className="empty">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect x="4" y="10" width="36" height="26" rx="5" stroke="var(--border-strong)" strokeWidth="1.8"/>
                  <path d="M13 10V8a2 2 0 012-2h14a2 2 0 012 2v2" stroke="var(--border-strong)" strokeWidth="1.8"/>
                  <path d="M16 22h12M16 28h8" stroke="var(--border-strong)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <p>
                  Chưa có món nào<br/>
                  <button
                    onClick={handleOpenMenu}
                    style={{ fontSize: 12, color: 'var(--text-primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Thêm món →
                  </button>
                </p>
              </div>
            ) : (
              <div style={{ padding: '2px 14px 0' }}>
                {orderItems.map((item, i) => (
                  <div key={item.id} className="orow">
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-muted)', width: 18, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(item.price)}</p>
                    </div>
                    <div style={{ ...S, alignItems: 'center', gap: 4 }}>
                      <button className="qbtn" onClick={() => changeQty(item.id, -1)}>−</button>
                      <span style={{ width: 24, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{item.qty}</span>
                      <button className="qbtn" onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', width: 72, textAlign: 'right', flexShrink: 0, letterSpacing: '-.02em' }}>
                      {fmt(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {orderItems.length > 0 && (
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              {[['Tạm tính', fmt(subtotal)], ['VAT (8%)', fmt(vat)]].map(([l, v]) => (
                <div key={l} style={{ ...S, justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
              <div style={{ ...S, justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.015em' }}>Tổng tiền</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.03em' }}>{fmt(total)}</span>
              </div>
            </div>
          )}

          {/* Pay */}
          <div style={{ ...S, gap: 8, padding: '10px 14px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button className="pbtn s" style={{ flex: 1 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 2h2l2.4 9h6l1.6-6H5"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/>
              </svg>
              Thông báo
            </button>
            <button
              className="pbtn p"
              style={{ flex: 1.6 }}
              disabled={orderItems.length === 0}
              onClick={handlePay}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="1" y="4" width="14" height="10" rx="2"/><path d="M1 7h14M4 11h2"/>
              </svg>
              Thanh toán
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: .6 }}>F9</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CashierPOS;