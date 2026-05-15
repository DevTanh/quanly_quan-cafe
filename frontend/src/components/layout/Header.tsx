import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot, faBell, faGear, faChevronDown, faFlag,
  faHeadset, faPalette, faBook, faPhone, faComments,
  faVideo, faCheck, faRightFromBracket,
  faShield, faCircleUser,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';

const THEME_COLORS = [
  { name: 'Xanh lá',   value: '#16a34a' },
  { name: 'Xanh dương', value: '#2563eb' },
  { name: 'Đỏ',        value: '#dc2626' },
  { name: 'Cam',       value: '#ea580c' },
  { name: 'Tím',       value: '#7c3aed' },
  { name: 'Xanh cyan', value: '#0891b2' },
];

const SUPPORT_ITEMS = [
  { icon: faBook,     label: 'Hướng dẫn sử dụng' },
  { icon: faPhone,    label: 'Hotline: 1900 6522' },
  { icon: faComments, label: 'Chat hỗ trợ trực tuyến' },
  { icon: faVideo,    label: 'Video hướng dẫn' },
];

interface HeaderProps {
  navColor: string;
  onColorChange: (color: string) => void;
}

const Header: React.FC<HeaderProps> = ({ navColor, onColorChange }) => {
  const { user, logout } = useAuth();

  const [showTheme,   setShowTheme]   = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showUser,    setShowUser]    = useState(false);

  const themeRef   = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);
  const userRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current   && !themeRef.current.contains(e.target as Node))   setShowTheme(false);
      if (supportRef.current && !supportRef.current.contains(e.target as Node)) setShowSupport(false);
      if (userRef.current    && !userRef.current.contains(e.target as Node))    setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeAll = () => { setShowTheme(false); setShowSupport(false); setShowUser(false); };

  const handleLogout = async () => {
    closeAll();
    await logout();
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()
    : 'U';

  const roleLabel: Record<string, string> = {
    admin:   'Quản trị viên',
    manager: 'Quản lý',
    staff:   'Nhân viên',
  };

  return (
    <header className="flex items-center justify-between bg-white px-4 h-12 border-b border-gray-200 shadow-sm sticky top-0 z-[100]">

      {/* Logo */}
      <div className="flex items-center gap-1.5 cursor-pointer">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base"
          style={{ background: `linear-gradient(135deg, ${navColor}, ${navColor}cc)` }}
        >K</span>
        <span className="text-lg font-bold" style={{ color: navColor }}>KiotViet</span>
      </div>

      {/* Top nav */}
      <nav className="flex items-center gap-1 flex-1 justify-center">

        {/* Chủ đề */}
        <div className="relative" ref={themeRef}>
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-100 transition-colors ${showTheme ? 'bg-gray-100' : ''}`}
            onClick={() => { setShowTheme(!showTheme); setShowSupport(false); setShowUser(false); }}
          >
            <FontAwesomeIcon icon={faPalette} style={{ color: navColor }} className="text-[13px]" />
            <span>Chủ đề</span>
            <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] text-gray-400 transition-transform ${showTheme ? 'rotate-180' : ''}`} />
          </button>

          {showTheme && (
            <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl z-[300] p-3.5 w-56 animate-[fadeDown_0.15s_ease]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Chọn màu giao diện</p>
              <div className="grid grid-cols-6 gap-1">
                {THEME_COLORS.map(c => (
                  <button
                    key={c.value}
                    title={c.name}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-transparent hover:border-black/20"
                    style={{ background: c.value }}
                    onClick={() => { onColorChange(c.value); setShowTheme(false); }}
                  >
                    {navColor === c.value && <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hỗ trợ */}
        <div className="relative" ref={supportRef}>
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-100 transition-colors ${showSupport ? 'bg-gray-100' : ''}`}
            onClick={() => { setShowSupport(!showSupport); setShowTheme(false); setShowUser(false); }}
          >
            <FontAwesomeIcon icon={faHeadset} className="text-[13px] text-gray-400" />
            <span>Hỗ trợ</span>
            <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] text-gray-400 transition-transform ${showSupport ? 'rotate-180' : ''}`} />
          </button>

          {showSupport && (
            <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl z-[300] p-3.5 w-60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Hỗ trợ khách hàng</p>
              {SUPPORT_ITEMS.map(item => (
                <a
                  key={item.label}
                  href="#"
                  onClick={e => e.preventDefault()}
                  className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-[13px] text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0"
                    style={{ background: `${navColor}18`, color: navColor }}
                  >
                    <FontAwesomeIcon icon={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Chi nhánh */}
        <a href="#" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-100 transition-colors border-l border-gray-200 ml-1 pl-3.5">
          <span>Chi nhánh trung tâm</span>
          <FontAwesomeIcon icon={faLocationDot} className="text-red-500 text-[13px]" />
        </a>

        {/* Ngôn ngữ */}
        <a href="#" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-100 transition-colors border-l border-gray-200 ml-1 pl-3.5">
          <FontAwesomeIcon icon={faFlag} className="text-red-500 text-[13px]" />
          <span>Tiếng Việt (VN)</span>
          <FontAwesomeIcon icon={faChevronDown} className="text-[10px] text-gray-400" />
        </a>
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="w-[34px] h-[34px] border-none bg-transparent rounded-md cursor-pointer text-gray-500 text-[15px] flex items-center justify-center hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <FontAwesomeIcon icon={faBell} />
        </button>
        <button className="w-[34px] h-[34px] border-none bg-transparent rounded-md cursor-pointer text-gray-500 text-[15px] flex items-center justify-center hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <FontAwesomeIcon icon={faGear} />
        </button>

        {/* User wrapper */}
        <div className="relative" ref={userRef}>
          <button
            className={`flex items-center gap-2 px-2 py-1 rounded-xl cursor-pointer bg-slate-50 border-[1.5px] transition-all font-[Segoe_UI,sans-serif] ${showUser ? 'bg-slate-100' : ''}`}
            style={{ borderColor: showUser ? navColor : 'transparent' }}
            onClick={() => { setShowUser(!showUser); setShowTheme(false); setShowSupport(false); }}
          >
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: navColor }}>
              {initials}
            </div>
            <div className="flex flex-col items-start gap-px min-w-0">
              <span className="text-[13px] font-semibold text-slate-800 whitespace-nowrap max-w-[110px] overflow-hidden text-ellipsis">
                {user?.fullName ?? 'Người dùng'}
              </span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                {roleLabel[user?.role ?? ''] ?? user?.role}
              </span>
            </div>
            <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] text-gray-400 transition-transform ${showUser ? 'rotate-180' : ''}`} />
          </button>

          {showUser && (
            <div className="absolute top-[calc(100%+6px)] right-0 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-[300] overflow-hidden">
              {/* Header info */}
              <div className="flex items-center gap-2.5 p-3.5" style={{ background: `${navColor}12` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[15px] flex-shrink-0" style={{ background: navColor }}>
                  {initials}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-800 m-0 mb-0.5">{user?.fullName}</p>
                  <p className="text-[11.5px] text-slate-500 m-0 break-all">{user?.email}</p>
                </div>
              </div>

              {/* Menu */}
              <div className="py-1.5">
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-gray-700 hover:bg-slate-50 transition-colors no-underline">
                  <FontAwesomeIcon icon={faCircleUser} className="w-4 text-center text-sm" style={{ color: navColor }} />
                  <span>Thông tin tài khoản</span>
                </a>
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-gray-700 hover:bg-slate-50 transition-colors no-underline">
                  <FontAwesomeIcon icon={faShield} className="w-4 text-center text-sm" style={{ color: navColor }} />
                  <span>Đổi mật khẩu</span>
                </a>
              </div>

              <div className="h-px bg-slate-100" />

              <button
                className="flex items-center gap-2.5 w-full px-3.5 py-3 bg-transparent border-none cursor-pointer text-[13.5px] text-red-500 hover:bg-red-50 transition-colors text-left"
                onClick={handleLogout}
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;