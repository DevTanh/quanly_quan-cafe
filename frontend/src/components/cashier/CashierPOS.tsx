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
          selectedCustomer={cashier.selectedCustomer}
          onSelectCustomer={cashier.handleSelectCustomer}
        />
      </div>

      <PaymentModal
        modal={cashier.paymentModal}
        paying={cashier.paying}
        selectedCustomer={cashier.selectedCustomer}
        onClose={cashier.handleClosePaymentModal}
        onConfirm={cashier.handleConfirmPayment}
        onCancelQr={cashier.handleCancelQr}
        onMethodChange={method =>
          cashier.setPaymentModal(m => ({ ...m, method, qrCode: null, pollingStatus: 'idle' }))
        }
        onReceivedChange={amount =>
          cashier.setPaymentModal(m => ({ ...m, receivedAmount: amount }))
        }
        onDiscountChange={cashier.handleDiscountChange}
        onRedeemChange={cashier.handleRedeemChange}
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

      <ToastStack toasts={cashier.toasts} onRemove={cashier.removeToast} />
    </>
  );
};

export default CashierPOS;