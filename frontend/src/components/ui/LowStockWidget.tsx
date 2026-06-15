// src/components/ui/LowStockWidget.tsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation, faBoxOpen, faSpinner, faTimes, faChevronDown, faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { inventoryApi } from '../../api/inventory.api';
import type { ProductAPI } from '../../api/products.api';

interface LowStockWidgetProps {
  /** If true, shows as a collapsible floating panel; if false, renders inline */
  floating?: boolean;
}

const LowStockWidget: React.FC<LowStockWidgetProps> = ({ floating = false }) => {
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getLowStock();
      setProducts(data);
      setLastFetched(new Date());
    } catch (err) {
      console.error('LowStockWidget fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchLowStock, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0);
  const totalCount = products.length;

  if (totalCount === 0 && !loading) return null;

  /* ── Floating mode ── */
  if (floating) {
    return (
      <div className="fixed bottom-10 left-5 z-50 font-['Segoe_UI',sans-serif]">
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(v => !v)}
          className={[
            'flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-[13.5px] font-semibold text-white transition-all',
            totalCount > 0 ? 'bg-[#f59e0b] hover:bg-[#d97706]' : 'bg-gray-400',
          ].join(' ')}
        >
          {loading
            ? <FontAwesomeIcon icon={faSpinner} spin />
            : <FontAwesomeIcon icon={faTriangleExclamation} />}
          <span>Sắp hết hàng ({totalCount})</span>
          <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronUp} className="text-[10px] ml-1" />
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute bottom-18 left-0 w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#fffbeb] border-b border-[#fde68a]">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBoxOpen} className="text-[#f59e0b]" />
                <span className="text-[13.5px] font-bold text-[#92400e]">
                  Cảnh báo tồn kho ({totalCount})
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-[13px]" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[320px] overflow-y-auto p-3 flex flex-col gap-2">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span className="text-[13px]">Đang tải...</span>
                </div>
              ) : (
                <>
                  {outOfStock.length > 0 && (
                    <>
                      <p className="text-[11px] font-bold text-red-500 uppercase tracking-wide px-1">
                        Hết hàng ({outOfStock.length})
                      </p>
                      {outOfStock.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg">
                          <div>
                            <p className="text-[13px] font-semibold text-gray-800 m-0">{p.name}</p>
                            <p className="text-[11px] text-gray-400 m-0">{p.category?.name}</p>
                          </div>
                          <span className="text-[12px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded">
                            Hết
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {lowStock.length > 0 && (
                    <>
                      <p className="text-[11px] font-bold text-yellow-600 uppercase tracking-wide px-1 mt-1">
                        Tồn kho thấp ({lowStock.length})
                      </p>
                      {lowStock.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-yellow-50 rounded-lg">
                          <div>
                            <p className="text-[13px] font-semibold text-gray-800 m-0">{p.name}</p>
                            <p className="text-[11px] text-gray-400 m-0">{p.category?.name}</p>
                          </div>
                          <span className="text-[12px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            Còn {p.stock}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {lastFetched && (
              <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  Cập nhật: {lastFetched.toLocaleTimeString('vi-VN')}
                </span>
                <button
                  onClick={fetchLowStock}
                  className="text-[11.5px] text-[#3dba74] font-semibold hover:underline"
                >
                  Làm mới
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Inline mode ── */
  return (
    <div className="bg-white rounded-xl border-l-4 border-[#f59e0b] p-4 shadow-sm">
      <h3 className="text-[12px] font-bold text-yellow-700 uppercase tracking-wide mb-3 flex items-center gap-2 m-0">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[#f59e0b]" />
        Cảnh báo tồn kho ({totalCount})
      </h3>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-4 justify-center">
          <FontAwesomeIcon icon={faSpinner} spin />
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-700 m-0">{p.name}</p>
                <p className="text-[11px] text-gray-400 m-0">{p.category?.name}</p>
              </div>
              <span className={[
                'text-[12px] font-bold px-2 py-0.5 rounded',
                p.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700',
              ].join(' ')}>
                {p.stock === 0 ? 'Hết hàng' : `Còn ${p.stock}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LowStockWidget;
