import { useState, useMemo, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../../api/inventory.api';
import type { ProductAPI } from '../../../api/products.api';

/* ── Types ── */
export interface StockCheckRow { product: ProductAPI; actualStock: string; note: string }
export interface ReviewItem {
  productId: number; productCode: string; productName: string; category: string;
  systemStock: number; actualStock: number; diff: number; note: string;
}
export interface HistoryRecord {
  id: string; date: string; checker: string;
  totalItems: number; totalDiff: number; items: ReviewItem[];
}
export type Step = 'input' | 'review' | 'done';

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const diffCls = (diff: number | null) => {
  if (diff === null) return '';
  if (diff > 0) return 'bg-blue-50 text-blue-700';
  if (diff < 0) return 'bg-red-50 text-red-700';
  return 'bg-green-50 text-green-700';
};

/* ══════════════════════════════════════════════════════════════ */
export function useStockCheck() {
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
      setCategories(['Tất cả', ...Array.from(new Set<string>(data.map(p => p.category.name)))]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
        rows.find(r => r.product.id === p.id) ?? { product: p, actualStock: '', note: '' },
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

  const reviewStats = useMemo(() => ({
    over: reviewItems.filter(i => i.diff > 0).length,
    under: reviewItems.filter(i => i.diff < 0).length,
    match: reviewItems.filter(i => i.diff === 0).length,
    totalOver: reviewItems.filter(i => i.diff > 0).reduce((s, i) => s + i.diff, 0),
    totalUnder: reviewItems.filter(i => i.diff < 0).reduce((s, i) => s + i.diff, 0),
  }), [reviewItems]);

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
    setReviewItems(items);
    setStep('review');
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
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRows([]); setSearch(''); setFilterCat('Tất cả'); setChecker(''); setCheckerErr(false);
  };

  return {
    products, categories, loading, submitting,
    step, setStep, mode, setMode,
    search, setSearch, filterCat, setFilterCat,
    checker, setChecker, checkerErr, setCheckerErr,
    rows, activeRows, reviewItems, history,
    tab, setTab,
    filteredProducts, finiteProducts,
    isInRows, getRow, getDiff,
    toggleSelect, setActual, setNote,
    stats, reviewStats,
    handleGoReview, handleApprove, handleReset,
    fetchProducts,
  };
}
