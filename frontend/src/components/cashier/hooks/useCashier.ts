// src/components/cashier/hooks/useCashier.ts
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { cashierApi } from '../../../api/cashier.api';
import type { Zone, MenuItem } from '../../../types/cashier.types';
import type { CreatePaymentDto, Order, OrderItem } from '../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlatTable {
  id: string;
  name: string;
  seats: number;
  note: string;
  status: 'active' | 'inactive';
  zoneName: string;
  zoneId: string;
}

export interface SpecialTable {
  id: 'takeaway' | 'delivery';
  name: string;
  special: true;
}

export type SelectedTable = FlatTable | SpecialTable;

export interface CartItem extends MenuItem {
  qty: number;
  note?: string;
  itemStatus?: 'new' | 'sent' | 'done' | 'cancelled'; // status từ BE
  orderItemId?: number; // id trong DB nếu đã save
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'payos_qr';

export interface PaymentModalState {
  open: boolean;
  orderId: number | null;
  orderVersion: number;
  total: number;
  method: PaymentMethod;
  receivedAmount: number;
  discount: number;        // NEW: giảm giá (VNĐ)
  discountType: 'fixed' | 'percent'; // NEW
  qrCode: string | null;
  checkoutUrl: string | null;
  paymentLinkId: string | null;
  pollingStatus: 'idle' | 'polling' | 'paid' | 'failed' | 'cancelled';
}

// NEW: Transfer modal state
export interface TransferModalState {
  open: boolean;
  fromTable: SelectedTable | null;
  orderId: number | null;
}

// NEW: Merge modal state
export interface MergeModalState {
  open: boolean;
  primaryTable: SelectedTable | null;
  primaryOrderId: number | null;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const fmt = (n: number) =>
  n.toLocaleString('vi-VN') + '₫';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCashier() {
  /* ── Remote state ── */
  const [zones, setZones] = useState<Zone[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [errorZones, setErrorZones] = useState<string | null>(null);
  const [menuFetched, setMenuFetched] = useState(false);
  const [occupied, setOccupied] = useState<Set<number>>(new Set());

  /* ── Active order state ── */
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  /* ── Toasts (thay thế alert) ── */
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ── Payment modal ── */
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    open: false,
    orderId: null,
    orderVersion: 1,
    total: 0,
    method: 'cash',
    receivedAmount: 0,
    discount: 0,
    discountType: 'fixed',
    qrCode: null,
    checkoutUrl: null,
    paymentLinkId: null,
    pollingStatus: 'idle',
  });

  /* ── Transfer modal ── */
  const [transferModal, setTransferModal] = useState<TransferModalState>({
    open: false,
    fromTable: null,
    orderId: null,
  });

  /* ── Merge modal ── */
  const [mergeModal, setMergeModal] = useState<MergeModalState>({
    open: false,
    primaryTable: null,
    primaryOrderId: null,
  });

  /* ── UI state ── */
  const [activeZoneId, setActiveZoneId] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'empty'>('all');
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null);
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [searchMenu, setSearchMenu] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [paying, setPaying] = useState(false);
  const [page, setPage] = useState(1);
  const PER = 12;

  /* ── Refs ── */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard chống double-click
  const isSubmittingRef = useRef(false);

  // ─── Toast helpers ───────────────────────────────────────────────────────

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Fetch occupied ──────────────────────────────────────────────────────

  const fetchOccupied = useCallback(async () => {
    try {
      const ids = await cashierApi.getOccupiedTableIds();
      setOccupied(ids);
    } catch { /* giữ nguyên state cũ */ }
  }, []);

  // ─── Load zones ──────────────────────────────────────────────────────────

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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stopQrPolling();
    };
  }, [loadZones, fetchOccupied]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        if (orderItems.length > 0 && selectedTable && !paying) {
          handleOpenPaymentModal();
        }
      }
      if (e.key === 'F4') {
        e.preventDefault();
        // TODO: focus customer search input
      }
      if (e.key === 'Escape') {
        if (paymentModal.open && paymentModal.pollingStatus !== 'polling') {
          handleClosePaymentModal();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderItems.length, selectedTable, paying, paymentModal.open, paymentModal.pollingStatus]);

  // ─── Lazy load menu ──────────────────────────────────────────────────────

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

  // ─── Derived ─────────────────────────────────────────────────────────────

  const allTables = useMemo<FlatTable[]>(() =>
    zones.flatMap(z => z.tables.map(t => ({ ...t, zoneName: z.name, zoneId: z.id }))),
    [zones],
  );

  const zoneTables = useMemo<FlatTable[]>(() => {
    let list = activeZoneId === 'all' ? allTables : allTables.filter(t => t.zoneId === activeZoneId);
    if (filterStatus === 'occupied') list = list.filter(t => occupied.has(Number(t.id)));
    if (filterStatus === 'empty') list = list.filter(t => !occupied.has(Number(t.id)) && t.status === 'active');
    return list;
  }, [activeZoneId, filterStatus, allTables, occupied]);

  const totalPages = Math.ceil(zoneTables.length / PER);
  const pagedTables = zoneTables.slice((page - 1) * PER, page * PER);
  const totalActive = allTables.filter(t => t.status === 'active').length;
  const totalOcc = allTables.filter(t => occupied.has(Number(t.id))).length;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map(m => m.category).filter(Boolean)));
    return cats;
  }, [menuItems]);

  const filteredMenu = useMemo(() => menuItems.filter(m => {
    const matchName = m.name.toLowerCase().includes(searchMenu.toLowerCase());
    const matchCat = !searchCategory || m.category === searchCategory;
    return matchName && matchCat;
  }), [menuItems, searchMenu, searchCategory]);

  // ─── Pricing ─────────────────────────────────────────────────────────────

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = Math.round(subtotal * 0.08);
  const discount = paymentModal.open ? paymentModal.discount : 0;
  const total = Math.max(0, subtotal + vat - discount);

  // ─── Cart helpers ────────────────────────────────────────────────────────

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

  const updateItemNote = (id: string, note: string) =>
    setOrderItems(prev => prev.map(i => i.id === id ? { ...i, note } : i));

  // ─── Select table ────────────────────────────────────────────────────────

  const selectTable = async (tbl: SelectedTable) => {
    // Guard: nếu cart đang có item chưa save, hỏi xác nhận
    if (orderItems.length > 0 && !activeOrder) {
      const ok = window.confirm('Bạn đang có món chưa lưu. Chuyển bàn sẽ mất dữ liệu. Tiếp tục?');
      if (!ok) return;
    }

    setSelectedTable(tbl);
    setOrderItems([]);
    setShowMenu(false);
    setActiveOrder(null);

    const isSpecial = 'special' in tbl;
    if (!isSpecial && occupied.has(Number(tbl.id))) {
      try {
        const existing = await cashierApi.getTableOrder(Number(tbl.id));
        if (existing) {
          setActiveOrder(existing);
          const restored: CartItem[] = (existing.items ?? [])
            .filter((oi: OrderItem) => oi.status !== 'cancelled')
            .map((oi: OrderItem) => ({
              id: String(oi.productId),
              name: oi.productName,
              price: Number(oi.unitPrice),
              category: '',
              qty: oi.quantity,
              note: oi.note,
              itemStatus: oi.status,
              orderItemId: oi.id,
            }));
          if (restored.length > 0) setOrderItems(restored);
        }
      } catch { /* bỏ qua */ }
    }
  };

  // ─── Transfer table ──────────────────────────────────────────────────────

  const handleOpenTransfer = () => {
    if (!selectedTable || !activeOrder) return;
    setTransferModal({ open: true, fromTable: selectedTable, orderId: activeOrder.id });
  };

  const handleTransferToTable = async (targetTable: FlatTable) => {
    const { orderId } = transferModal;
    if (!orderId) return;

    // Kiểm tra bàn đích không có order đang mở
    if (occupied.has(Number(targetTable.id))) {
      addToast('error', `${targetTable.name} đang có khách, không thể chuyển bàn`);
      return;
    }

    try {
      setPaying(true);
      // BE chưa có endpoint transfer → workaround: cancel order cũ, tạo order mới trên bàn mới
      // Nếu BE có /orders/:id/transfer thì gọi trực tiếp
      await cashierApi.cancelOrder(orderId);
      const newOrder = await cashierApi.createOrder({
        tableId: Number(targetTable.id),
        items: orderItems.map(i => ({ productId: Number(i.id), quantity: i.qty, note: i.note })),
      });
      await cashierApi.sendToBar(newOrder.id);

      setTransferModal({ open: false, fromTable: null, orderId: null });
      await fetchOccupied();
      await selectTable(targetTable);
      addToast('success', `Đã chuyển sang ${targetTable.name}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Chuyển bàn thất bại');
    } finally {
      setPaying(false);
    }
  };

  const handleCloseTransfer = () =>
    setTransferModal({ open: false, fromTable: null, orderId: null });

  // ─── Merge table ─────────────────────────────────────────────────────────

  const handleOpenMerge = () => {
    if (!selectedTable || !activeOrder) return;
    setMergeModal({ open: true, primaryTable: selectedTable, primaryOrderId: activeOrder.id });
  };

  const handleMergeWithTable = async (targetTable: FlatTable) => {
    const { primaryOrderId } = mergeModal;
    if (!primaryOrderId) return;

    if (!occupied.has(Number(targetTable.id))) {
      addToast('error', `${targetTable.name} chưa có khách, không thể gộp`);
      return;
    }

    try {
      setPaying(true);
      // Lấy order của bàn đích
      const targetOrder = await cashierApi.getTableOrder(Number(targetTable.id));
      if (!targetOrder) {
        addToast('error', 'Không tìm thấy đơn của bàn kia');
        return;
      }

      // Gộp items: merge cart hiện tại vào order của bàn đích
      const targetItems = (targetOrder.items ?? [])
        .filter((oi: OrderItem) => oi.status !== 'cancelled')
        .map((oi: OrderItem) => ({ productId: oi.productId, quantity: oi.quantity, note: oi.note }));

      const currentItems = orderItems.map(i => ({
        productId: Number(i.id),
        quantity: i.qty,
        note: i.note,
      }));

      // Merge: nếu cùng productId thì cộng qty
      const merged = [...targetItems];
      for (const ci of currentItems) {
        const ex = merged.find(m => m.productId === ci.productId);
        if (ex) ex.quantity += ci.quantity;
        else merged.push(ci);
      }

      await cashierApi.updateOrderItems(targetOrder.id, merged, targetOrder.version);
      // Hủy order bàn hiện tại
      await cashierApi.cancelOrder(primaryOrderId);

      setMergeModal({ open: false, primaryTable: null, primaryOrderId: null });
      await fetchOccupied();
      await selectTable(targetTable);
      addToast('success', `Đã gộp vào ${targetTable.name}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Gộp bàn thất bại');
    } finally {
      setPaying(false);
    }
  };

  const handleCloseMerge = () =>
    setMergeModal({ open: false, primaryTable: null, primaryOrderId: null });

  // ─── Send to bar ─────────────────────────────────────────────────────────

  const handleSendToBar = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    try {
      const tableId = selectedTable.id === 'takeaway' || selectedTable.id === 'delivery'
        ? 0 : Number(selectedTable.id);

      let order: Order;
      if (activeOrder) {
        order = await cashierApi.updateOrderItems(
          activeOrder.id,
          orderItems.map(i => ({ productId: Number(i.id), quantity: i.qty, note: i.note })),
          activeOrder.version,
        );
      } else {
        order = await cashierApi.createOrder({
          tableId,
          items: orderItems.map(i => ({ productId: Number(i.id), quantity: i.qty, note: i.note })),
        });
      }

      await cashierApi.sendToBar(order.id);
      const refreshed = await cashierApi.getOrder(order.id);
      setActiveOrder(refreshed);

      // Sync item statuses
      setOrderItems(prev => prev.map(ci => {
        const oi = refreshed.items?.find((i: OrderItem) => String(i.productId) === ci.id);
        return oi ? { ...ci, itemStatus: oi.status, orderItemId: oi.id } : ci;
      }));

      await fetchOccupied();
      addToast('success', `Đã gửi bar! Đơn #${order.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Gửi bar thất bại');
    } finally {
      setPaying(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── Open payment modal ──────────────────────────────────────────────────

  const handleOpenPaymentModal = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    try {
      const tableId = selectedTable.id === 'takeaway' || selectedTable.id === 'delivery'
        ? 0 : Number(selectedTable.id);

      let order: Order;
      if (activeOrder) {
        order = await cashierApi.updateOrderItems(
          activeOrder.id,
          orderItems.map(i => ({ productId: Number(i.id), quantity: i.qty, note: i.note })),
          activeOrder.version,
        );
      } else {
        order = await cashierApi.createOrder({
          tableId,
          items: orderItems.map(i => ({ productId: Number(i.id), quantity: i.qty, note: i.note })),
        });
      }

      setActiveOrder(order);
      const rawSubtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
      const rawVat = Math.round(rawSubtotal * 0.08);
      const rawTotal = rawSubtotal + rawVat;

      setPaymentModal(prev => ({
        ...prev,
        open: true,
        orderId: order.id,
        orderVersion: order.version,
        total: rawTotal,
        method: 'cash',
        receivedAmount: rawTotal,
        discount: 0,
        discountType: 'fixed',
        qrCode: null,
        checkoutUrl: null,
        paymentLinkId: null,
        pollingStatus: 'idle',
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Không thể mở thanh toán');
    } finally {
      setPaying(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── QR Polling ──────────────────────────────────────────────────────────

  const stopQrPolling = () => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
  };

  const startQrPolling = (orderId: number) => {
    stopQrPolling();
    qrPollRef.current = setInterval(async () => {
      try {
        const result = await cashierApi.getPaymentStatus(orderId);
        const st = result.paymentStatus;
        if (st === 'paid') {
          stopQrPolling();
          setPaymentModal(m => ({ ...m, pollingStatus: 'paid' }));
          setTimeout(() => resetAfterPayment(), 2000);
        } else if (st === 'failed' || st === 'cancelled') {
          stopQrPolling();
          setPaymentModal(m => ({ ...m, pollingStatus: st === 'failed' ? 'failed' : 'cancelled' }));
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
  };

  // ─── Confirm payment ─────────────────────────────────────────────────────

  const handleConfirmPayment = async () => {
    const { orderId, method, receivedAmount, paymentLinkId, pollingStatus } = paymentModal;
    if (!orderId) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    try {
      // FIX: Nếu đã có paymentLinkId (đã tạo QR rồi), resume polling thay vì tạo mới
      if (method === 'payos_qr' && paymentLinkId && pollingStatus === 'idle') {
        setPaymentModal(m => ({ ...m, pollingStatus: 'polling' }));
        startQrPolling(orderId);
        return;
      }

      const dto: CreatePaymentDto = {
        method,
        ...(method === 'cash' ? { receivedAmount } : {}),
      };

      const result = await cashierApi.pay(orderId, dto);

      if (method === 'payos_qr') {
        const payment = result?.payment;
        setPaymentModal(m => ({
          ...m,
          qrCode: payment?.qrCode ?? null,
          checkoutUrl: payment?.checkoutUrl ?? null,
          paymentLinkId: payment?.paymentLinkId ?? null,
          pollingStatus: 'polling',
        }));
        startQrPolling(orderId);
      } else {
        resetAfterPayment();
        addToast('success', `Thanh toán thành công! Đơn #${orderId}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      // FIX: "Đơn đang có giao dịch QR chờ" → resume polling
      const msgStr = Array.isArray(msg) ? msg[0] : msg ?? '';
      if (method === 'payos_qr' && msgStr.includes('chờ thanh toán')) {
        // Payment đang pending, lấy lại QR data và resume
        try {
          const statusResult = await cashierApi.getPaymentStatus(orderId);
          if (statusResult.paymentStatus === 'pending') {
            setPaymentModal(m => ({ ...m, pollingStatus: 'polling' }));
            startQrPolling(orderId);
            addToast('info', 'QR đang chờ thanh toán, tiếp tục theo dõi...');
            return;
          }
        } catch { /* ignore */ }
      }
      addToast('error', msgStr || 'Thanh toán thất bại');
    } finally {
      setPaying(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── Cancel QR ───────────────────────────────────────────────────────────

  const handleCancelQr = async () => {
    const { orderId, paymentLinkId } = paymentModal;
    if (!orderId) return;
    stopQrPolling();
    try {
      await cashierApi.cancelPayment(orderId);
      setPaymentModal(m => ({
        ...m,
        qrCode: null,
        checkoutUrl: null,
        paymentLinkId: null,
        pollingStatus: 'idle',
      }));
      addToast('success', 'Đã hủy QR thanh toán');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Không thể hủy QR thanh toán');
      if (paymentLinkId) {
        setPaymentModal(m => ({ ...m, pollingStatus: 'polling' }));
        startQrPolling(orderId);
      }
    }
  };

  // ─── Close payment modal ─────────────────────────────────────────────────

  const handleClosePaymentModal = () => {
    // FIX: luôn stop polling khi đóng
    stopQrPolling();
    setPaymentModal(m => ({ ...m, open: false, qrCode: null, pollingStatus: 'idle' }));
  };

  // ─── Reset after payment ─────────────────────────────────────────────────

  const resetAfterPayment = () => {
    stopQrPolling();
    setOrderItems([]);
    setSelectedTable(null);
    setShowMenu(false);
    setActiveOrder(null);
    setPaymentModal({
      open: false,
      orderId: null,
      orderVersion: 1,
      total: 0,
      method: 'cash',
      receivedAmount: 0,
      discount: 0,
      discountType: 'fixed',
      qrCode: null,
      checkoutUrl: null,
      paymentLinkId: null,
      pollingStatus: 'idle',
    });
    fetchOccupied();
  };

  // ─── Cancel order ─────────────────────────────────────────────────────────

  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    const ok = window.confirm(`Hủy đơn #${activeOrder.id}? Thao tác không thể hoàn tác.`);
    if (!ok) return;
    try {
      await cashierApi.cancelOrder(activeOrder.id);
      addToast('success', `Đã hủy đơn #${activeOrder.id}`);
      setOrderItems([]);
      setSelectedTable(null);
      setActiveOrder(null);
      await fetchOccupied();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Hủy đơn thất bại');
    }
  };

  // ─── Return ──────────────────────────────────────────────────────────────

  return {
    // state
    zones, loadingZones, errorZones, loadZones,
    menuItems, filteredMenu, loadingMenu, menuFetched,
    occupied, activeZoneId, setActiveZoneId,
    filterStatus, setFilterStatus,
    selectedTable, selectTable,
    orderItems, addItem, changeQty, updateItemNote,
    searchMenu, setSearchMenu,
    searchCategory, setSearchCategory,
    categories,
    showMenu, handleOpenMenu,
    page, setPage, totalPages, pagedTables,
    totalActive, totalOcc, zoneTables,
    subtotal, vat, total,
    paying,
    activeOrder,
    toasts, removeToast,
    // payment flow
    paymentModal, setPaymentModal,
    handleOpenPaymentModal,
    handleSendToBar,
    handleConfirmPayment,
    handleCancelQr,
    handleClosePaymentModal,
    // transfer
    transferModal,
    handleOpenTransfer,
    handleTransferToTable,
    handleCloseTransfer,
    // merge
    mergeModal,
    handleOpenMerge,
    handleMergeWithTable,
    handleCloseMerge,
    // cancel order
    handleCancelOrder,
    allTables,
  };
}
