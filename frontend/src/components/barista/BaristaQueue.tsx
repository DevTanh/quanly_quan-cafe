// src/components/barista/BaristaQueue.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCoffee, faFire, faCheck, faSpinner,
  faSyncAlt, faBell, faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { ordersApi } from '../../api/orders.api';
import { useToast } from '../../context/ToastContext';
import type { Order } from '../../types';

/* ── Types ── */
type ItemStatus = 'new' | 'sent' | 'done' | 'cancelled';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  status: ItemStatus;
}

/* ── Helpers ── */
const STATUS_LABEL: Record<ItemStatus, string> = {
  new:       'Mới',
  sent:      'Đang pha',
  done:      'Hoàn thành',
  cancelled: 'Đã hủy',
};
const STATUS_COLOR: Record<ItemStatus, string> = {
  new:       'bg-blue-100 text-blue-700',
  sent:      'bg-amber-100 text-amber-700',
  done:      'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
};
const CARD_BORDER: Record<Order['status'] & string, string> = {
  pending:    'border-l-4 border-l-blue-400',
  processing: 'border-l-4 border-l-amber-400',
  done:       'border-l-4 border-l-green-400',
  cancelled:  'border-l-4 border-l-gray-300',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
  return `${Math.floor(diff / 3600)}h trước`;
}

/* ════════════════════════════════════════════════════════════════ */
const BaristaQueue: React.FC = () => {
  const toast = useToast();
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(false);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);   // itemId
  const [tab, setTab]                 = useState<'pending' | 'processing'>('pending');
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);

  /* ── Fetch orders cần pha ── */
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [pendingRes, processingRes] = await Promise.all([
        ordersApi.findAll({ status: 'pending' as any, limit: 100 }),
        ordersApi.findAll({ status: 'processing' as any, limit: 100 }),
      ]);

      const prev = orders.length;
      const allOrders: Order[] = [
        ...pendingRes.data,
        ...processingRes.data,
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setOrders(allOrders);
      setLastRefresh(new Date());

      // Thông báo đơn mới
      if (silent && allOrders.length > prev && soundEnabled) {
        // Web Notification API (optional, không bắt buộc)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Đơn mới! 🔔', {
            body: `Có ${allOrders.length - prev} đơn mới vào hàng đợi`,
            icon: '/favicon.ico',
          });
        }
      }
    } catch {
      if (!silent) toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orders.length, soundEnabled, toast]);

  /* Auto-refresh mỗi 15s */
  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(() => fetchOrders(true), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Xin quyền notification */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /* ── Update item status ── */
  const updateStatus = async (orderId: number, itemId: number, newStatus: ItemStatus) => {
    setUpdatingItem(itemId);
    try {
      await ordersApi.updateItemStatus(orderId, itemId, newStatus);
      // Cập nhật local state ngay để không phải chờ re-fetch
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          items: (o.items ?? []).map((item: OrderItem) =>
            item.id === itemId ? { ...item, status: newStatus } : item,
          ),
        };
      }));
      if (newStatus === 'done') toast.success('Món đã hoàn thành!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingItem(null);
    }
  };

  /* ── Filtered orders by tab ── */
  const displayedOrders = orders.filter(o => {
    if (tab === 'pending')    return o.status === 'pending';
    if (tab === 'processing') return o.status === 'processing';
    return true;
  });

  /* ── Stats ── */
  const pendingCount    = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const allItems = orders.flatMap(o => (o.items ?? []) as OrderItem[]);
  const doneCount  = allItems.filter(i => i.status === 'done').length;
  const totalItems = allItems.filter(i => i.status !== 'cancelled').length;

  return (
    <div className="p-5 font-['Segoe_UI',sans-serif] bg-[#f3f4f6] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-800 flex items-center gap-2 m-0">
            <FontAwesomeIcon icon={faCoffee} className="text-[#f59e0b]" />
            Hàng đợi pha chế
          </h1>
          <p className="text-[12.5px] text-gray-400 mt-0.5 m-0">
            Cập nhật lúc {lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(p => !p)}
            title={soundEnabled ? 'Tắt thông báo' : 'Bật thông báo'}
            className={[
              'w-9 h-9 rounded-lg border flex items-center justify-center text-sm transition-colors',
              soundEnabled ? 'border-amber-200 text-amber-500 bg-amber-50' : 'border-gray-200 text-gray-400',
            ].join(' ')}
          >
            <FontAwesomeIcon icon={faBell} />
          </button>
          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Đơn chờ xử lý', value: pendingCount, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Đang pha chế',  value: processingCount, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Món hoàn thành', value: `${doneCount}/${totalItems}`, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
            <p className={`text-[24px] font-bold m-0 ${s.color}`}>{s.value}</p>
            <p className="text-[12.5px] text-gray-500 m-0 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {([
          { key: 'pending' as const, label: `Chờ xử lý (${pendingCount})` },
          { key: 'processing' as const, label: `Đang pha (${processingCount})` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2 rounded-lg text-[13.5px] font-medium transition-colors',
              tab === t.key ? 'bg-[#111110] text-white' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Order cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#f59e0b]" />
          <span className="text-[14px]">Đang tải hàng đợi...</span>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center text-gray-400">
          <FontAwesomeIcon icon={faCheckCircle} className="text-[48px] text-green-300 mb-3 block" />
          <p className="text-[15px] font-semibold text-gray-500">
            {tab === 'pending' ? 'Không có đơn nào đang chờ!' : 'Không có đơn nào đang pha!'}
          </p>
          <p className="text-[13px] mt-1">Mọi thứ đã được xử lý 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedOrders.map(order => {
            const items = ((order.items ?? []) as OrderItem[]).filter(i => i.status !== 'cancelled');
            const orderDone = items.every(i => i.status === 'done');

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${CARD_BORDER[order.status] ?? 'border-l-4 border-l-gray-200'}`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-gray-800">#{order.id}</span>
                    {(order as any).tableName && (
                      <span className="text-[12px] text-gray-500 bg-white border border-gray-200 rounded px-2 py-0.5">
                        {(order as any).tableName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {orderDone && (
                      <span className="text-[11.5px] font-semibold text-green-600 bg-green-100 rounded-full px-2.5 py-1 flex items-center gap-1">
                        <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Xong
                      </span>
                    )}
                    <span className="text-[12px] text-gray-400">{timeAgo(order.createdAt as unknown as string)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {items.map((item: OrderItem) => {
                    const isUpdating = updatingItem === item.id;
                    const canStart = item.status === 'new' || item.status === 'sent';
                    const isDone   = item.status === 'done';

                    return (
                      <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                        {/* Qty badge */}
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[13px] font-bold text-gray-700 shrink-0 mt-0.5">
                          {item.quantity}
                        </div>

                        {/* Name + note + status */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13.5px] font-semibold m-0 ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {item.productName}
                          </p>
                          {item.note && (
                            <p className="text-[12px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 mt-1 m-0 inline-block">
                              📝 {item.note}
                            </p>
                          )}
                          <span className={`inline-block mt-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[item.status]}`}>
                            {STATUS_LABEL[item.status]}
                          </span>
                        </div>

                        {/* Action button */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {item.status === 'new' && (
                            <button
                              onClick={() => updateStatus(order.id, item.id, 'sent')}
                              disabled={isUpdating}
                              title="Bắt đầu pha chế"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-[12px] font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isUpdating
                                ? <FontAwesomeIcon icon={faSpinner} spin className="text-[10px]" />
                                : <FontAwesomeIcon icon={faFire} className="text-[10px]" />}
                              Bắt đầu
                            </button>
                          )}
                          {item.status === 'sent' && (
                            <button
                              onClick={() => updateStatus(order.id, item.id, 'done')}
                              disabled={isUpdating}
                              title="Đánh dấu hoàn thành"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#16a34a] text-white rounded-lg text-[12px] font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isUpdating
                                ? <FontAwesomeIcon icon={faSpinner} spin className="text-[10px]" />
                                : <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                              Hoàn thành
                            </button>
                          )}
                          {isDone && (
                            <span className="flex items-center gap-1 text-[12px] text-green-600 font-medium">
                              <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /> Xong
                            </span>
                          )}
                          {canStart && !isUpdating && item.status !== 'new' && item.status !== 'sent' && null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BaristaQueue;
