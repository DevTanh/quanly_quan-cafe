import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faArrowUp, faArrowDown, faMinus } from '@fortawesome/free-solid-svg-icons';

/* ── ProgressBar ── */
interface ProgressBarProps { currentStep: 0 | 1 | 2 }

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => (
  <div className="flex items-center bg-white rounded-xl px-6 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
    {['Nhập liệu', 'Xem xét', 'Hoàn tất'].map((label, i) => (
      <React.Fragment key={label}>
        {i > 0 && (
          <div className={`flex-1 h-0.5 mx-3 transition-colors ${i <= currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
        )}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < currentStep  ? 'bg-green-50 text-green-500' :
            i === currentStep ? 'bg-green-500 text-white' :
            'bg-gray-200 text-gray-400'
          }`}>
            {i < currentStep
              ? <FontAwesomeIcon icon={faCheckCircle} className="text-sm" />
              : i + 1
            }
          </span>
          <span className={`text-[13px] font-semibold transition-colors ${
            i < currentStep  ? 'text-green-500' :
            i === currentStep ? 'text-gray-900' :
            'text-gray-400'
          }`}>
            {label}
          </span>
        </div>
      </React.Fragment>
    ))}
  </div>
);

/* ── TableHead ── */
export const StockTableHead: React.FC = () => (
  <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: '2fr 1fr 110px 110px 110px 1.5fr' }}>
    {['Sản phẩm', 'Danh mục', 'Tồn hệ thống', 'Tồn thực tế', 'Chênh lệch', 'Ghi chú'].map(h => (
      <div key={h} className="px-3.5 py-2.5 text-[12.5px] font-semibold text-gray-500">{h}</div>
    ))}
  </div>
);

/* ── DiffBadge ── */
interface DiffBadgeProps { diff: number | null }

export const DiffBadge: React.FC<DiffBadgeProps> = ({ diff }) => {
  if (diff === null) return <span className="text-gray-300 text-base">—</span>;
  if (diff === 0) return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12.5px] font-bold bg-green-50 text-green-700">
      <FontAwesomeIcon icon={faMinus} /> Khớp
    </span>
  );
  if (diff > 0) return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12.5px] font-bold bg-blue-50 text-blue-700">
      <FontAwesomeIcon icon={faArrowUp} /> +{diff}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12.5px] font-bold bg-red-50 text-red-700">
      <FontAwesomeIcon icon={faArrowDown} /> {diff}
    </span>
  );
};
