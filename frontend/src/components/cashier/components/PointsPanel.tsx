// src/components/cashier/components/PointsPanel.tsx
import React, { useState } from 'react';
import type { Customer } from '../../../types';
import { TIER_CONFIG, POINTS_EARN_RATE, POINTS_REDEEM_VALUE } from '../../../types';

interface Props {
  customer: Customer;
  orderTotal: number;                      // tổng tiền sau VAT, trước discount điểm
  redeemedPoints: number;                  // số điểm đang dùng
  onRedeemChange: (points: number) => void; // callback khi thay đổi số điểm dùng
}

const PointsPanel: React.FC<Props> = ({
  customer, orderTotal, redeemedPoints, onRedeemChange,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [mode, setMode] = useState<'earn' | 'redeem'>('earn');

  const earnedPoints = Math.floor(orderTotal * POINTS_EARN_RATE);
  const maxRedeemable = Math.min(
    customer.points,
    Math.floor(orderTotal / POINTS_REDEEM_VALUE), // không được dùng quá tổng tiền
  );
  const redeemDiscount = redeemedPoints * POINTS_REDEEM_VALUE;
  const cfg = TIER_CONFIG[customer.tier];

  const handleApplyRedeem = () => {
    const val = parseInt(inputVal, 10);
    if (isNaN(val) || val < 0) { onRedeemChange(0); return; }
    const clamped = Math.min(val, maxRedeemable);
    onRedeemChange(clamped);
    setInputVal(String(clamped));
  };

  const handleMaxRedeem = () => {
    onRedeemChange(maxRedeemable);
    setInputVal(String(maxRedeemable));
  };

  const handleClearRedeem = () => {
    onRedeemChange(0);
    setInputVal('');
  };

  return (
    <div className="rounded-xl border border-[#e6e6e2] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#fafafa] border-b border-[#f0f0ee]">
        <div className="w-7 h-7 rounded-full bg-[#111110] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-white">
            {customer.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-semibold text-[#111110] truncate">{customer.name}</span>
            <span
              className="shrink-0 text-[10px] font-semibold px-1.5 py-px rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-[11px] text-[#a8a8a3] mt-0.5 font-mono">{customer.phone}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] font-bold text-[#111110]">
            {customer.points.toLocaleString()}
          </p>
          <p className="text-[10.5px] text-[#a8a8a3]">điểm hiện có</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-[#f0f0ee]">
        {([
          { key: 'earn', label: '+ Tích điểm' },
          { key: 'redeem', label: '− Dùng điểm' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setMode(tab.key); if (tab.key === 'earn') handleClearRedeem(); }}
            className={[
              'flex-1 py-2 text-[12.5px] font-semibold transition-colors',
              mode === tab.key
                ? 'text-[#111110] border-b-2 border-[#111110] bg-white'
                : 'text-[#a8a8a3] hover:text-[#6b6b68] bg-[#fafafa]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="px-4 py-3 bg-white">
        {mode === 'earn' ? (
          /* ── Earn mode ── */
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-[#6b6b68]">Điểm sẽ tích được đơn này</p>
              <p className="text-[11.5px] text-[#a8a8a3] mt-0.5">
                ({(POINTS_EARN_RATE * 1000).toFixed(0)} điểm / 1.000₫)
              </p>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-bold text-[#111110] tracking-tight">
                +{earnedPoints.toLocaleString()}
              </p>
              <p className="text-[11px] text-[#a8a8a3]">điểm</p>
            </div>
          </div>
        ) : (
          /* ── Redeem mode ── */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[12px] text-[#a8a8a3]">
              <span>Tối đa có thể dùng</span>
              <span className="font-semibold text-[#6b6b68]">
                {maxRedeemable.toLocaleString()} điểm
                <span className="text-[#c0c0bb] ml-1">
                  (= {(maxRedeemable * POINTS_REDEEM_VALUE).toLocaleString()}₫)
                </span>
              </span>
            </div>

            {redeemedPoints > 0 ? (
              /* Applied state */
              <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-[12.5px] font-semibold text-green-700">
                    Đang dùng {redeemedPoints.toLocaleString()} điểm
                  </p>
                  <p className="text-[11.5px] text-green-600 mt-0.5">
                    Giảm {(redeemDiscount).toLocaleString()}₫
                  </p>
                </div>
                <button
                  onClick={handleClearRedeem}
                  className="text-[11.5px] text-green-600 underline"
                >
                  Bỏ
                </button>
              </div>
            ) : (
              /* Input state */
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={maxRedeemable}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApplyRedeem()}
                  placeholder="Số điểm muốn dùng"
                  className="flex-1 h-9 px-3 rounded-lg border-[1.5px] border-[#e6e6e2] text-[13px] font-mono outline-none focus:border-[#111110] transition-colors placeholder:text-[#c0c0bb]"
                />
                <button
                  onClick={handleMaxRedeem}
                  className="h-9 px-3 rounded-lg border-[1.5px] border-[#e6e6e2] text-[12px] text-[#6b6b68] hover:bg-[#f6f6f4] transition-colors whitespace-nowrap"
                >
                  Tối đa
                </button>
                <button
                  onClick={handleApplyRedeem}
                  disabled={!inputVal || parseInt(inputVal) <= 0}
                  className="h-9 px-3 rounded-lg bg-[#111110] text-white text-[12px] font-semibold hover:bg-[#2a2a28] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Dùng
                </button>
              </div>
            )}

            {maxRedeemable === 0 && (
              <p className="text-[11.5px] text-[#a8a8a3] text-center py-1">
                Khách không đủ điểm để dùng
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsPanel;