import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck, faSearch, faChevronDown, faChevronLeft,
  faCheckCircle, faArrowUp, faArrowDown, faMinus,
  faBoxOpen, faRotateLeft, faTriangleExclamation, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { inventoryApi } from '../../api/inventory.api';
import type { ProductAPI } from '../../api/products.api';

/* ── Types ── */
interface StockCheckRow { product: ProductAPI; actualStock: string; note: string }
interface ReviewItem {
  productId: number; productCode: string; productName: string; category: string;
  systemStock: number; actualStock: number; diff: number; note: string;
}
interface HistoryRecord {
  id: string; date: string; checker: string;
  totalItems: number; totalDiff: number; items: ReviewItem[];
}
type Step = 'input' | 'review' | 'done';

const fmtDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ── Shared style helpers ── */
const diffCls = (diff: number | null) => {
  if (diff === null) return '';
  if (diff > 0) return 'bg-blue-50 text-blue-700';
  if (diff < 0) return 'bg-red-50 text-red-700';
  return 'bg-green-50 text-green-700';
};

const StockCheck: React.FC = () => {
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<'all' | 'select'>('all');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Tất cả');
  const [checker, setChecker] = useState('');
  const [checkerErr, setCheckerErr] = useState(false);
  const [rows, setRows] = useState<StockCheckRow[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [tab, setTab] = useState<'check' | 'history'>('check');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const data = await inventoryApi.getProducts();

      setProducts(data);

      setCategories([
        'Tất cả',
        ...Array.from(
          new Set<string>(
            data.map(p => p.category.name)
          )
        )
      ]);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      if (filterCat !== 'Tất cả' && p.category.name !== filterCat) return false;
      const q = search.toLowerCase();
      return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    }), [products, search, filterCat]);

  const finiteProducts = useMemo(() =>
    products.filter(p => !(p.stock === 0 && p.minStock === 0)), [products]);

  const activeRows: StockCheckRow[] = useMemo(() => {
    if (mode === 'all') {
      return finiteProducts.map(p =>
        rows.find(r => r.product.id === p.id) ?? { product: p, actualStock: '', note: '' }
      );
    }
    return rows;
  }, [mode, rows, finiteProducts]);

  const isInRows = (id: number) => rows.some(r => r.product.id === id);
  const getRow = (id: number) => rows.find(r => r.product.id === id);
  const getDiff = (p: ProductAPI, s: string) => s === '' ? null : parseInt(s, 10) - p.stock;

  const toggleSelect = (p: ProductAPI) => {
    if (isInRows(p.id)) setRows(prev => prev.filter(r => r.product.id !== p.id));
    else setRows(prev => [...prev, { product: p, actualStock: '', note: '' }]);
  };

  const setActual = (id: number, val: string) => {
    const num = val.replace(/\D/g, '');
    if (mode === 'all') {
      setRows(prev => {
        const exists = prev.find(r => r.product.id === id);
        if (exists) return prev.map(r => r.product.id === id ? { ...r, actualStock: num } : r);
        const product = finiteProducts.find(p => p.id === id)!;
        return [...prev, { product, actualStock: num, note: '' }];
      });
    } else {
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, actualStock: num } : r));
    }
  };

  const setNote = (id: number, val: string) => {
    if (mode === 'all') {
      setRows(prev => {
        const exists = prev.find(r => r.product.id === id);
        if (exists) return prev.map(r => r.product.id === id ? { ...r, note: val } : r);
        const product = finiteProducts.find(p => p.id === id)!;
        return [...prev, { product, actualStock: '', note: val }];
      });
    } else {
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, note: val } : r));
    }
  };

  const stats = useMemo(() => {
    let filled = 0, over = 0, under = 0, match = 0;
    activeRows.forEach(r => {
      const actual = getRow(r.product.id)?.actualStock ?? r.actualStock;
      if (!actual) return;
      filled++;
      const diff = parseInt(actual, 10) - r.product.stock;
      if (diff > 0) over++; else if (diff < 0) under++; else match++;
    });
    return { filled, over, under, match, total: activeRows.length };
  }, [activeRows, rows]);

  const handleGoReview = () => {
    if (!checker.trim()) { setCheckerErr(true); return; }
    setCheckerErr(false);
    const items: ReviewItem[] = activeRows
      .filter(r => (getRow(r.product.id)?.actualStock ?? r.actualStock) !== '')
      .map(r => {
        const actual = parseInt(getRow(r.product.id)?.actualStock ?? r.actualStock, 10);
        return {
          productId: r.product.id, productCode: r.product.code, productName: r.product.name,
          category: r.product.category.name, systemStock: r.product.stock,
          actualStock: actual, diff: actual - r.product.stock,
          note: getRow(r.product.id)?.note ?? '',
        };
      });
    if (items.length === 0) return;
    setReviewItems(items); setStep('review');
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await Promise.all(reviewItems.map(item => inventoryApi.updateStock(item.productId, item.actualStock)));
      const record: HistoryRecord = {
        id: `KC${Date.now()}`, date: fmtDate(new Date()), checker: checker.trim(),
        totalItems: reviewItems.length,
        totalDiff: reviewItems.reduce((s, i) => s + Math.abs(i.diff), 0),
        items: reviewItems,
      };
      setHistory(prev => [record, ...prev]);
      setRows([]); setChecker(''); setReviewItems([]); setStep('done');
      await fetchProducts();
      setTimeout(() => setStep('input'), 3500);
    } catch (err) { console.error(err); alert('Có lỗi xảy ra. Vui lòng thử lại.'); }
    finally { setSubmitting(false); }
  };

  const handleReset = () => {
    setRows([]); setSearch(''); setFilterCat('Tất cả'); setChecker(''); setCheckerErr(false);
  };

  const reviewStats = useMemo(() => ({
    over: reviewItems.filter(i => i.diff > 0).length,
    under: reviewItems.filter(i => i.diff < 0).length,
    match: reviewItems.filter(i => i.diff === 0).length,
    totalOver: reviewItems.filter(i => i.diff > 0).reduce((s, i) => s + i.diff, 0),
    totalUnder: reviewItems.filter(i => i.diff < 0).reduce((s, i) => s + i.diff, 0),
  }), [reviewItems]);

  /* ── Shared Components ── */
  const ProgressBar = ({ currentStep }: { currentStep: 0 | 1 | 2 }) => (
    <div className="flex items-center bg-white rounded-xl px-6 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {['Nhập liệu', 'Xem xét', 'Hoàn tất'].map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && (
            <div className={`flex-1 h-0.5 mx-3 transition-colors ${i <= currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < currentStep ? 'bg-green-50 text-green-500' :
              i === currentStep ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
              {i < currentStep ? <FontAwesomeIcon icon={faCheckCircle} className="text-sm" /> : i + 1}
            </span>
            <span className={`text-[13px] font-semibold transition-colors ${i < currentStep ? 'text-green-500' :
              i === currentStep ? 'text-gray-900' :
                'text-gray-400'
              }`}>{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  const TableHead = () => (
    <div className="grid [grid-template-columns:2fr_1fr_110px_110px_110px_1.5fr] bg-gray-50 border-b border-gray-200">
      {['Sản phẩm', 'Danh mục', 'Tồn hệ thống', 'Tồn thực tế', 'Chênh lệch', 'Ghi chú'].map(h => (
        <div key={h} className="px-3.5 py-2.5 text-[12.5px] font-semibold text-gray-500">{h}</div>
      ))}
    </div>
  );

  const DiffBadge = ({ diff }: { diff: number | null }) => {
    if (diff === null) return <span className="text-gray-300 text-base">—</span>;
    if (diff === 0) return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12.5px] font-bold bg-green-50 text-green-700"><FontAwesomeIcon icon={faMinus} /> Khớp</span>;
    if (diff > 0) return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12.5px] font-bold bg-blue-50 text-blue-700"><FontAwesomeIcon icon={faArrowUp} /> +{diff}</span>;
    return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12.5px] font-bold bg-red-50 text-red-700"><FontAwesomeIcon icon={faArrowDown} /> {diff}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] gap-3 text-gray-500 font-[Segoe_UI,sans-serif]">
      <FontAwesomeIcon icon={faSpinner} spin />
      <span>Đang tải dữ liệu tồn kho...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 font-[Segoe_UI,sans-serif]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-[18px] flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faClipboardCheck} className="text-[28px] text-green-500" />
          <div>
            <h1 className="text-[20px] font-black text-gray-900 m-0">Kiểm kho</h1>
            <p className="text-[12.5px] text-gray-400 m-0 mt-0.5">Đối chiếu tồn kho thực tế với hệ thống</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1">
          {(['check', 'history'] as const).map(t => (
            <button
              key={t}
              className={`relative flex items-center gap-1.5 px-[18px] py-[7px] border-none rounded-lg text-[13.5px] font-semibold cursor-pointer transition-all font-[inherit] ${tab === t ? 'bg-white text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-gray-500'}`}
              onClick={() => { setTab(t); if (t === 'check') setStep('input'); }}
            >
              {t === 'check' ? 'Phiếu kiểm kho' : 'Lịch sử'}
              {t === 'history' && history.length > 0 && (
                <span className="bg-green-500 text-white text-[10px] font-bold rounded-xl px-1.5 py-px">{history.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      {tab === 'check' ? (
        <div className="flex-1 px-6 pt-4 pb-6 flex flex-col gap-3.5 overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-xl">

          {/* DONE */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-[doneIn_0.4s_ease]">
              <FontAwesomeIcon icon={faCheckCircle} className="text-[56px] text-green-500" />
              <h2 className="text-[22px] font-black text-gray-900 m-0">Kiểm kho hoàn tất!</h2>
              <p className="text-sm text-gray-400 m-0">Tồn kho đã được cập nhật theo kết quả kiểm.</p>
            </div>
          )}

          {/* INPUT */}
          {step === 'input' && (<>
            <ProgressBar currentStep={0} />

            {/* Config */}
            <div className="flex items-start justify-between gap-4 bg-white rounded-xl px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[13px] font-semibold text-gray-600 whitespace-nowrap">Phạm vi kiểm:</span>
                <div className="flex gap-1.5">
                  {([['all', faBoxOpen, `Tất cả sản phẩm (${finiteProducts.length})`], ['select', faClipboardCheck, 'Chọn từng sản phẩm']] as const).map(([val, icon, label]) => (
                    <button
                      key={val}
                      className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border-[1.5px] text-[13px] font-semibold cursor-pointer transition-all font-[inherit] ${mode === val ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => { setMode(val as 'all' | 'select'); setRows([]); }}
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
                      value={search} onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <select
                      className="h-9 pl-3 pr-8 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-gray-50 appearance-none outline-none cursor-pointer font-[inherit]"
                      value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    >
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="grid [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))] gap-2 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] cursor-pointer transition-all ${isInRows(p.id) ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'}`}
                      onClick={() => toggleSelect(p)}
                    >
                      {isInRows(p.id)
                        ? <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-base flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      }
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-[13px] font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</span>
                        <span className="text-[11px] text-gray-400">{p.category.name}</span>
                      </div>
                      <span className="text-[13px] font-bold text-gray-600 min-w-[28px] text-right flex-shrink-0">
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
                      { label: `Thừa: ${stats.over}`, cls: 'text-blue-700' },
                      { label: `Thiếu: ${stats.under}`, cls: 'text-red-600' },
                      { label: `Khớp: ${stats.match}`, cls: 'text-green-600' },
                    ].map(s => (
                      <span key={s.label} className={`text-[12.5px] font-semibold ${s.cls}`}>{s.label}</span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <TableHead />
                  {activeRows.map((r, i) => {
                    const actualStr = getRow(r.product.id)?.actualStock ?? r.actualStock;
                    const diff = getDiff(r.product, actualStr);
                    const note = getRow(r.product.id)?.note ?? '';
                    return (
                      <div key={r.product.id} className={`grid [grid-template-columns:2fr_1fr_110px_110px_110px_1.5fr] border-b border-gray-50 last:border-b-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                        <div className="px-3.5 py-2.5 flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-gray-900">{r.product.name}</span>
                          <span className="text-[11px] text-gray-400 font-mono">{r.product.code}</span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11.5px] font-semibold">{r.product.category.name}</span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center">
                          <span className="text-sm font-bold text-gray-600">{r.product.stock}</span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center">
                          <input
                            className={`w-20 h-[34px] px-2.5 border-[1.5px] rounded-lg text-sm font-bold text-center outline-none transition-all font-[inherit] ${diff !== null && diff < 0 ? 'border-red-400 bg-red-50 text-red-700' :
                              diff !== null && diff > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' :
                                diff === 0 ? 'border-green-400 bg-green-50 text-green-700' :
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
                <button className="flex items-center gap-1.5 h-[38px] px-4 border-[1.5px] border-gray-300 bg-white rounded-lg text-[13.5px] font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors font-[inherit]" onClick={handleReset}>
                  <FontAwesomeIcon icon={faRotateLeft} /> Làm mới
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-gray-400">
                    {stats.filled === 0 ? 'Nhập tồn thực tế để tiếp tục' : `Đã nhập ${stats.filled}/${stats.total} sản phẩm`}
                  </span>
                  <button
                    className={`flex items-center gap-2 h-[38px] px-5 border-none rounded-lg text-[13.5px] font-bold text-white cursor-pointer transition-all font-[inherit] ${stats.filled === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-700 active:scale-95'}`}
                    onClick={handleGoReview}
                    disabled={stats.filled === 0}
                  >
                    Xem xét kết quả →
                  </button>
                </div>
              </div>
            )}
          </>)}

          {/* REVIEW */}
          {step === 'review' && (<>
            <ProgressBar currentStep={1} />

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Tổng sản phẩm kiểm', val: String(reviewItems.length), sub: null, border: 'border-gray-300', valCls: 'text-gray-900' },
                { label: 'Thừa', val: `${reviewStats.over} SP`, sub: reviewStats.totalOver > 0 ? `+${reviewStats.totalOver} đơn vị` : null, border: 'border-blue-400', valCls: 'text-blue-700', icon: faArrowUp, iconCls: 'text-blue-500' },
                { label: 'Thiếu', val: `${reviewStats.under} SP`, sub: reviewStats.totalUnder < 0 ? `${reviewStats.totalUnder} đơn vị` : null, border: 'border-red-400', valCls: 'text-red-700', icon: faArrowDown, iconCls: 'text-red-500' },
                { label: 'Khớp', val: `${reviewStats.match} SP`, sub: null, border: 'border-green-400', valCls: 'text-green-700', icon: faMinus, iconCls: 'text-green-500' },
              ].map(c => (
                <div key={c.label} className={`bg-white rounded-xl px-[18px] py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-1 border-l-4 ${c.border}`}>
                  {'icon' in c && <FontAwesomeIcon icon={c.icon!} className={`text-[15px] ${c.iconCls}`} />}
                  <span className="text-xs text-gray-400 font-semibold">{c.label}</span>
                  <span className={`text-[22px] font-black ${c.valCls}`}>{c.val}</span>
                  {c.sub && <span className="text-xs text-gray-400">{c.sub}</span>}
                </div>
              ))}
            </div>

            {(reviewStats.over > 0 || reviewStats.under > 0) && (
              <div className="flex items-center gap-2.5 bg-amber-50 border-[1.5px] border-amber-400 rounded-xl px-4 py-3 text-[13.5px] text-amber-800">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>Có <strong>{reviewStats.over + reviewStats.under}</strong> sản phẩm chênh lệch. Vui lòng kiểm tra trước khi duyệt.</span>
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
                <TableHead />
                {reviewItems.map((item, i) => (
                  <div key={item.productId} className={`grid [grid-template-columns:2fr_1fr_110px_110px_110px_1.5fr] border-b border-gray-50 last:border-b-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${item.diff !== 0 ? 'bg-amber-50/30' : ''}`}>
                    <div className="px-3.5 py-2.5 flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-gray-900">{item.productName}</span>
                      <span className="text-[11px] text-gray-400 font-mono">{item.productCode}</span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11.5px] font-semibold">{item.category}</span>
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
                onClick={() => setStep('input')} disabled={submitting}
              >
                <FontAwesomeIcon icon={faChevronLeft} /> Quay lại chỉnh sửa
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-gray-400">Sau khi duyệt, tồn kho sẽ được cập nhật ngay lập tức</span>
                <button
                  className="flex items-center gap-2 h-[38px] px-5 border-none bg-green-500 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-600 active:scale-95 transition-all font-[inherit] disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={handleApprove} disabled={submitting}
                >
                  {submitting
                    ? <><FontAwesomeIcon icon={faSpinner} spin /> Đang cập nhật...</>
                    : <><FontAwesomeIcon icon={faCheckCircle} /> Duyệt & Cập nhật tồn kho</>
                  }
                </button>
              </div>
            </div>
          </>)}
        </div>

      ) : (
        /* ── Tab Lịch sử ── */
        <div className="flex-1 px-6 pt-4 pb-6 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-[40px]" />
              <p className="text-sm text-gray-400 m-0">Chưa có lịch sử kiểm kho nào</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {history.map(rec => (
                <details key={rec.id} className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
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
                    <TableHead />
                    {rec.items.map((item, i) => (
                      <div key={item.productId} className={`grid [grid-template-columns:2fr_1fr_110px_110px_110px_1.5fr] border-b border-gray-50 last:border-b-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                        <div className="px-3.5 py-2.5 flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-gray-900">{item.productName}</span>
                          <span className="text-[11px] text-gray-400 font-mono">{item.productCode}</span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11.5px] font-semibold">{item.category}</span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center text-sm font-bold text-gray-600">{item.systemStock}</div>
                        <div className="px-3.5 py-2.5 flex items-center">
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${diffCls(item.diff)}`}>{item.actualStock}</span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center"><DiffBadge diff={item.diff} /></div>
                        <div className="px-3.5 py-2.5 flex items-center">
                          <span className="text-[12.5px] text-gray-500 italic">{item.note || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockCheck;