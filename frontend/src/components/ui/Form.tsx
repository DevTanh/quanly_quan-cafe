import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

export const labelCls = 'text-[12.5px] font-bold text-slate-600';
export const inputCls =
  'h-10 px-3 border border-gray-200 rounded-lg text-[13.5px] text-slate-900 bg-slate-50 outline-none transition-all font-[inherit] focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,163,74,0.12)]';
export const selectCls = `${inputCls} appearance-none pr-8 cursor-pointer`;

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label, required, hint, children, className = '',
}) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className={labelCls}>
      {label}
      {required && <span className="text-red-500"> *</span>}
      {hint && <span className="text-[11px] font-normal text-gray-400 ml-1">{hint}</span>}
    </label>
    {children}
  </div>
);

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  hint?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, required, hint, ...props }) => (
  <FormField label={label} required={required} hint={hint}>
    <input className={inputCls} {...props} />
  </FormField>
);

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  allOptionLabel?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label, required, options, allOptionLabel, ...props
}) => (
  <FormField label={label} required={required}>
    <div className="relative">
      <select className={`${selectCls} w-full`} {...props}>
        {allOptionLabel && <option value="">{allOptionLabel}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FontAwesomeIcon
        icon={faChevronDown}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none"
      />
    </div>
  </FormField>
);

interface ToggleButtonProps {
  active: boolean;
  onToggle: () => void;
  activeLabel: string;
  inactiveLabel: string;
  activeIcon?: React.ReactNode;
  inactiveIcon?: React.ReactNode;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  active, onToggle, activeLabel, inactiveLabel, activeIcon, inactiveIcon,
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center gap-2 h-10 px-3 rounded-lg border cursor-pointer text-[13px] font-semibold transition-all font-[inherit] ${
      active
        ? 'border-green-500 text-green-600 bg-green-50'
        : 'border-gray-200 text-gray-400 bg-slate-50'
    }`}
  >
    {active ? activeIcon : inactiveIcon}
    {active ? activeLabel : inactiveLabel}
  </button>
);
