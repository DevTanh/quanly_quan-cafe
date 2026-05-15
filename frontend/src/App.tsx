import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
import Navbar from './components/layout/Navbar';
import type { NavPage, SubPage } from './components/layout/Navbar';
import Dashboard    from './components/dashboard/Dashboard';
import Products     from './components/products/Products';
import StockCheck   from './components/products/StockCheck';
import Tables       from './components/tables/Tables';
import Transactions from './components/transactions/Transactions';
import Employees    from './components/employees/Employees';
import WorkSchedule from './components/shifts/WorkSchedule';
import Attendance   from './components/shifts/Attendance';
import Login        from './components/auth/Login';
import CashierPOS   from './components/cashier/CashierPOS';
import { can }      from './rbac/permissions';
import './App.css';

const DEFAULT_COLOR = '#16a34a';

const Forbidden: React.FC = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '60vh', gap: 12, color: '#9ca3af',
    fontFamily: 'Segoe UI, sans-serif',
  }}>
    <span style={{ fontSize: 48 }}>🔒</span>
    <p style={{ fontSize: 16, fontWeight: 600 }}>Bạn không có quyền truy cập trang này.</p>
  </div>
);

const WIP: React.FC<{ name: string }> = ({ name }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontFamily: 'Segoe UI, sans-serif' }}>
    <p style={{ fontSize: 16 }}>Trang <strong>{name}</strong> đang được phát triển.</p>
  </div>
);

const AppShell: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const [activePage,   setActivePage]   = useState<NavPage>('Tổng quan');
  const [subPage,      setSubPage]      = useState<SubPage | null>(null);
  const [navColor,     setNavColor]     = useState<string>(
    () => localStorage.getItem('navColor') || DEFAULT_COLOR
  );

  const handleColorChange = (color: string) => {
    setNavColor(color);
    localStorage.setItem('navColor', color);
  };

  const handleNavigate = (page: NavPage, sub?: SubPage) => {
    setActivePage(page);
    setSubPage(sub ?? null);
  };

  const renderPage = () => {
    // ── Thu ngân (Xử lý như một page thay vì overlay) ──
    if (activePage === ('Thu ngân' as NavPage)) {
      return <CashierPOS />;
    }

    /* ── Hàng hóa ── */
    if (activePage === 'Hàng hóa') {
      if (!can(role, 'product:view')) return <Forbidden />;
      if (subPage === 'Kiểm kho') return <StockCheck />;
      return <Products />;
    }

    /* ── Phòng/Bàn ── */
    if (activePage === 'Phòng/Bàn') {
      if (!can(role, 'table:view')) return <Forbidden />;
      if (subPage === 'Gọi món qua mã QR') return <WIP name="Gọi món qua mã QR" />;
      return <Tables />;
    }

    /* ── Nhân viên ── */
    if (activePage === 'Nhân viên') {
      if (!can(role, 'user:view_list')) return <Forbidden />;
      if (subPage === 'Lịch làm việc')  return <WorkSchedule />;
      if (subPage === 'Bảng chấm công') return <Attendance />;
      return <Employees />;
    }

    /* ── Các trang khác ── */
    switch (activePage) {
      case 'Tổng quan': return <Dashboard />;
      case 'Giao dịch': return can(role, 'order:view_all') ? <Transactions /> : <Forbidden />;
      case 'Báo cáo':   return <WIP name="Báo cáo" />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Header navColor={navColor} onColorChange={handleColorChange} />
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        navColor={navColor}
        userRole={role}
      />

      <main className="content-area">
        {renderPage()}
      </main>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const [navColor] = useState<string>(
    () => localStorage.getItem('navColor') || DEFAULT_COLOR
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'Segoe UI, sans-serif', color: '#9ca3af',
      }}>
        <span>Đang tải...</span>
      </div>
    );
  }

  if (!user) return <Login navColor={navColor} />;
  return <AppShell />;
};

const App: React.FC = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;