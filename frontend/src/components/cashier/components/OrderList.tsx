import React from 'react';
import type { CartItem } from '../hooks/useCashier';
import { fmt } from '../hooks/useCashier';

interface Props {
  orderItems: CartItem[];
  onChangeQty: (id: string, delta: number) => void;
  onOpenMenu: () => void;
}

const OrderList: React.FC<Props> = ({ orderItems, onChangeQty, onOpenMenu }) => {
  if (orderItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2.5 text-[#a8a8a3]">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="4" y="10" width="36" height="26" rx="5" stroke="#cacac4" strokeWidth="1.8"/>
          <path d="M13 10V8a2 2 0 012-2h14a2 2 0 012 2v2" stroke="#cacac4" strokeWidth="1.8"/>
          <path d="M16 22h12M16 28h8" stroke="#cacac4" strokeWidth="1.8" strokeLinecap="round"/>
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
    <div className="px-[14px] pt-0.5">
      {orderItems.map((item, i) => (
        <div
          key={item.id}
          className="flex items-center gap-2.5 py-[10px] border-b border-[#e6e6e2] last:border-b-0"
        >
          <span className="font-mono text-[11.5px] text-[#a8a8a3] w-[18px] text-center shrink-0">
            {i + 1}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#111110] tracking-[-0.01em] truncate">
              {item.name}
            </p>
            <p className="font-mono text-[12px] text-[#a8a8a3] mt-0.5">
              {fmt(item.price)}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="w-[26px] h-[26px] rounded-md border-[1.5px] border-[#e6e6e2] bg-transparent text-[#6b6b68] cursor-pointer text-sm flex items-center justify-center transition-all hover:border-[#cacac4] hover:text-[#111110] hover:bg-[#f6f6f4]"
              onClick={() => onChangeQty(item.id, -1)}
            >−</button>
            <span className="w-6 text-center font-mono text-[13.5px] font-medium text-[#111110]">
              {item.qty}
            </span>
            <button
              className="w-[26px] h-[26px] rounded-md border-[1.5px] border-[#e6e6e2] bg-transparent text-[#6b6b68] cursor-pointer text-sm flex items-center justify-center transition-all hover:border-[#cacac4] hover:text-[#111110] hover:bg-[#f6f6f4]"
              onClick={() => onChangeQty(item.id, 1)}
            >+</button>
          </div>

          <span className="font-mono text-[13px] font-medium text-[#111110] w-[72px] text-right shrink-0 tracking-[-0.02em]">
            {fmt(item.price * item.qty)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default OrderList;
