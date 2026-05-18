import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardCheck } from '@fortawesome/free-solid-svg-icons';
import type { HistoryRecord } from '../hooks/useStockCheck';
import { diffCls } from '../hooks/useStockCheck';
import { StockTableHead, DiffBadge } from './StockShared';

interface Props {
  history: HistoryRecord[];
}

const StockHistory: React.FC<Props> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
        <FontAwesomeIcon icon={faClipboardCheck} className="text-[40px]" />
        <p className="text-sm text-gray-400 m-0">Chưa có lịch sử kiểm kho nào</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {history.map(rec => (
        <details
          key={rec.id}
          className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          <summary className="flex items-center justify-between px-[18px] py-3.5 cursor-pointer list-none hover:bg-gray-50 transition-colors gap-3 flex-wrap [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-[13px] font-bold text-gray-900 font-mono">{rec.id}</span>
              <span className="text-[12.5px] text-gray-400">{rec.date}</span>
              <span className="text-[12.5px] text-gray-600 font-semibold">👤 {rec.checker}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[12.5px] text-gray-500">{rec.totalItems} sản phẩm</span>
              {rec.totalDiff === 0
                ? <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-md text-xs font-bold">Tất cả khớp</span>
                : <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-bold">Chênh lệch: {rec.totalDiff}</span>
              }
            </div>
          </summary>

          <div className="border-t border-gray-100 overflow-x-auto">
            <StockTableHead />
            {rec.items.map((item, i) => (
              <div
                key={item.productId}
                className={`grid border-b border-gray-50 last:border-b-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
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
                <div className="px-3.5 py-2.5 flex items-center text-sm font-bold text-gray-600">
                  {item.systemStock}
                </div>
                <div className="px-3.5 py-2.5 flex items-center">
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${diffCls(item.diff)}`}>
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
        </details>
      ))}
    </div>
  );
};

export default StockHistory;
