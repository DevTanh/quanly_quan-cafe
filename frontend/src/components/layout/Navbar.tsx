import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie, faBoxes, faChair, faExchangeAlt,
  faUsers, faChartBar,
  // faFileInvoice,
  faTag, faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

/* ── Inline permissions (fix lỗi import) ── */
export type Permission =
  | 'dashboard:read'
  | 'products:read'
  | 'tables:read'
  | 'transactions:read'
  | 'employees:read'
  | 'reports:read';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ['dashboard:read', 'products:read', 'tables:read', 'transactions:read', 'employees:read', 'reports:read'],
  manager: ['dashboard:read', 'products:read', 'tables:read', 'transactions:read', 'employees:read', 'reports:read'],
  cashier: ['dashboard:read', 'tables:read', 'transactions:read'],
  staff: ['tables:read'],
};

export const can = (role: string, permission: Permission): boolean =>
  (ROLE_PERMISSIONS[role] ?? []).includes(permission);

/* ── Types ── */
export type NavPage =
  | 'Tổng quan' | 'Hàng hóa' | 'Phòng/Bàn' | 'Giao dịch'
  | 'Nhân viên' | 'Báo cáo';

export type SubPage =
  | 'Danh mục' | 'Kiểm kho'
  | 'Danh sách phòng bàn' | 'Gọi món qua mã QR'
  | 'Danh sách nhân viên' | 'Lịch làm việc' | 'Bảng chấm công';

interface NavItemDef {
  label: NavPage;
  icon: any;
  permission: Permission;
  subItems?: { label: SubPage; badge?: string }[];
}

const NAV_ITEMS: NavItemDef[] = [
  { label: 'Tổng quan', icon: faChartPie, permission: 'dashboard:read' },
  {
    label: 'Hàng hóa', icon: faBoxes, permission: 'products:read',
    subItems: [{ label: 'Danh mục' }, { label: 'Kiểm kho' }],
  },
  {
    label: 'Phòng/Bàn', icon: faChair, permission: 'tables:read',
    subItems: [{ label: 'Danh sách phòng bàn' }, { label: 'Gọi món qua mã QR', badge: 'Mới' }],
  },
  { label: 'Giao dịch', icon: faExchangeAlt, permission: 'transactions:read' },
  {
    label: 'Nhân viên', icon: faUsers, permission: 'employees:read',
    subItems: [
      { label: 'Danh sách nhân viên' },
      { label: 'Lịch làm việc' },
      { label: 'Bảng chấm công' },
    ],
  },
  { label: 'Báo cáo', icon: faChartBar, permission: 'reports:read' },
];

interface NavbarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage, sub?: SubPage) => void;
  onOpenBooking?: () => void;
  navColor: string;
  userRole: string;
  // onOpenCashier ← XOÁ DÒNG NÀY
}

const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  // onOpenBooking,
  navColor,
  userRole,
}) => {
  const [openDropdown, setOpenDropdown] = useState<NavPage | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const visibleItems = NAV_ITEMS.filter(item => can(userRole, item.permission));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNavClick = (item: NavItemDef, e: React.MouseEvent) => {
    e.preventDefault();
    if (item.subItems) {
      setOpenDropdown(openDropdown === item.label ? null : item.label);
    } else {
      setOpenDropdown(null);
      onNavigate(item.label);
    }
  };

  const handleSubClick = (e: React.MouseEvent, item: NavItemDef, sub: SubPage) => {
    e.preventDefault();
    setOpenDropdown(null);
    onNavigate(item.label, sub);
  };

  return (
    <nav
      ref={navRef}
      className="flex items-center justify-between px-[50px] h-11 transition-all duration-300"
      style={{ background: navColor }}
    >
      <ul className="flex items-center list-none m-0 p-0">
        {visibleItems.map(item => {
          const isActive = activePage === item.label;
          const isOpen = openDropdown === item.label;
          return (
            <li key={item.label} className="relative">
              <a
                href="#"
                className={`flex items-center gap-1.5 px-3.5 h-11 text-[13.5px] font-medium no-underline whitespace-nowrap transition-colors border-b-[3px] ${isActive
                  ? 'text-white bg-white/15 border-white font-semibold'
                  : 'text-white/90 border-transparent hover:bg-white/12 hover:text-white'
                  }`}
                onClick={e => handleNavClick(item, e)}
              >
                <FontAwesomeIcon icon={item.icon} className="text-xs opacity-85" />
                <span>{item.label}</span>
                {item.subItems && (
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[9px] ml-1 opacity-80 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </a>

              {item.subItems && isOpen && (
                <ul className="absolute top-full left-0 bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] list-none m-0 mt-0.5 py-1 z-[200]">
                  {item.subItems.map(sub => (
                    <li key={sub.label}>
                      <a
                        href="#"
                        className="flex items-center justify-between px-4 py-2.5 text-[13.5px] text-gray-700 no-underline hover:bg-gray-100 transition-colors"
                        onClick={e => handleSubClick(e, item, sub.label)}
                      >
                        {sub.label}
                        {sub.badge && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-xl"
                            style={{ color: navColor, background: `${navColor}22` }}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Right action buttons */}
      <div className="flex items-center gap-1">
        {/* Đặt bàn
        <button
          title="Đặt bàn"
          onClick={onOpenBooking}
          className="w-[34px] h-[34px] border-2 border-white/40 bg-transparent rounded-md cursor-pointer text-white text-sm flex items-center justify-center hover:bg-white/20 hover:border-white/70 transition-all"
        >
          <FontAwesomeIcon icon={faFileInvoice} />
        </button> */}

        {/* Thu ngân → mở CashierPOS */}
        <button
          title="Thu ngân"
          onClick={() => onNavigate('Thu ngân' as NavPage)}
          className="w-[34px] h-[34px] border-2 border-white/40 bg-transparent rounded-md cursor-pointer text-white text-sm flex items-center justify-center hover:bg-white/20 hover:border-white/70 transition-all"
        >
          <FontAwesomeIcon icon={faTag} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;