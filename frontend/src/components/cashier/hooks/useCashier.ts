// src/components/cashier/hooks/useCashier.ts
// DIFF: thêm customer state, points earn/redeem, tích hợp vào payment flow
// Chỉ liệt kê những phần THÊM/ĐỔI so với file trước — paste vào đúng vị trí

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { cashierApi } from '../../../api/cashier.api';
import { customersApi } from '../../../api/customers.api';
import type { Zone, MenuItem } from '../../../types/cashier.types';
import type { CreatePaymentDto, Order, OrderItem, Customer } from '../../../types';
import { POINTS_EARN_RATE, POINTS_REDEEM_VALUE } from '../../../types';

// ─── Re-export constants cho components dùng ─────────────────────────────────
export { TIER_CONFIG, POINTS_EARN_RATE, POINTS_REDEEM_VALUE } from '../../../types';

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
  itemStatus?: 'new' | 'sent' | 'done' | 'cancelled';
  orderItemId?: number;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'payos_qr';

export interface PaymentModalState {
  open: boolean;
  orderId: number | null;
  orderVersion: number;
  total: number;             // tổng tiền cuối (sau discount + redeem)
  grossTotal: number;        // subtotal + VAT trước giảm giá
  method: PaymentMethod;
  receivedAmount: number;
  discount: number;          // giảm giá thủ công (₫)
  discountType: 'fixed' | 'percent';
  redeemedPoints: number;    // NEW: số điểm đang dùng
  redeemDiscount: number;    // NEW: quy ra tiền (redeemedPoints * POINTS_REDEEM_VALUE)
  qrCode: string | null;
  checkoutUrl: string | null;
  paymentLinkId: string | null;
  pollingStatus: 'idle' | 'polling' | 'paid' | 'failed' | 'cancelled';
}

export interface TransferModalState {
  open: boolean;
  fromTable: SelectedTable | null;
  orderId: number | null;
}

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

export const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';

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

  /* ── Active order ── */
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  /* ── Customer (NEW) ── */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  /* ── Toasts ── */
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ── Payment modal ── */
  const EMPTY_MODAL: PaymentModalState = {
    open: false, orderId: null, orderVersion: 1,
    total: 0, grossTotal: 0,
    method: 'cash', receivedAmount: 0,
    discount: 0, discountType: 'fixed',
    redeemedPoints: 0, redeemDiscount: 0,
    qrCode: null, checkoutUrl: null, paymentLinkId: null,
    pollingStatus: 'idle',
  };
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(EMPTY_MODAL);

  /* ── Transfer / Merge modals ── */
  const [transferModal, setTransferModal] = useState<TransferModalState>({
    open: false, fromTable: null, orderId: null,
  });
  const [mergeModal, setMergeModal] = useState<MergeModalState>({
    open: false, primaryTable: null, primaryOrderId: null,
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
  const isSubmittingRef = useRef(false);

  // ─── Toasts ──────────────────────────────────────────────────────────────

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Occupied / zones ─────────────────────────────────────────────────────

  const fetchOccupied = useCallback(async () => {
    try { setOccupied(await cashierApi.getOccupiedTableIds()); } catch { /* keep */ }
  }, []);

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
        if (orderItems.length > 0 && selectedTable && !paying) handleOpenPaymentModal();
      }
      if (e.key === 'Escape') {
        if (paymentModal.open && paymentModal.pollingStatus !== 'polling') handleClosePaymentModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderItems.length, selectedTable, paying, paymentModal.open, paymentModal.pollingStatus]);

  // ─── Menu ─────────────────────────────────────────────────────────────────

  const handleOpenMenu = async () => {
    setShowMenu(p => !p);
    if (!menuFetched) {
      setLoadingMenu(true);
      try {
        setMenuItems(await cashierApi.getMenuItems());
        setMenuFetched(true);
      } catch { /* keep empty */ }
      finally { setLoadingMenu(false); }
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

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

  const categories = useMemo(() =>
    Array.from(new Set(menuItems.map(m => m.category).filter(Boolean))),
    [menuItems],
  );

  const filteredMenu = useMemo(() => menuItems.filter(m => {
    const matchName = m.name.toLowerCase().includes(searchMenu.toLowerCase());
    const matchCat = !searchCategory || m.category === searchCategory;
    return matchName && matchCat;
  }), [menuItems, searchMenu, searchCategory]);

  // ─── Pricing ──────────────────────────────────────────────────────────────

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = Math.round(subtotal * 0.08);
  const grossTotal = subtotal + vat;
  // total hiển thị ngoài panel = trước khi áp discount/redeem (chỉ áp trong modal)
  const total = grossTotal;

  // ─── Cart ─────────────────────────────────────────────────────────────────

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

  // ─── Customer (NEW) ───────────────────────────────────────────────────────

  const handleSelectCustomer = (c: Customer | null) => {
    setSelectedCustomer(c);
    // Reset redeem khi thay đổi khách
    setPaymentModal(m => ({ ...m, redeemedPoints: 0, redeemDiscount: 0 }));
  };

  // ─── Compute final modal total (helper) ───────────────────────────────────

  const computeModalTotal = (
    gross: number,
    discountAmt: number,
    redeemDisc: number,
  ) => Math.max(0, gross - discountAmt - redeemDisc);

  // ─── Select table ──────────────────────────────────────────────────────────

  const selectTable = async (tbl: SelectedTable) => {
    if (orderItems.length > 0 && !activeOrder) {
      const ok = window.confirm('Bạn đang có món chưa lưu. Chuyển bàn sẽ mất dữ liệu. Tiếp tục?');
      if (!ok) return;
    }
    setSelectedTable(tbl);
    setOrderItems([]);
    setShowMenu(false);
    setActiveOrder(null);
    setSelectedCustomer(null); // clear customer khi đổi bàn

    const isSpecial = 'special' in tbl;
    if (!isSpecial && occupied.has(Number(tbl.id))) {
      try {
        const existing = await cashierApi.getTableOrder(Number(tbl.id));
        if (existing) {
          setActiveOrder(existing);
          const restored: CartItem[] = (existing.items ?? [])
            .filter((oi: OrderItem) => oi.status !== 'cancelled')
            .map((oi: OrderItem) => ({
              id: String(oi.productId), name: oi.productName,
              price: Number(oi.unitPrice), category: '',
              qty: oi.quantity, note: oi.note,
              itemStatus: oi.status, orderItemId: oi.id,
            }));
          if (restored.length > 0) setOrderItems(restored);
        }
      } catch { /* ignore */ }
    }
  };

  // ─── Transfer ─────────────────────────────────────────────────────────────

  const handleOpenTransfer = () => {
    if (!selectedTable || !activeOrder) return;
    setTransferModal({ open: true, fromTable: selectedTable, orderId: activeOrder.id });
  };

  const handleTransferToTable = async (targetTable: FlatTable) => {
    if (occupied.has(Number(targetTable.id))) {
      addToast('error', `${targetTable.name} đang có khách, không thể chuyển bàn`);
      return;
    }
    try {
      setPaying(true);
      const { orderId } = transferModal;
      if (!orderId) return;
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
    } finally { setPaying(false); }
  };

  const handleCloseTransfer = () =>
    setTransferModal({ open: false, fromTable: null, orderId: null });

  // ─── Merge ────────────────────────────────────────────────────────────────

  const handleOpenMerge = () => {
    if (!selectedTable || !activeOrder) return;
    setMergeModal({ open: true, primaryTable: selectedTable, primaryOrderId: activeOrder.id });
  };

  const handleMergeWithTable = async (targetTable: FlatTable) => {
    if (!occupied.has(Number(targetTable.id))) {
      addToast('error', `${targetTable.name} chưa có khách, không thể gộp`);
      return;
    }
    try {
      setPaying(true);
      const targetOrder = await cashierApi.getTableOrder(Number(targetTable.id));
      if (!targetOrder) { addToast('error', 'Không tìm thấy đơn của bàn kia'); return; }

      const targetItems = (targetOrder.items ?? [])
        .filter((oi: OrderItem) => oi.status !== 'cancelled')
        .map((oi: OrderItem) => ({ productId: oi.productId, quantity: oi.quantity, note: oi.note }));

      const merged = [...targetItems];
      for (const ci of orderItems) {
        const ex = merged.find(m => m.productId === Number(ci.id));
        if (ex) ex.quantity += ci.qty;
        else merged.push({ productId: Number(ci.id), quantity: ci.qty, note: ci.note });
      }

      await cashierApi.updateOrderItems(targetOrder.id, merged, targetOrder.version);
      if (mergeModal.primaryOrderId) await cashierApi.cancelOrder(mergeModal.primaryOrderId);
      setMergeModal({ open: false, primaryTable: null, primaryOrderId: null });
      await fetchOccupied();
      await selectTable(targetTable);
      addToast('success', `Đã gộp vào ${targetTable.name}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Gộp bàn thất bại');
    } finally { setPaying(false); }
  };

  const handleCloseMerge = () =>
    setMergeModal({ open: false, primaryTable: null, primaryOrderId: null });

  // ─── Send to bar ──────────────────────────────────────────────────────────

  const handleSendToBar = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    try {
      const tableId = ['takeaway', 'delivery'].includes(String(selectedTable.id))
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

  // ─── Open payment modal ───────────────────────────────────────────────────

  const handleOpenPaymentModal = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    try {
      const tableId = ['takeaway', 'delivery'].includes(String(selectedTable.id))
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
      const rawGross = grossTotal;
      setPaymentModal({
        open: true,
        orderId: order.id, orderVersion: order.version,
        grossTotal: rawGross, total: rawGross,
        method: 'cash', receivedAmount: rawGross,
        discount: 0, discountType: 'fixed',
        redeemedPoints: 0, redeemDiscount: 0,
        qrCode: null, checkoutUrl: null, paymentLinkId: null,
        pollingStatus: 'idle',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Không thể mở thanh toán');
    } finally {
      setPaying(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── Points redeem (NEW) ──────────────────────────────────────────────────

  const handleRedeemChange = (points: number) => {
    const redeemDiscount = points * POINTS_REDEEM_VALUE;
    const newTotal = computeModalTotal(
      paymentModal.grossTotal,
      paymentModal.discount,
      redeemDiscount,
    );
    setPaymentModal(m => ({
      ...m,
      redeemedPoints: points,
      redeemDiscount,
      total: newTotal,
      receivedAmount: m.method === 'cash' ? newTotal : m.receivedAmount,
    }));
  };

  // ─── Discount change ──────────────────────────────────────────────────────

  const handleDiscountChange = (value: number, type: 'fixed' | 'percent', grossTotal: number) => {
    const discountAmt = type === 'percent'
      ? Math.round(grossTotal * (Math.min(value, 100) / 100))
      : Math.min(value, grossTotal);
    const newTotal = computeModalTotal(grossTotal, discountAmt, paymentModal.redeemDiscount);
    setPaymentModal(m => ({
      ...m,
      discount: discountAmt, discountType: type,
      total: newTotal,
      receivedAmount: m.method === 'cash' ? newTotal : m.receivedAmount,
    }));
  };

  // ─── QR Polling ───────────────────────────────────────────────────────────

  const stopQrPolling = () => {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
  };

  const startQrPolling = (orderId: number) => {
    stopQrPolling();
    qrPollRef.current = setInterval(async () => {
      try {
        const result = await cashierApi.getPaymentStatus(orderId);
        if (result.paymentStatus === 'paid') {
          stopQrPolling();
          setPaymentModal(m => ({ ...m, pollingStatus: 'paid' }));
          setTimeout(() => resetAfterPayment(), 2000);
        } else if (result.paymentStatus === 'failed' || result.paymentStatus === 'cancelled') {
          stopQrPolling();
          setPaymentModal(m => ({
            ...m, pollingStatus: result.paymentStatus === 'failed' ? 'failed' : 'cancelled',
          }));
        }
      } catch { /* ignore */ }
    }, 3000);
  };

  // ─── Confirm payment ──────────────────────────────────────────────────────

  const handleConfirmPayment = async () => {
    const { orderId, method, receivedAmount, paymentLinkId, pollingStatus, redeemedPoints } = paymentModal;
    if (!orderId) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPaying(true);
    try {
      // Resume QR nếu đã có link
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
        // Tích / dùng điểm sau khi thanh toán thành công (NEW)
        if (selectedCustomer) {
          try {
            const orderFinalTotal = paymentModal.total;
            const earnedPoints = Math.floor(orderFinalTotal * POINTS_EARN_RATE);

            if (redeemedPoints > 0) {
              // Dùng điểm: trừ trước
              await customersApi.updatePoints(selectedCustomer.id, {
                delta: -redeemedPoints,
                reason: `Dùng điểm cho đơn #${orderId}`,
              });
            }
            if (earnedPoints > 0) {
              // Tích điểm
              await customersApi.updatePoints(selectedCustomer.id, {
                delta: earnedPoints,
                reason: `Tích điểm từ đơn #${orderId}`,
              });
            }

            const verb = redeemedPoints > 0
              ? `Đã dùng ${redeemedPoints} điểm, tích thêm ${earnedPoints} điểm`
              : `Đã tích ${earnedPoints} điểm cho ${selectedCustomer.name}`;
            addToast('success', verb);
          } catch {
            addToast('info', 'Thanh toán thành công (cập nhật điểm thất bại — vui lòng điều chỉnh thủ công)');
          }
        }

        resetAfterPayment();
        addToast('success', `Thanh toán thành công! Đơn #${orderId}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const msgStr = Array.isArray(msg) ? msg[0] : msg ?? '';
      if (method === 'payos_qr' && msgStr.includes('chờ thanh toán')) {
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

  // ─── Cancel QR ────────────────────────────────────────────────────────────

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

  // ─── Close modal ──────────────────────────────────────────────────────────

  const handleClosePaymentModal = () => {
    stopQrPolling();
    setPaymentModal(m => ({ ...m, open: false, qrCode: null, pollingStatus: 'idle' }));
  };

  // ─── Reset ────────────────────────────────────────────────────────────────

  const resetAfterPayment = () => {
    stopQrPolling();
    setOrderItems([]);
    setSelectedTable(null);
    setShowMenu(false);
    setActiveOrder(null);
    setSelectedCustomer(null);
    setPaymentModal(EMPTY_MODAL);
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
      setSelectedCustomer(null);
      await fetchOccupied();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg[0] : msg ?? 'Hủy đơn thất bại');
    }
  };

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
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
    totalActive, totalOcc, zoneTables, allTables,
    subtotal, vat, grossTotal, total,
    paying,
    activeOrder,
    toasts, removeToast,
    // customer (NEW)
    selectedCustomer, handleSelectCustomer,
    // payment
    paymentModal, setPaymentModal,
    handleOpenPaymentModal,
    handleSendToBar,
    handleConfirmPayment,
    handleCancelQr,
    handleClosePaymentModal,
    handleDiscountChange,
    handleRedeemChange,
    // transfer / merge / cancel
    transferModal, handleOpenTransfer, handleTransferToTable, handleCloseTransfer,
    mergeModal, handleOpenMerge, handleMergeWithTable, handleCloseMerge,
    handleCancelOrder,
  };
}
