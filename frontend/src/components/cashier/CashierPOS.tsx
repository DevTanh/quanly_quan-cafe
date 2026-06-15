// src/components/cashier/CashierPOS.tsx
import React from 'react';
import { useCashier } from './hooks/useCashier';
import TableGrid from './components/TableGrid';
import OrderPanel from './components/OrderPanel';
import PaymentModal from './components/PaymentModal';
import TransferTableModal from './components/TransferTableModal';
import MergeTableModal from './components/MergeTableModal';
import ToastStack from './components/ToastStack';
import { ErrorState } from '../ui';

const CashierPOS: React.FC = () => {
  const cashier = useCashier();

  if (cashier.errorZones) {
    return (
      <ErrorState
        message={cashier.errorZones}
        onRetry={cashier.loadZones}
        className="h-[calc(100vh-88px)]"
      />
    );
  }

  return (
    <>
      {/* ── Main layout ── */}
      <div className="flex h-[calc(100vh-88px)] bg-[#f6f6f4] overflow-hidden font-['DM_Sans',sans-serif]">
        <TableGrid
          zones={cashier.zones}
          loadingZones={cashier.loadingZones}
          activeZoneId={cashier.activeZoneId}
          setActiveZoneId={cashier.setActiveZoneId}
          filterStatus={cashier.filterStatus}
          setFilterStatus={cashier.setFilterStatus}
          pagedTables={cashier.pagedTables}
          zoneTables={cashier.zoneTables}
          totalActive={cashier.totalActive}
          totalOcc={cashier.totalOcc}
          occupied={cashier.occupied}
          selectedTable={cashier.selectedTable}
          selectTable={cashier.selectTable}
          page={cashier.page}
          setPage={cashier.setPage}
          totalPages={cashier.totalPages}
        />

        <OrderPanel
          selectedTable={cashier.selectedTable}
          orderItems={cashier.orderItems}
          occupied={cashier.occupied}
          showMenu={cashier.showMenu}
          handleOpenMenu={cashier.handleOpenMenu}
          filteredMenu={cashier.filteredMenu}
          loadingMenu={cashier.loadingMenu}
          menuFetched={cashier.menuFetched}
          searchMenu={cashier.searchMenu}
          setSearchMenu={cashier.setSearchMenu}
          searchCategory={cashier.searchCategory}
          setSearchCategory={cashier.setSearchCategory}
          categories={cashier.categories}
          addItem={cashier.addItem}
          changeQty={cashier.changeQty}
          updateItemNote={cashier.updateItemNote}
          subtotal={cashier.subtotal}
          vat={cashier.vat}
          total={cashier.total}
          handleOpenPaymentModal={cashier.handleOpenPaymentModal}
          handleSendToBar={cashier.handleSendToBar}
          handleOpenTransfer={cashier.handleOpenTransfer}
          handleOpenMerge={cashier.handleOpenMerge}
          handleCancelOrder={cashier.handleCancelOrder}
          paying={cashier.paying}
          activeOrder={cashier.activeOrder}
          paymentModal={cashier.paymentModal}
          setPaymentModal={cashier.setPaymentModal}
        />
      </div>

      {/* ── Modals (rendered outside flex to avoid clip) ── */}

      <PaymentModal
        modal={cashier.paymentModal}
        paying={cashier.paying}
        onClose={cashier.handleClosePaymentModal}
        onConfirm={cashier.handleConfirmPayment}
        onCancelQr={cashier.handleCancelQr}
        onMethodChange={method =>
          cashier.setPaymentModal(m => ({
            ...m,
            method,
            qrCode: null,
            pollingStatus: 'idle',
          }))
        }
        onReceivedChange={amount =>
          cashier.setPaymentModal(m => ({ ...m, receivedAmount: amount }))
        }
        onDiscountChange={(value, type, grossTotal) => {
          const discountAmt = type === 'percent'
            ? Math.round(grossTotal * (Math.min(value, 100) / 100))
            : Math.min(value, grossTotal);
          const newTotal = Math.max(0, grossTotal - discountAmt);
          cashier.setPaymentModal(m => ({
            ...m,
            discount: discountAmt,
            discountType: type,
            total: newTotal,
            receivedAmount: m.method === 'cash' ? newTotal : m.receivedAmount,
          }));
        }}
      />

      <TransferTableModal
        modal={cashier.transferModal}
        allTables={cashier.allTables}
        occupied={cashier.occupied}
        paying={cashier.paying}
        onTransfer={cashier.handleTransferToTable}
        onClose={cashier.handleCloseTransfer}
      />

      <MergeTableModal
        modal={cashier.mergeModal}
        allTables={cashier.allTables}
        occupied={cashier.occupied}
        paying={cashier.paying}
        onMerge={cashier.handleMergeWithTable}
        onClose={cashier.handleCloseMerge}
      />

      {/* ── Toast notifications ── */}
      <ToastStack
        toasts={cashier.toasts}
        onRemove={cashier.removeToast}
      />
    </>
  );
};

export default CashierPOS;