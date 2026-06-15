// src/components/cashier/components/PaymentModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { PaymentModalState, PaymentMethod } from '../hooks/useCashier';
import { fmt } from '../hooks/useCashier';

interface Props {
  modal: PaymentModalState;
  paying: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancelQr: () => void;
  onMethodChange: (m: PaymentMethod) => void;
  onReceivedChange: (v: number) => void;
  onDiscountChange: (value: number, type: 'fixed' | 'percent', subtotalPlusVat: number) => void;
}

const METHOD_OPTS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  {
    value: 'cash',
    label: 'Tiền mặt',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="16" height="12" rx="2" />
        <circle cx="10" cy="11" r="2.5" />
        <path d="M2 8h2M16 8h2M2 14h2M16 14h2" />
      </svg>
    ),
  },
  {
    value: 'bank_transfer',
    label: 'Chuyển khoản',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7l8-4 8 4M4 8v7M10 8v7M16 8v7M2 15h16" />
      </svg>
    ),
  },
  {
    value: 'payos_qr',
    label: 'QR PayOS',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="7" height="7" rx="1.2" />
        <rect x="11" y="2" width="7" height="7" rx="1.2" />
        <rect x="2" y="11" width="7" height="7" rx="1.2" />
        <rect x="4" y="4" width="3" height="3" fill="currentColor" stroke="none" />
        <rect x="13" y="4" width="3" height="3" fill="currentColor" stroke="none" />
        <rect x="4" y="13" width="3" height="3" fill="currentColor" stroke="none" />
        <path d="M12 12h2v2h-2zM16 12h2M14 14v2M16 16h2v2M12 18h2" />
      </svg>
    ),
  },
];

const PaymentModal: React.FC<Props> = ({
  modal, paying, onClose, onConfirm, onCancelQr,
  onMethodChange, onReceivedChange, onDiscountChange,
}) => {
  const receivedRef = useRef<HTMLInputElement>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');

  useEffect(() => {
    if (modal.open && modal.method === 'cash') {
      setTimeout(() => receivedRef.current?.select(), 80);
    }
  }, [modal.open, modal.method]);

  // Reset discount input khi modal mở
  useEffect(() => {
    if (modal.open) {
      setDiscountInput('');
      setDiscountType('fixed');
    }
  }, [modal.open]);

  if (!modal.open) return null;

  const grossTotal = modal.total + modal.discount; // before discount
  const change = modal.method === 'cash'
    ? Math.max(0, modal.receivedAmount - modal.total)
    : 0;

  const isQrPaid = modal.pollingStatus === 'paid';
  const isQrPolling = modal.pollingStatus === 'polling';
  const isQrFailed = modal.pollingStatus === 'failed' || modal.pollingStatus === 'cancelled';
  const showQrScreen = modal.method === 'payos_qr' && (isQrPolling || modal.qrCode);

  const canConfirm =
    !paying &&
    !isQrPolling &&
    !isQrPaid &&
    !(modal.method === 'cash' && modal.receivedAmount < modal.total);

  const handleDiscountApply = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) return;
    onDiscountChange(val, discountType, grossTotal);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(17,17,16,0.55)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget && !isQrPolling) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[460px] max-h-[92vh] overflow-y-auto"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#f0f0ee]">
          <div>
            <h2 className="text-[18px] font-bold text-[#111110] m-0 tracking-tight">Thanh toán</h2>
            {modal.orderId && (
              <p className="text-[12px] text-[#a8a8a3] m-0 mt-0.5 font-mono">Đơn #{modal.orderId}</p>
            )}
          </div>
          {!isQrPolling && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f6f6f4] hover:bg-[#ebebea] flex items-center justify-center text-[#6b6b68] transition-colors mt-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-6 py-4 space-y-4">

          {/* ── QR Paid ── */}
          {isQrPaid && (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <path d="M5 15l8 8L25 9" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[18px] font-bold text-green-700">Thanh toán thành công!</p>
              <p className="text-[12.5px] text-[#a8a8a3]">Đang đóng tự động...</p>
            </div>
          )}

          {/* ── QR Screen ── */}
          {showQrScreen && !isQrPaid && (
            <div className="space-y-4 text-center">
              {isQrFailed ? (
                <div className="py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 3l14 14M17 3L3 17" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold text-red-600">QR thất bại hoặc đã hủy</p>
                  <button
                    onClick={onCancelQr}
                    className="px-4 py-2 bg-[#f6f6f4] rounded-lg text-[13px] text-[#6b6b68] hover:bg-[#ebebea] transition-colors"
                  >
                    Chọn phương thức khác
                  </button>
                </div>
              ) : (
                <>
                  {modal.qrCode ? (
                    /* FIX: dùng checkoutUrl để embed hoặc hiện QR đúng từ PayOS */
                    <div className="border-2 border-[#e6e6e2] rounded-xl p-4 inline-block bg-white">
                      {modal.checkoutUrl ? (
                        <iframe
                          src={modal.checkoutUrl}
                          title="PayOS QR"
                          className="w-[220px] h-[280px] border-none rounded-lg"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (
                        <div className="w-[200px] h-[200px] bg-[#f6f6f4] rounded-lg flex items-center justify-center text-[11px] text-[#a8a8a3] p-3 break-all">
                          {modal.qrCode}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-[200px] h-[200px] bg-[#f6f6f4] rounded-xl mx-auto flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-[#e0e0dc] border-t-[#16a34a] rounded-full animate-spin" />
                      <span className="text-[12px] text-[#a8a8a3]">Đang tạo QR...</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[13px] text-[#6b6b68]">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Đang chờ khách thanh toán
                  </div>
                  <p className="text-[12.5px] text-[#a8a8a3]">
                    Số tiền: <strong className="text-[#111110]">{fmt(modal.total)}</strong>
                  </p>
                  {modal.checkoutUrl && (
                    <a
                      href={modal.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-blue-500 hover:underline"
                    >
                      Mở trang thanh toán PayOS ↗
                    </a>
                  )}
                  <button
                    onClick={onCancelQr}
                    className="block w-full mt-1 py-2 border border-red-200 text-red-500 rounded-xl text-[12.5px] hover:bg-red-50 transition-colors"
                  >
                    Hủy QR
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Normal payment UI ── */}
          {!showQrScreen && !isQrPaid && (
            <>
              {/* Total */}
              <div className="bg-[#f6f6f4] rounded-xl px-5 py-4 flex items-center justify-between">
                <span className="text-[13px] text-[#6b6b68] font-medium">Tổng tiền</span>
                <span className="font-mono text-[26px] font-bold text-[#111110] tracking-tight">
                  {fmt(modal.total)}
                </span>
              </div>

              {/* Discount */}
              <div>
                <p className="text-[11.5px] font-semibold text-[#a8a8a3] uppercase tracking-wide mb-2">
                  Giảm giá
                </p>
                <div className="flex gap-2 items-center">
                  {/* Type toggle */}
                  <div className="flex rounded-lg border border-[#e6e6e2] overflow-hidden shrink-0">
                    {(['fixed', 'percent'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setDiscountType(t); setDiscountInput(''); }}
                        className={[
                          'px-3 py-1.5 text-[12px] font-medium transition-colors',
                          discountType === t
                            ? 'bg-[#111110] text-white'
                            : 'bg-white text-[#6b6b68] hover:bg-[#f6f6f4]',
                        ].join(' ')}
                      >
                        {t === 'fixed' ? '₫' : '%'}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={discountType === 'percent' ? 100 : undefined}
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDiscountApply()}
                    placeholder={discountType === 'percent' ? '0 – 100' : '0'}
                    className="flex-1 h-9 px-3 border-[1.5px] border-[#e6e6e2] rounded-lg text-[13px] font-mono outline-none focus:border-[#111110] transition-colors"
                  />
                  <button
                    onClick={handleDiscountApply}
                    className="h-9 px-4 bg-[#111110] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#2a2a28] transition-colors shrink-0"
                  >
                    Áp dụng
                  </button>
                </div>
                {modal.discount > 0 && (
                  <p className="text-[12px] text-green-600 mt-1.5">
                    Đã giảm <strong>{fmt(modal.discount)}</strong>
                    <button
                      onClick={() => { setDiscountInput(''); onDiscountChange(0, 'fixed', grossTotal); }}
                      className="ml-2 text-[11px] text-[#a8a8a3] underline"
                    >xóa</button>
                  </p>
                )}
              </div>

              {/* Method tabs */}
              <div>
                <p className="text-[11.5px] font-semibold text-[#a8a8a3] uppercase tracking-wide mb-2">
                  Phương thức
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {METHOD_OPTS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => onMethodChange(opt.value)}
                      className={[
                        'flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border-2 text-[12.5px] font-medium transition-all',
                        modal.method === opt.value
                          ? 'border-[#111110] bg-[#111110] text-white shadow-md'
                          : 'border-[#e6e6e2] text-[#6b6b68] hover:border-[#cacac4] hover:bg-[#fafafa]',
                      ].join(' ')}
                    >
                      <span className={modal.method === opt.value ? 'opacity-90' : 'opacity-60'}>
                        {opt.icon}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash: received + change */}
              {modal.method === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11.5px] font-semibold text-[#a8a8a3] uppercase tracking-wide block mb-1.5">
                      Khách đưa
                    </label>
                    <div className="relative">
                      <input
                        ref={receivedRef}
                        type="number"
                        min={0}
                        step={1000}
                        value={modal.receivedAmount || ''}
                        onChange={e => onReceivedChange(Number(e.target.value))}
                        className="w-full border-2 border-[#e6e6e2] rounded-xl px-4 py-3 font-mono text-[20px] font-bold text-right text-[#111110] outline-none focus:border-[#111110] transition-colors"
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a8a8a3] font-mono text-[14px]">₫</span>
                    </div>
                    {/* Quick fill */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[modal.total, 50000, 100000, 200000, 500000].map(v => (
                        <button
                          key={v}
                          onClick={() => onReceivedChange(v)}
                          className="px-2.5 py-1 rounded-lg border border-[#e6e6e2] text-[11.5px] text-[#6b6b68] hover:bg-[#f6f6f4] hover:border-[#cacac4] transition-colors font-mono"
                        >
                          {v === modal.total ? 'Đúng tiền' : `${(v / 1000).toFixed(0)}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Change */}
                  <div className={[
                    'flex items-center justify-between rounded-xl px-4 py-3',
                    change > 0 ? 'bg-green-50' : 'bg-[#f6f6f4]',
                  ].join(' ')}>
                    <span className={`text-[13px] font-medium ${change > 0 ? 'text-green-700' : 'text-[#6b6b68]'}`}>
                      Tiền thừa
                    </span>
                    <span className={`font-mono text-[18px] font-bold ${change > 0 ? 'text-green-700' : 'text-[#6b6b68]'}`}>
                      {fmt(change)}
                    </span>
                  </div>
                </div>
              )}

              {/* Bank transfer */}
              {modal.method === 'bank_transfer' && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-[13px] text-blue-700 flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                    <circle cx="8" cy="8" r="7" stroke="#3b82f6" strokeWidth="1.5" />
                    <path d="M8 5v4M8 11v.5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Xác nhận sau khi khách đã chuyển khoản thành công.
                </div>
              )}

              {/* PayOS info */}
              {modal.method === 'payos_qr' && (
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-[13px] text-amber-700 flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                    <circle cx="8" cy="8" r="7" stroke="#d97706" strokeWidth="1.5" />
                    <path d="M8 5v4M8 11v.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Nhấn "Tạo QR" để tạo mã thanh toán. Hệ thống sẽ tự động cập nhật khi khách quét xong.
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!isQrPaid && !showQrScreen && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={paying}
              className="flex-1 h-[46px] rounded-xl border-2 border-[#e6e6e2] text-[#6b6b68] font-semibold text-[13px] hover:bg-[#f6f6f4] transition-colors disabled:opacity-40"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className="flex-[1.8] h-[46px] rounded-xl bg-[#111110] text-white font-semibold text-[13.5px] flex items-center justify-center gap-2 hover:bg-[#2a2a28] transition-all disabled:bg-[#d4d4d0] disabled:cursor-not-allowed"
            >
              {paying ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {modal.method === 'payos_qr' ? 'Tạo QR' : 'Xác nhận'}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 7h10M7 2l5 5-5 5" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;