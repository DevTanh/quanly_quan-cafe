import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { BtnOutline } from './Button';

interface LoadingProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingProps> = ({
  message = 'Đang tải...', className = 'h-[60vh]',
}) => (
  <div className={`flex items-center justify-center gap-3 text-gray-500 ${className}`}>
    <FontAwesomeIcon icon={faSpinner} spin />
    <span>{message}</span>
  </div>
);

interface ErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorProps> = ({
  message, onRetry, className = 'h-[60vh]',
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 text-red-500 ${className}`}>
    <span>{message}</span>
    {onRetry && (
      <button
        className="px-4 py-2 rounded-md border border-red-400 text-red-500 bg-white cursor-pointer hover:bg-red-50 text-sm font-[inherit]"
        onClick={onRetry}
      >
        Thử lại
      </button>
    )}
  </div>
);

interface EmptyProps {
  icon?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyProps> = ({
  icon = '📦',
  message = 'Không tìm thấy dữ liệu nào phù hợp',
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 gap-2.5 ${className}`}>
    <span className="text-[40px]">{icon}</span>
    <p className="m-0 text-sm text-gray-400">{message}</p>
    {action && (
      <BtnOutline onClick={action.onClick} className="mt-1">
        {action.label}
      </BtnOutline>
    )}
  </div>
);

interface ApiErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export const ApiErrorToast: React.FC<ApiErrorToastProps> = ({ message, onDismiss }) => (
  <div className="mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600 flex items-center justify-between flex-shrink-0">
    <span>{message}</span>
    <button
      className="ml-3 text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer"
      onClick={onDismiss}
    >
      ×
    </button>
  </div>
);
