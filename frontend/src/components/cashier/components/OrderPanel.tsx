import React from 'react';
import type { SelectedTable, CartItem, FlatTable } from '../hooks/useCashier';
import type { MenuItem } from '../../../types/cashier.types';
import { fmt } from '../hooks/useCashier';
import MenuPanel from './MenuPanel';
import OrderList from './OrderList';

interface Props {
  selectedTable: SelectedTable | null;
  orderItems: CartItem[];
  occupied: Set<number>;
  showMenu: boolean;
  handleOpenMenu: () => void;
  filteredMenu: MenuItem[];
  loadingMenu: boolean;
  menuFetched: boolean;
  searchMenu: string;
  setSearchMenu: (v: string) => void;
  addItem: (item: MenuItem) => void;
  changeQty: (id: string, delta: number) => void;
  subtotal: number;
  vat: number;
  total: number;
  handlePay: () => void;
}

const OrderPanel: React.FC<Props> = ({
  selectedTable, orderItems, occupied,
  showMenu, handleOpenMenu,
  filteredMenu, loadingMenu, menuFetched, searchMenu, setSearchMenu,
  addItem, changeQty,
  subtotal, vat, total, handlePay,
}) => {
  const isSpecial = selectedTable && 'special' in selectedTable;
  const isOccupied = !isSpecial && selectedTable
    ? occupied.has(Number((selectedTable as FlatTable).id))
    : false;

  return (
    <div className="w-[356px] shrink-0 bg-white border-l border-[#e6e6e2] flex flex-col overflow-hidden">

      {/* Customer search (placeholder) */}
      <div className="px-[14px] py-[10px] border-b border-[#e6e6e2] shrink-0">
        <div className="flex items-center gap-2 h-[38px] px-3 border-[1.5px] border-[#e6e6e2] rounded-lg bg-[#f6f6f4] text-[#a8a8a3] text-[13px] cursor-text">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="6" cy="6" r="4.5"/><path d="M10 10l2.5 2.5" strokeLinecap="round"/>
          </svg>
          Tìm khách hàng
          <span className="ml-auto font-mono text-[11px] opacity-55">F4</span>
        </div>
      </div>

      {/* Table label */}
      <div className="flex items-center gap-2 px-[14px] py-[9px] border-b border-[#e6e6e2] shrink-0 min-h-[44px]">
        {selectedTable ? (
          <>
            <div className="w-[7px] h-[7px] rounded-full bg-[#111110] shrink-0" />
            <span className="text-[14px] font-semibold text-[#111110] tracking-[-0.02em]">
              {selectedTable.name}
            </span>
            {!isSpecial && (
              <span className="text-[12px] text-[#a8a8a3]">
                {isOccupied ? '· Đang có khách' : '· Còn trống'}
              </span>
            )}
            <button
              onClick={handleOpenMenu}
              className={[
                'ml-auto text-[12.5px] font-semibold text-[#111110] border-[1.5px] border-[#e6e6e2] rounded-md px-[10px] py-[3px] cursor-pointer transition-all tracking-[-0.01em]',
                showMenu ? 'bg-[#f6f6f4]' : 'bg-transparent hover:bg-[#f6f6f4]',
              ].join(' ')}
            >
              {showMenu ? 'Ẩn' : '+ Thêm món'}
            </button>
          </>
        ) : (
          <span className="text-[13px] text-[#a8a8a3]">Chưa chọn bàn</span>
        )}
      </div>

      {/* Menu panel */}
      {showMenu && selectedTable && (
        <MenuPanel
          loading={loadingMenu}
          menuFetched={menuFetched}
          filteredMenu={filteredMenu}
          searchMenu={searchMenu}
          setSearchMenu={setSearchMenu}
          onAddItem={addItem}
        />
      )}

      {/* Order list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#cacac4]">
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full gap-2.5 text-[#a8a8a3]">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect x="4" y="10" width="36" height="26" rx="5" stroke="#cacac4" strokeWidth="1.8"/>
              <path d="M13 10V8a2 2 0 012-2h14a2 2 0 012 2v2" stroke="#cacac4" strokeWidth="1.8"/>
              <path d="M16 22h12M16 28h8" stroke="#cacac4" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p className="text-[13px] text-center leading-[1.7]">
              Chọn bàn để bắt đầu<br/>
              <span className="text-[12px]">Chọn bàn bên trái</span>
            </p>
          </div>
        ) : (
          <OrderList
            orderItems={orderItems}
            onChangeQty={changeQty}
            onOpenMenu={handleOpenMenu}
          />
        )}
      </div>

      {/* Summary */}
      {orderItems.length > 0 && (
        <div className="px-[14px] py-3 border-t border-[#e6e6e2] shrink-0">
          {[['Tạm tính', fmt(subtotal)], ['VAT (8%)', fmt(vat)]].map(([l, v]) => (
            <div key={l} className="flex justify-between mb-[5px]">
              <span className="text-[12.5px] text-[#a8a8a3]">{l}</span>
              <span className="font-mono text-[12.5px] text-[#6b6b68]">{v}</span>
            </div>
          ))}
          <div className="h-px bg-[#e6e6e2] my-2" />
          <div className="flex justify-between items-baseline">
            <span className="text-[13px] font-semibold text-[#111110] tracking-[-0.015em]">Tổng tiền</span>
            <span className="font-mono text-[19px] font-semibold text-[#111110] tracking-[-0.03em]">{fmt(total)}</span>
          </div>
        </div>
      )}

      {/* Pay actions */}
      <div className="flex gap-2 px-[14px] pt-[10px] pb-[14px] border-t border-[#e6e6e2] shrink-0">
        <button className="flex-1 flex items-center justify-center gap-[7px] h-[46px] rounded-[10px] text-[13.5px] font-semibold text-[#6b6b68] border-[1.5px] border-[#e6e6e2] bg-transparent cursor-pointer transition-all hover:border-[#cacac4] hover:text-[#111110]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2h2l2.4 9h6l1.6-6H5"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/>
          </svg>
          Thông báo
        </button>

        <button
          className="flex-[1.6] flex items-center justify-center gap-[7px] h-[46px] rounded-[10px] text-[13.5px] font-semibold text-white bg-[#111110] cursor-pointer border-none transition-all hover:bg-[#2c2c2a] hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(0,0,0,.22)] disabled:bg-[#d0d0cc] disabled:cursor-not-allowed disabled:text-[#a0a09c] disabled:translate-y-0 disabled:shadow-none"
          disabled={orderItems.length === 0}
          onClick={handlePay}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="1" y="4" width="14" height="10" rx="2"/><path d="M1 7h14M4 11h2"/>
          </svg>
          Thanh toán
          <span className="font-mono text-[11px] opacity-60">F9</span>
        </button>
      </div>
    </div>
  );
};

export default OrderPanel;
