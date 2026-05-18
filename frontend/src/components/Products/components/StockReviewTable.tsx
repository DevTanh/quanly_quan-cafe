import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp, faArrowDown, faMinus, faChevronLeft,
  faCheckCircle, faTriangleExclamation, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import type { ReviewItem } from '../hooks/useStockCheck';
import { diffCls } from '../hooks/useStockCheck';
import { StockTableHead, DiffBadge } from './StockShared';

interface ReviewStats {
  over: number; under: number; match: number;
  totalOver: number; totalUnder: number;
}

interface Props {
  reviewItems: ReviewItem[];
  reviewStats: ReviewStats;
  checker: string;
  submitting: boolean;
  onApprove: () => void;
  onBack: () => void;
}

const StockReviewTable: React.FC<Props> = ({
  reviewItems, reviewStats, checker, submitting, onApprove, onBack,
}) => (
  <>
    {/* Summary cards */}
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Tổng sản phẩm kiểm', val: String(reviewItems.length), sub: null,  border: 'border-gray-300',  valCls: 'text-gray-900'  },
        { label: 'Thừa',  val: `${reviewStats.over} SP`,  sub: reviewStats.totalOver  > 0 ? `+${reviewStats.totalOver} đơn vị`  : null, border: 'border-blue-400',  valCls: 'text-blue-700',  icon: faArrowUp,   iconCls: 'text-blue-500'  },
        { label: 'Thiếu', val: `${reviewStats.under} SP`, sub: reviewStats.totalUnder < 0 ? `${reviewStats.totalUnder} đơn vị` : null, border: 'border-red-400',   valCls: 'text-red-700',   icon: faArrowDown, iconCls: 'text-red-500'   },
        { label: 'Khớp',  val: `${reviewStats.match} SP`, sub: null,  border: 'border-green-400', valCls: 'text-green-700', icon: faMinus,     iconCls: 'text-green-500' },
      ].map(c => (
        <div key={c.label} className={`bg-white rounded-xl px-[18px] py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-1 border-l-4 ${c.border}`}>
          {'icon' in c && c.icon && <FontAwesomeIcon icon={c.icon} className={`text-[15px] ${c.iconCls}`} />}
          <span className="text-xs text-gray-400 font-semibold">{c.label}</span>
          <span className={`text-[22px] font-black ${c.valCls}`}>{c.val}</span>
          {c.sub && <span className="text-xs text-gray-400">{c.sub}</span>}
        </div>
      ))}
    </div>

    {/* Warning */}
    {(reviewStats.over > 0 || reviewStats.under > 0) && (
      <div className="flex items-center gap-2.5 bg-amber-50 border-[1.5px] border-amber-400 rounded-xl px-4 py-3 text-[13.5px] text-amber-800">
        <FontAwesomeIcon icon={faTriangleExclamation} />
        <span>
          Có <strong>{reviewStats.over + reviewStats.under}</strong> sản phẩm chênh lệch. Vui lòng kiểm tra trước khi duyệt.
        </span>
      </div>
    )}

    {/* Review table */}
    <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="px-[18px] py-3.5 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-900">
          Chi tiết kết quả kiểm kho
          <em className="font-normal text-gray-400 ml-1">— Người kiểm: {checker}</em>
        </span>
      </div>
      <div className="overflow-x-auto">
        <StockTableHead />
        {reviewItems.map((item, i) => (
          <div
            key={item.productId}
            className={`grid border-b border-gray-50 last:border-b-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${item.diff !== 0 ? 'bg-amber-50/30' : ''}`}
            style={{ gridTemplateColumns: '2fr 1fr 110px 110px 110px 1.5fr' }}
          >
            <div className="px-3.5 py-2.5 flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-gray-900">{item.productName}</span>
              <span className="text-[11px] text-gray-400 font-mono">{item.productCode}</span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center">
              <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11.5px] font-semibold">
                {item.category}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center">
              <span className="text-sm font-bold text-gray-600">{item.systemStock}</span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center">
              <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold text-center ${diffCls(item.diff)}`}>
                {item.actualStock}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center">
              <DiffBadge diff={item.diff} />
            </div>
            <div className="px-3.5 py-2.5 flex items-center">
              <span className="text-[12.5px] text-gray-500 italic">{item.note || '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex-wrap gap-2.5">
      <button
        className="flex items-center gap-1.5 h-[38px] px-4 border-[1.5px] border-gray-300 bg-white rounded-lg text-[13.5px] font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors font-[inherit] disabled:opacity-50"
        onClick={onBack}
        disabled={submitting}
      >
        <FontAwesomeIcon icon={faChevronLeft} /> Quay lại chỉnh sửa
      </button>
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-gray-400">Sau khi duyệt, tồn kho sẽ được cập nhật ngay lập tức</span>
        <button
          className="flex items-center gap-2 h-[38px] px-5 border-none bg-green-500 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-600 active:scale-95 transition-all font-[inherit] disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={onApprove}
          disabled={submitting}
        >
          {submitting
            ? <><FontAwesomeIcon icon={faSpinner} spin /> Đang cập nhật...</>
            : <><FontAwesomeIcon icon={faCheckCircle} /> Duyệt &amp; Cập nhật tồn kho</>
          }
        </button>
      </div>
    </div>
  </>
);

export default StockReviewTable;
