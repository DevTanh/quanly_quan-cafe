import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const BtnPrimary: React.FC<ButtonProps> = ({
  onClick, disabled, loading, children, className = '', type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={`flex items-center gap-1.5 h-9 px-4 border-none bg-green-600 rounded-lg text-[13px] font-bold text-white cursor-pointer hover:bg-green-700 hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(22,163,74,0.35)] transition-all font-[inherit] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${className}`}
  >
    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : children}
  </button>
);

export const BtnOutline: React.FC<ButtonProps> = ({
  onClick, disabled, children, className = '', type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

export const BtnDanger: React.FC<ButtonProps> = ({
  onClick, disabled, loading, children, className = '', type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={`h-10 px-6 border-none bg-red-500 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-red-700 transition-colors font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : children}
  </button>
);

interface IconBtnProps {
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  variant: 'edit' | 'delete' | 'neutral';
  children: React.ReactNode;
}

export const IconBtn: React.FC<IconBtnProps> = ({ onClick, title, variant, children }) => {
  const cls = {
    edit: 'bg-blue-50 text-blue-500 hover:bg-blue-100',
    delete: 'bg-red-50 text-red-500 hover:bg-red-100',
    neutral: 'bg-slate-50 text-slate-400 hover:bg-slate-100',
  }[variant];

  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-[30px] h-[30px] border-none rounded-lg cursor-pointer flex items-center justify-center text-xs transition-all active:scale-90 ${cls}`}
    >
      {children}
    </button>
  );
};
