import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { cashierApi } from '../../../api/cashier.api';
import type { Zone, TableItem, MenuItem } from '../../../types/cashier.types';
import type { CreatePaymentDto } from '../../../types';

/* ── Types ── */
export interface FlatTable extends TableItem {
  zoneName: string;
  zoneId: string;
}

export interface SpecialTable {
  id: string;
  name: string;
  special: true;
}

export type SelectedTable = FlatTable | SpecialTable;

export interface CartItem extends MenuItem {
  qty: number;
  note?: string;
}

export const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';

export function useCashier() {
  /* ── Remote state ── */
  const [zones, setZones]               = useState<Zone[]>([]);
  const [menuItems, setMenuItems]       = useState<MenuItem[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingMenu, setLoadingMenu]   = useState(false);
  const [errorZones, setErrorZones]     = useState<string | null>(null);
  const [menuFetched, setMenuFetched]   = useState(false);
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

  /* ── Fetch occupied ── */
  const fetchOccupied = useCallback(async () => {
    try {
      const ids = await cashierApi.getOccupiedTableIds();
      setOccupied(ids);
    } catch { /* giữ nguyên state cũ */ }
  }, []);

  /* ── Load zones + polling ── */
  const loadZones = useCallback(() => {
    setLoadingZones(true);
    cashierApi.getTables()
      .then(data => { setZones(data); setActiveZoneId('all'); setErrorZones(null); })
      .catch(() => setErrorZones('Không thể tải dữ liệu bàn. Vui lòng thử lại.'))
      .finally(() => setLoadingZones(false));
  }, []);

  useEffect(() => {
    loadZones();
    fetchOccupied();
    pollRef.current = setInterval(fetchOccupied, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadZones, fetchOccupied]);

  /* ── Lazy load menu ── */
  const handleOpenMenu = async () => {
    setShowMenu(p => !p);
    if (!menuFetched) {
      setLoadingMenu(true);
      try {
        const items = await cashierApi.getMenuItems();
        setMenuItems(items);
        setMenuFetched(true);
      } catch { /* giữ rỗng */ }
      finally { setLoadingMenu(false); }
    }
  };

  /* ── Derived ── */
  const allTables = useMemo<FlatTable[]>(() =>
    zones.flatMap(z => z.tables.map(t => ({ ...t, zoneName: z.name, zoneId: z.id }))),
    [zones],
  );

  const zoneTables = useMemo<FlatTable[]>(() => {
    let list = activeZoneId === 'all' ? allTables : allTables.filter(t => t.zoneId === activeZoneId);
    if (filterStatus === 'occupied') list = list.filter(t => occupied.has(Number(t.id)));
    if (filterStatus === 'empty')    list = list.filter(t => !occupied.has(Number(t.id)) && t.status === 'active');
    return list;
  }, [activeZoneId, filterStatus, allTables, occupied]);

  const totalPages  = Math.ceil(zoneTables.length / PER);
  const pagedTables = zoneTables.slice((page - 1) * PER, page * PER);
  const totalActive = allTables.filter(t => t.status === 'active').length;
  const totalOcc    = allTables.filter(t => occupied.has(Number(t.id))).length;

  const filteredMenu = menuItems.filter(m =>
    m.name.toLowerCase().includes(searchMenu.toLowerCase()),
  );

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
          .filter(i => i.qty > 0),
    );

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const vat      = Math.round(subtotal * 0.08);
  const total    = subtotal + vat;

  const selectTable = (tbl: SelectedTable) => {
    setSelectedTable(tbl);
    setOrderItems([]);
    setShowMenu(false);
  };

  /* ── Payment ── */
  const handlePay = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    try {
      const tableId = selectedTable.id === 'takeaway' || selectedTable.id === 'delivery'
        ? 0
        : Number(selectedTable.id);

      const order = await cashierApi.createOrder({
        tableId,
        items: orderItems.map(i => ({ productId: Number(i.id), quantity: i.qty, note: i.note })),
      });

      const paymentDto: CreatePaymentDto = { method: 'cash' };
      await cashierApi.pay(order.id, paymentDto);

      alert(`Thanh toán thành công! Đơn #${order.id}`);
      setOrderItems([]);
      setSelectedTable(null);
      setShowMenu(false);
      fetchOccupied();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(Array.isArray(msg) ? msg[0] : msg ?? 'Thanh toán thất bại. Vui lòng thử lại.');
    }
  };

  return {
    // state
    zones, loadingZones, errorZones, loadZones,
    menuItems, filteredMenu, loadingMenu, menuFetched,
    occupied, activeZoneId, setActiveZoneId,
    filterStatus, setFilterStatus,
    selectedTable, selectTable,
    orderItems, addItem, changeQty,
    searchMenu, setSearchMenu,
    showMenu, handleOpenMenu,
    page, setPage, totalPages, pagedTables,
    totalActive, totalOcc, zoneTables,
    subtotal, vat, total,
    handlePay,
  };
}
