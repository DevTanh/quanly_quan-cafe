// src/components/cashier/components/OrderList.tsx
import React, { useState } from 'react';
import type { CartItem } from '../hooks/useCashier';
import { fmt } from '../hooks/useCashier';

interface Props {
  orderItems: CartItem[];
  onChangeQty: (id: string, delta: number) => void;
  onUpdateNote: (id: string, note: string) => void;
  onOpenMenu: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: 'Mới', color: 'bg-[#f0f0ee] text-[#6b6b68]' },
  sent: { label: 'Đã gửi', color: 'bg-[#fef3c7] text-[#b45309]' },
  done: { label: 'Xong', color: 'bg-[#dcfce7] text-[#166534]' },
  cancelled: { label: 'Hủy', color: 'bg-[#fee2e2] text-[#991b1b]' },
};

const OrderList: React.FC<Props> = ({ orderItems, onChangeQty, onUpdateNote, onOpenMenu }) => {
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  if (orderItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2.5 text-[#a8a8a3]">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="4" y="10" width="36" height="26" rx="5" stroke="#cacac4" strokeWidth="1.8" />
          <path d="M13 10V8a2 2 0 012-2h14a2 2 0 012 2v2" stroke="#cacac4" strokeWidth="1.8" />
          <path d="M16 22h12M16 28h8" stroke="#cacac4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <p className="text-[13px] text-center leading-[1.7]">
          Chưa có món nào
          <br />
          <button
            onClick={onOpenMenu}
            className="text-[12px] text-[#111110] underline bg-none border-none cursor-pointer p-0"
          >
            Thêm món →
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="px-[14px] pt-0.5 pb-2">
      {orderItems.map((item, i) => {
        const status = item.itemStatus ? STATUS_MAP[item.itemStatus] : null;
        const isSentOrDone = item.itemStatus === 'sent' || item.itemStatus === 'done';
        const isNoteOpen = expandedNote === item.id;

        return (
          <div key={item.id + i} className="py-[9px] border-b border-[#f0f0ee] last:border-b-0">
            {/* Main row */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[#c0c0bb] w-[16px] text-center shrink-0">
                {i + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium text-[#111110] tracking-[-0.01em] truncate">
                    {item.name}
                  </p>
                  {status && (
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11.5px] text-[#a8a8a3] mt-0.5">
                  {fmt(item.price)}
                </p>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-1">
                <button
                  disabled={isSentOrDone}
                  className="w-[24px] h-[24px] rounded-md border-[1.5px] border-[#e6e6e2] bg-transparent text-[#6b6b68] cursor-pointer text-sm flex items-center justify-center transition-all hover:border-[#cacac4] hover:text-[#111110] hover:bg-[#f6f6f4] disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => onChangeQty(item.id, -1)}
                >−</button>
                <span className="w-5 text-center font-mono text-[13px] font-medium text-[#111110]">
                  {item.qty}
                </span>
                <button
                  disabled={isSentOrDone}
                  className="w-[24px] h-[24px] rounded-md border-[1.5px] border-[#e6e6e2] bg-transparent text-[#6b6b68] cursor-pointer text-sm flex items-center justify-center transition-all hover:border-[#cacac4] hover:text-[#111110] hover:bg-[#f6f6f4] disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => onChangeQty(item.id, 1)}
                >+</button>
              </div>

              {/* Line total */}
              <span className="font-mono text-[12.5px] font-medium text-[#111110] w-[68px] text-right shrink-0 tracking-[-0.02em]">
                {fmt(item.price * item.qty)}
              </span>

              {/* Note toggle */}
              <button
                onClick={() => setExpandedNote(isNoteOpen ? null : item.id)}
                title={item.note ? `Ghi chú: ${item.note}` : 'Thêm ghi chú'}
                className={[
                  'w-[22px] h-[22px] shrink-0 flex items-center justify-center rounded transition-colors',
                  item.note
                    ? 'text-[#b45309]'
                    : 'text-[#c0c0bb] hover:text-[#6b6b68]',
                ].join(' ')}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 2h10v8H8l-2 2-2-1V2z" />
                </svg>
              </button>
            </div>

            {/* Note input (expandable) */}
            {isNoteOpen && (
              <div className="mt-1.5 ml-[22px]">
                <input
                  type="text"
                  autoFocus
                  value={item.note ?? ''}
                  onChange={e => onUpdateNote(item.id, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setExpandedNote(null)}
                  placeholder="Ghi chú món (ít đường, không đá...)"
                  className="w-full h-7 px-2.5 text-[12px] rounded-md border-[1.5px] border-[#e6e6e2] outline-none focus:border-[#111110] bg-[#fafafa] text-[#111110] placeholder:text-[#c0c0bb]"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderList;