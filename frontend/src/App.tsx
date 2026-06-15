// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast, registerToastEmitter } from './context/ToastContext';
import Header from './components/layout/Header';
import Navbar from './components/layout/Navbar';
import Dashboard from './components/dashboard/Dashboard';
import Products from './components/products/Products';
import StockCheck from './components/products/StockCheck';
import Tables from './components/tables/Tables';
import Transactions from './components/transactions/Transactions';
import Employees from './components/employees/Employees';
import WorkSchedule from './components/shifts/WorkSchedule';
import Attendance from './components/shifts/Attendance';
import Login from './components/auth/Login';
import CashierPOS from './components/cashier/CashierPOS';
import Reports from './components/reports/Reports';
import Customers from './components/customers/Customers';
import BaristaQueue from './components/barista/BaristaQueue';
import RolePermissions from './components/settings/RolePermissions';
import AuthDevices from './components/settings/AuthDevices';
import LowStockWidget from './components/ui/LowStockWidget';
import { can } from './rbac/permissions';
import './App.css';

const DEFAULT_COLOR = '#16a34a';

/* ── Static UI helpers ── */
const Forbidden: React.FC = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '60vh', gap: 12,
    color: '#9ca3af', fontFamily: 'Segoe UI, sans-serif',
  }}>
    <span style={{ fontSize: 48 }}>🔒</span>
    <p style={{ fontSize: 16, fontWeight: 600 }}>Bạn không có quyền truy cập trang này.</p>
  </div>
);

/* ── Toast emitter bridge ── */
const ToastBridge: React.FC = () => {
  const toast = useToast();
  useEffect(() => {
    registerToastEmitter((type, message) => { toast[type](message); });
  }, [toast]);
  return null;
};

/* ── Permission guard ── */
const Guard: React.FC<{ permission: string; children: React.ReactNode }> = ({ permission, children }) => {
  const { user } = useAuth();
  return can(user?.role ?? '', permission) ? <>{children}</> : <Forbidden />;
};

/* ════════════════════════════════════════════════════════════════ */
const AppShell: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const [navColor, setNavColor] = useState<string>(
    () => localStorage.getItem('navColor') || DEFAULT_COLOR,
  );

  const handleColorChange = (color: string) => {
    setNavColor(color);
    localStorage.setItem('navColor', color);
  };

  const isAdminOrManager = role === 'admin' || role === 'manager';

  return (
    <div className="app">
      <Header navColor={navColor} onColorChange={handleColorChange} />
      <Navbar navColor={navColor} userRole={role} />

      <main className="content-area">
        <Routes>
          {/* ── Dashboard ── */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* ── Hàng hóa ── */}
          <Route path="/products" element={<Guard permission="product:view"><Products /></Guard>} />
          <Route path="/products/stock-check" element={<Guard permission="product:view"><StockCheck /></Guard>} />

          {/* ── Phòng/Bàn ── */}
          <Route path="/tables" element={<Guard permission="table:view"><Tables /></Guard>} />

          {/* ── Giao dịch ── */}
          <Route path="/transactions" element={<Guard permission="order:view_all"><Transactions /></Guard>} />

          {/* ── Nhân viên ── */}
          <Route path="/employees" element={<Guard permission="user:view_list"><Employees /></Guard>} />
          <Route path="/employees/schedule" element={<Guard permission="user:view_list"><WorkSchedule /></Guard>} />
          <Route path="/employees/attendance" element={<Guard permission="user:view_list"><Attendance /></Guard>} />

          {/* ── Báo cáo ── */}
          <Route path="/reports" element={<Guard permission="report:view_daily"><Reports /></Guard>} />

          {/* ── Thu ngân (mọi role có quyền cashier đều dùng được) ── */}
          <Route path="/cashier" element={<CashierPOS />} />

          {/* ── Khách hàng — mới ── */}
          <Route
            path="/customers"
            element={<Guard permission="user:view_list"><Customers /></Guard>}
          />

          {/* ── Barista — mới ── */}
          <Route path="/barista" element={<BaristaQueue />} />

          {/* ── Cài đặt ── */}
          <Route path="/settings/permissions" element={<Guard permission="system:config"><RolePermissions /></Guard>} />
          <Route path="/settings/devices" element={<Guard permission="auth:view_devices"><AuthDevices /></Guard>} />
          <Route path="/settings" element={<Guard permission="system:config"><RolePermissions /></Guard>} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isAdminOrManager && <LowStockWidget floating />}
    </div>
  );
};

/* ── Auth Gate ── */
const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const [navColor] = useState<string>(
    () => localStorage.getItem('navColor') || DEFAULT_COLOR,
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

/* ── Root ── */
const App: React.FC = () => (
  <ToastProvider>
    <ToastBridge />
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </ToastProvider>
);

export default App;