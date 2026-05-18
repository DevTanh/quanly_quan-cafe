import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faChevronDown, faCheckCircle, faClipboardCheck, faBoxOpen, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import type { ProductAPI } from '../../../api/products.api';
import type { StockCheckRow } from '../hooks/useStockCheck';
import { diffCls } from '../hooks/useStockCheck';
import { StockTableHead, DiffBadge } from './StockShared';

interface Props {
  mode: 'all' | 'select';
  setMode: (m: 'all' | 'select') => void;
  finiteProducts: ProductAPI[];
  filteredProducts: ProductAPI[];
  categories: string[];
  search: string;
  setSearch: (v: string) => void;
  filterCat: string;
  setFilterCat: (v: string) => void;
  checker: string;
  setChecker: (v: string) => void;
  checkerErr: boolean;
  setCheckerErr: (v: boolean) => void;
  activeRows: StockCheckRow[];
  isInRows: (id: number) => boolean;
  getRow: (id: number) => StockCheckRow | undefined;
  getDiff: (p: ProductAPI, s: string) => number | null;
  toggleSelect: (p: ProductAPI) => void;
  setActual: (id: number, val: string) => void;
  setNote: (id: number, val: string) => void;
  rows: StockCheckRow[];
  stats: { filled: number; over: number; under: number; match: number; total: number };
  onGoReview: () => void;
  onReset: () => void;
}

const StockInputTable: React.FC<Props> = ({
  mode, setMode, finiteProducts, filteredProducts, categories,
  search, setSearch, filterCat, setFilterCat,
  checker, setChecker, checkerErr, setCheckerErr,
  activeRows, isInRows, getRow, getDiff,
  toggleSelect, setActual, setNote, rows, stats,
  onGoReview, onReset,
}) => (
  <>
    {/* Config bar */}
    <div className="flex items-start justify-between gap-4 bg-white rounded-xl px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] font-semibold text-gray-600 whitespace-nowrap">Phạm vi kiểm:</span>
        <div className="flex gap-1.5">
          {([
            ['all',    faBoxOpen,         `Tất cả sản phẩm (${finiteProducts.length})`],
            ['select', faClipboardCheck,  'Chọn từng sản phẩm'],
          ] as const).map(([val, icon, label]) => (
            <button
              key={val}
              className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border-[1.5px] text-[13px] font-semibold cursor-pointer transition-all font-[inherit] ${
                mode === val
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => { setMode(val); }}
            >
              <FontAwesomeIcon icon={icon} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <input
          className={`h-[38px] px-3.5 border-[1.5px] rounded-lg text-[13.5px] text-gray-900 bg-gray-50 outline-none w-56 transition-all font-[inherit] focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(61,186,116,0.12)] focus:bg-white placeholder:text-gray-300 ${checkerErr ? 'border-red-400' : 'border-gray-200'}`}
          placeholder="Tên người kiểm kho *"
          value={checker}
          onChange={e => { setChecker(e.target.value); setCheckerErr(false); }}
        />
        {checkerErr && <span className="text-[11.5px] text-red-500">Vui lòng nhập tên người kiểm</span>}
      </div>
    </div>

    {/* Select panel */}
    {mode === 'select' && (
      <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-3">
        <div className="flex gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <FontAwesomeIcon icon={faSearch} className="absolute left-[11px] top-1/2 -translate-y-1/2 text-gray-300 text-[13px]" />
            <input
              className="w-full h-9 pl-[34px] pr-3 border-[1.5px] border-gray-200 rounded-lg text-[13px] outline-none bg-gray-50 transition-colors focus:border-green-500 focus:bg-white font-[inherit]"
              placeholder="Tìm theo tên, mã sản phẩm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="h-9 pl-3 pr-8 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-gray-50 appearance-none outline-none cursor-pointer font-[inherit]"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid gap-2 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          {filteredProducts.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] cursor-pointer transition-all ${
                isInRows(p.id)
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'
              }`}
              onClick={() => toggleSelect(p)}
            >
              {isInRows(p.id)
                ? <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-base shrink-0" />
                : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              }
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</span>
                <span className="text-[11px] text-gray-400">{p.category.name}</span>
              </div>
              <span className="text-[13px] font-bold text-gray-600 min-w-[28px] text-right shrink-0">
                {p.stock === 0 && p.minStock === 0 ? '∞' : p.stock}
              </span>
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <p className="text-[13px] text-green-600 font-semibold m-0">
            Đã chọn <strong>{rows.length}</strong> sản phẩm để kiểm
          </p>
        )}
      </div>
    )}

    {mode === 'select' && rows.length === 0 && (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
        <FontAwesomeIcon icon={faClipboardCheck} className="text-[40px]" />
        <p className="text-sm text-gray-400 m-0">Chọn sản phẩm ở trên để thêm vào phiếu kiểm</p>
      </div>
    )}

    {/* Input table */}
    {activeRows.length > 0 && (
      <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100 flex-wrap gap-2">
          <span className="text-sm font-bold text-gray-900">
            {mode === 'all' ? 'Tất cả sản phẩm có tồn kho' : 'Sản phẩm đã chọn'}
            <em className="font-normal text-gray-400 ml-1">({activeRows.length} sản phẩm)</em>
          </span>
          <div className="flex gap-3.5 flex-wrap">
            {[
              { label: `Đã nhập: ${stats.filled}/${stats.total}`, cls: 'text-gray-700' },
              { label: `Thừa: ${stats.over}`,   cls: 'text-blue-700' },
              { label: `Thiếu: ${stats.under}`, cls: 'text-red-600' },
              { label: `Khớp: ${stats.match}`,  cls: 'text-green-600' },
            ].map(s => (
              <span key={s.label} className={`text-[12.5px] font-semibold ${s.cls}`}>{s.label}</span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <StockTableHead />
          {activeRows.map((r, i) => {
            const actualStr = getRow(r.product.id)?.actualStock ?? r.actualStock;
            const diff      = getDiff(r.product, actualStr);
            const note      = getRow(r.product.id)?.note ?? '';

            return (
              <div
                key={r.product.id}
                className={`grid border-b border-gray-50 last:border-b-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                style={{ gridTemplateColumns: '2fr 1fr 110px 110px 110px 1.5fr' }}
              >
                <div className="px-3.5 py-2.5 flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-gray-900">{r.product.name}</span>
                  <span className="text-[11px] text-gray-400 font-mono">{r.product.code}</span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11.5px] font-semibold">
                    {r.product.category.name}
                  </span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center">
                  <span className="text-sm font-bold text-gray-600">{r.product.stock}</span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center">
                  <input
                    className={`w-20 h-[34px] px-2.5 border-[1.5px] rounded-lg text-sm font-bold text-center outline-none transition-all font-[inherit] ${
                      diff !== null && diff < 0 ? 'border-red-400 bg-red-50 text-red-700' :
                      diff !== null && diff > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' :
                      diff === 0               ? 'border-green-400 bg-green-50 text-green-700' :
                      'border-gray-200 bg-gray-50 focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(61,186,116,0.1)] focus:bg-white'
                    }`}
                    placeholder="Nhập..."
                    value={actualStr}
                    onChange={e => setActual(r.product.id, e.target.value)}
                  />
                </div>
                <div className="px-3.5 py-2.5 flex items-center">
                  <DiffBadge diff={diff} />
                </div>
                <div className="px-3.5 py-2.5 flex items-center">
                  <input
                    className="w-full h-8 px-2.5 border-[1.5px] border-gray-200 rounded-lg text-[12.5px] outline-none bg-gray-50 transition-colors focus:border-green-500 focus:bg-white placeholder:text-gray-300 font-[inherit]"
                    placeholder="Ghi chú..."
                    value={note}
                    onChange={e => setNote(r.product.id, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Footer */}
    {activeRows.length > 0 && (
      <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex-wrap gap-2.5">
        <button
          className="flex items-center gap-1.5 h-[38px] px-4 border-[1.5px] border-gray-300 bg-white rounded-lg text-[13.5px] font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors font-[inherit]"
          onClick={onReset}
        >
          <FontAwesomeIcon icon={faRotateLeft} /> Làm mới
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-gray-400">
            {stats.filled === 0 ? 'Nhập tồn thực tế để tiếp tục' : `Đã nhập ${stats.filled}/${stats.total} sản phẩm`}
          </span>
          <button
            className={`flex items-center gap-2 h-[38px] px-5 border-none rounded-lg text-[13.5px] font-bold text-white cursor-pointer transition-all font-[inherit] ${
              stats.filled === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-700 active:scale-95'
            }`}
            onClick={onGoReview}
            disabled={stats.filled === 0}
          >
            Xem xét kết quả →
          </button>
        </div>
      </div>
    )}
  </>
);

export default StockInputTable;
