// src/components/layout/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie, faBoxes, faChair, faExchangeAlt,
  faUsers, faChartBar, faTag, faChevronDown,
  faUserFriends, faCoffee,
} from '@fortawesome/free-solid-svg-icons';

/* ── Types ── */
interface SubItemDef { label: string; to: string; badge?: string; }
interface NavItemDef {
  label: string;
  to: string;
  icon: any;
  permission: string;
  subItems?: SubItemDef[];
}

/* ── Per-role permissions ── */
const NAV_PERMISSIONS: Record<string, string[]> = {
  admin: ['dashboard', 'products', 'tables', 'transactions', 'employees', 'reports', 'customers', 'barista'],
  manager: ['dashboard', 'products', 'tables', 'transactions', 'employees', 'reports', 'customers', 'barista'],
  cashier: ['dashboard', 'tables', 'transactions'],
  staff: ['dashboard', 'tables'],
  barista: ['dashboard', 'barista'],
};
const canSee = (role: string, p: string) => (NAV_PERMISSIONS[role] ?? []).includes(p);

/* ── Nav structure ── */
const NAV_ITEMS: NavItemDef[] = [
  {
    label: 'Tổng quan', to: '/', icon: faChartPie, permission: 'dashboard',
  },
  {
    label: 'Hàng hóa', to: '/products', icon: faBoxes, permission: 'products',
    subItems: [
      { label: 'Danh sách', to: '/products' },
      { label: 'Kiểm kho', to: '/products/stock-check' },
    ],
  },
  {
    label: 'Phòng/Bàn', to: '/tables', icon: faChair, permission: 'tables',
  },
  {
    label: 'Giao dịch', to: '/transactions', icon: faExchangeAlt, permission: 'transactions',
  },
  {
    label: 'Khách hàng', to: '/customers', icon: faUserFriends, permission: 'customers',
  },
  {
    label: 'Nhân viên', to: '/employees', icon: faUsers, permission: 'employees',
    subItems: [
      { label: 'Danh sách nhân viên', to: '/employees' },
      { label: 'Lịch làm việc', to: '/employees/schedule' },
      { label: 'Bảng chấm công', to: '/employees/attendance' },
    ],
  },
  {
    label: 'Báo cáo', to: '/reports', icon: faChartBar, permission: 'reports',
  },
  {
    label: 'Pha chế', to: '/barista', icon: faCoffee, permission: 'barista',
  },
];

/* ── Props ── */
interface NavbarProps { navColor: string; userRole: string; }

const Navbar: React.FC<NavbarProps> = ({ navColor, userRole }) => {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const visibleItems = NAV_ITEMS.filter(item => canSee(userRole, item.permission));

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTopClick = (item: NavItemDef, e: React.MouseEvent) => {
    e.preventDefault();
    if (item.subItems) {
      setOpenDropdown(openDropdown === item.label ? null : item.label);
    } else {
      setOpenDropdown(null);
      navigate(item.to);
    }
  };

  const handleSubClick = (to: string) => {
    setOpenDropdown(null);
    navigate(to);
  };

  return (
    <nav
      ref={navRef}
      className="flex items-center justify-between px-[50px] h-11 transition-all duration-300"
      style={{ background: navColor }}
    >
      <ul className="flex items-center list-none m-0 p-0">
        {visibleItems.map(item => {
          const isOpen = openDropdown === item.label;
          return (
            <li key={item.label} className="relative">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={e => handleTopClick(item, e)}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 h-11 text-[13.5px] font-medium no-underline whitespace-nowrap transition-colors border-b-[3px] ${isActive
                    ? 'text-white bg-white/15 border-white font-semibold'
                    : 'text-white/90 border-transparent hover:bg-white/12 hover:text-white'
                  }`
                }
              >
                <FontAwesomeIcon icon={item.icon} className="text-xs opacity-85" />
                <span>{item.label}</span>
                {item.subItems && (
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[9px] ml-1 opacity-80 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </NavLink>

              {item.subItems && isOpen && (
                <ul className="absolute top-full left-0 bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] list-none m-0 mt-0.5 py-1 z-[200]">
                  {item.subItems.map(sub => (
                    <li key={sub.to}>
                      <NavLink
                        to={sub.to}
                        end
                        onClick={() => handleSubClick(sub.to)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-4 py-2.5 text-[13.5px] no-underline transition-colors ${isActive ? 'text-gray-900 bg-gray-100 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                          }`
                        }
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
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Right: Thu ngân button */}
      <div className="flex items-center gap-1">
        <button
          title="Thu ngân (F9)"
          onClick={() => navigate('/cashier')}
          className="w-[34px] h-[34px] border-2 border-white/40 bg-transparent rounded-md cursor-pointer text-white text-sm flex items-center justify-center hover:bg-white/20 hover:border-white/70 transition-all"
        >
          <FontAwesomeIcon icon={faTag} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;