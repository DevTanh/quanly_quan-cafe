import React from 'react';
import { useCashier } from './hooks/useCashier';
import TableGrid from './components/TableGrid';
import OrderPanel from './components/OrderPanel';
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
        addItem={cashier.addItem}
        changeQty={cashier.changeQty}
        subtotal={cashier.subtotal}
        vat={cashier.vat}
        total={cashier.total}
        handlePay={cashier.handlePay}
      />
    </div>
  );
};

export default CashierPOS;