// src/components/cashier/components/OrderPanel.tsx
import React from 'react';
import type { SelectedTable, CartItem, FlatTable, PaymentModalState } from '../hooks/useCashier';
import type { MenuItem } from '../../../types/cashier.types';
import type { Order } from '../../../types';
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
  searchCategory: string;
  setSearchCategory: (v: string) => void;
  categories: string[];
  addItem: (item: MenuItem) => void;
  changeQty: (id: string, delta: number) => void;
  updateItemNote: (id: string, note: string) => void;
  subtotal: number;
  vat: number;
  total: number;
  handleOpenPaymentModal: () => void;
  handleSendToBar: () => void;
  handleOpenTransfer: () => void;
  handleOpenMerge: () => void;
  handleCancelOrder: () => void;
  paying: boolean;
  activeOrder: Order | null;
  paymentModal: PaymentModalState;
  setPaymentModal: React.Dispatch<React.SetStateAction<PaymentModalState>>;
}

const OrderPanel: React.FC<Props> = ({
  selectedTable, orderItems, occupied,
  showMenu, handleOpenMenu,
  filteredMenu, loadingMenu, menuFetched, searchMenu, setSearchMenu,
  searchCategory, setSearchCategory, categories,
  addItem, changeQty, updateItemNote,
  subtotal, vat, total,
  handleOpenPaymentModal, handleSendToBar,
  handleOpenTransfer, handleOpenMerge, handleCancelOrder,
  paying, activeOrder, paymentModal, setPaymentModal,
}) => {
  const isSpecial = selectedTable && 'special' in selectedTable;
  const isOccupied = !isSpecial && selectedTable
    ? occupied.has(Number((selectedTable as FlatTable).id))
    : false;
  const hasItems = orderItems.length > 0;
  const hasSentItems = orderItems.some(i => i.itemStatus === 'sent' || i.itemStatus === 'done');

  return (
    <div className="w-[360px] shrink-0 bg-white border-l border-[#e6e6e2] flex flex-col overflow-hidden">

      {/* ── Table label + actions ── */}
      <div className="flex items-center gap-2 px-[14px] py-[9px] border-b border-[#e6e6e2] shrink-0 min-h-[48px] bg-white">
        {selectedTable ? (
          <>
            <div className={[
              'w-2 h-2 rounded-full shrink-0',
              isOccupied ? 'bg-green-500' : 'bg-[#d0d0cc]',
            ].join(' ')} />
            <div className="flex-1 min-w-0">
              <span className="text-[14px] font-semibold text-[#111110] tracking-[-0.02em]">
                {selectedTable.name}
              </span>
              {!isSpecial && (
                <span className="text-[11.5px] text-[#a8a8a3] ml-1.5">
                  {isOccupied ? '· Đang có khách' : '· Còn trống'}
                </span>
              )}
              {activeOrder && (
                <span className="ml-1.5 text-[11px] text-[#a8a8a3] font-mono">
                  #{activeOrder.id}
                </span>
              )}
            </div>

            {/* Context actions */}
            {activeOrder && !isSpecial && (
              <div className="flex items-center gap-1">
                {/* Transfer */}
                <button
                  onClick={handleOpenTransfer}
                  title="Chuyển bàn"
                  className="w-7 h-7 flex items-center justify-center rounded-md border-[1.5px] border-[#e6e6e2] text-[#6b6b68] hover:border-[#cacac4] hover:text-[#111110] transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 7h10M8 3l4 4-4 4" />
                  </svg>
                </button>
                {/* Merge */}
                <button
                  onClick={handleOpenMerge}
                  title="Gộp bàn"
                  className="w-7 h-7 flex items-center justify-center rounded-md border-[1.5px] border-[#e6e6e2] text-[#6b6b68] hover:border-[#cacac4] hover:text-[#111110] transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 7h5M8 7h5M7 2v10" />
                  </svg>
                </button>
                {/* Cancel order */}
                <button
                  onClick={handleCancelOrder}
                  title="Hủy đơn"
                  className="w-7 h-7 flex items-center justify-center rounded-md border-[1.5px] border-[#e6e6e2] text-[#a8a8a3] hover:border-red-200 hover:text-red-500 transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12" />
                  </svg>
                </button>
              </div>
            )}

            <button
              onClick={handleOpenMenu}
              className={[
                'ml-1 text-[12px] font-semibold text-[#111110] border-[1.5px] border-[#e6e6e2] rounded-lg px-[10px] py-[4px] cursor-pointer transition-all tracking-[-0.01em] shrink-0',
                showMenu ? 'bg-[#111110] text-white border-[#111110]' : 'bg-transparent hover:bg-[#f6f6f4]',
              ].join(' ')}
            >
              {showMenu ? '✕ Đóng' : '+ Thêm món'}
            </button>
          </>
        ) : (
          <span className="text-[13px] text-[#a8a8a3]">Chưa chọn bàn</span>
        )}
      </div>

      {/* ── Menu panel ── */}
      {showMenu && selectedTable && (
        <MenuPanel
          loading={loadingMenu}
          menuFetched={menuFetched}
          filteredMenu={filteredMenu}
          searchMenu={searchMenu}
          setSearchMenu={setSearchMenu}
          searchCategory={searchCategory}
          setSearchCategory={setSearchCategory}
          categories={categories}
          onAddItem={addItem}
          onClose={handleOpenMenu}
        />
      )}

      {/* ── Order list ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#e0e0dc]">
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#a8a8a3]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="12" width="36" height="28" rx="6" stroke="#e0e0dc" strokeWidth="2" />
              <path d="M15 12V9a3 3 0 013-3h12a3 3 0 013 3v3" stroke="#e0e0dc" strokeWidth="2" />
              <path d="M17 26h14M17 32h10" stroke="#e0e0dc" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="text-center">
              <p className="text-[13.5px] font-medium text-[#6b6b68]">Chọn bàn để bắt đầu</p>
              <p className="text-[12px] text-[#a8a8a3] mt-0.5">Chọn bàn từ sơ đồ bên trái</p>
            </div>
          </div>
        ) : (
          <OrderList
            orderItems={orderItems}
            onChangeQty={changeQty}
            onUpdateNote={updateItemNote}
            onOpenMenu={handleOpenMenu}
          />
        )}
      </div>

      {/* ── Summary ── */}
      {hasItems && (
        <div className="px-[14px] pt-2.5 pb-2 border-t border-[#f0f0ee] shrink-0 bg-[#fafafa]">
          <div className="flex justify-between mb-[4px]">
            <span className="text-[12px] text-[#a8a8a3]">Tạm tính</span>
            <span className="font-mono text-[12px] text-[#6b6b68]">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between mb-[6px]">
            <span className="text-[12px] text-[#a8a8a3]">VAT (8%)</span>
            <span className="font-mono text-[12px] text-[#6b6b68]">{fmt(vat)}</span>
          </div>
          {paymentModal.discount > 0 && (
            <div className="flex justify-between mb-[6px]">
              <span className="text-[12px] text-green-600">Giảm giá</span>
              <span className="font-mono text-[12px] text-green-600">−{fmt(paymentModal.discount)}</span>
            </div>
          )}
          <div className="h-px bg-[#ebebea] my-1.5" />
          <div className="flex justify-between items-baseline">
            <span className="text-[13px] font-semibold text-[#111110]">Tổng tiền</span>
            <span className="font-mono text-[20px] font-bold text-[#111110] tracking-[-0.03em]">{fmt(total)}</span>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex flex-col gap-2 px-[14px] pt-2 pb-[14px] border-t border-[#e6e6e2] shrink-0">

        {/* Row 1: Print + Send bar */}
        <div className="flex gap-2">
          <button
            disabled={!hasItems || paying}
            className="flex-1 flex items-center justify-center gap-1.5 h-[36px] rounded-[8px] text-[12px] font-medium text-[#6b6b68] border-[1.5px] border-[#e6e6e2] bg-transparent cursor-pointer transition-all hover:border-[#cacac4] hover:text-[#111110] hover:bg-[#f6f6f4] disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h8v4H4zM2 8h12v6H2zM5 14v-3h6v3" />
            </svg>
            In phiếu
          </button>

          <button
            disabled={!hasItems || paying}
            onClick={handleSendToBar}
            title="Gửi xuống bar/bếp (chưa tính tiền)"
            className="flex-1 flex items-center justify-center gap-1.5 h-[36px] rounded-[8px] text-[12px] font-semibold text-[#92400e] border-[1.5px] border-[#fcd34d] bg-[#fffbeb] cursor-pointer transition-all hover:bg-[#fef3c7] hover:border-[#f59e0b] disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {paying ? (
              <span className="w-3 h-3 border-2 border-[#92400e] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v10M4 8l4 4 4-4" /><path d="M2 14h12" />
              </svg>
            )}
            Gửi bar
            {hasSentItems && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />}
          </button>
        </div>

        {/* Row 2: Pay (full width) */}
        <button
          className="flex items-center justify-center gap-2 h-[46px] rounded-[10px] text-[13.5px] font-semibold text-white bg-[#111110] cursor-pointer border-none transition-all hover:bg-[#2a2a28] hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(0,0,0,.2)] disabled:bg-[#d4d4d0] disabled:cursor-not-allowed disabled:text-[#a0a09c] disabled:translate-y-0 disabled:shadow-none"
          disabled={!hasItems || paying}
          onClick={handleOpenPaymentModal}
        >
          {paying ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="1" y="4" width="14" height="10" rx="2" /><path d="M1 7h14M4 11h2" />
              </svg>
              Thanh toán
              <span className="font-mono text-[11px] opacity-50 ml-1">F9</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OrderPanel;