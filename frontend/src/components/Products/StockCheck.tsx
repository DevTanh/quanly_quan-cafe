import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck, faSearch, faChevronDown, faChevronLeft,
  faCheckCircle, faArrowUp, faArrowDown, faMinus,
  faBoxOpen, faRotateLeft, faTriangleExclamation, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { inventoryApi } from '../../api/inventory.api';
import type { ProductAPI } from '../../api/products.api';
import './StockCheck.css';

// ── Types ────────────────────────────────────────────────
interface StockCheckRow {
  product: ProductAPI;
  actualStock: string;
  note: string;
}

interface ReviewItem {
  productId: number;
  productCode: string;
  productName: string;
  category: string;
  systemStock: number;
  actualStock: number;
  diff: number;
  note: string;
}

interface HistoryRecord {
  id: string;
  date: string;
  checker: string;
  totalItems: number;
  totalDiff: number;
  items: ReviewItem[];
}

type Step = 'input' | 'review' | 'done';

const fmtDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

// ── Component ────────────────────────────────────────────
const StockCheck: React.FC = () => {
  const [products,    setProducts]    = useState<ProductAPI[]>([]);
  const [categories,  setCategories]  = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [step,        setStep]        = useState<Step>('input');
  const [mode,        setMode]        = useState<'all' | 'select'>('all');
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('Tất cả');
  const [checker,     setChecker]     = useState('');
  const [checkerErr,  setCheckerErr]  = useState(false);
  const [rows,        setRows]        = useState<StockCheckRow[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [history,     setHistory]     = useState<HistoryRecord[]>([]);
  const [tab,         setTab]         = useState<'check' | 'history'>('check');

  // ── Fetch products từ API ────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getProducts();
      const data = res.data.data;
      setProducts(data);

      // Lấy danh sách categories từ data
      const cats = ['Tất cả', ...Array.from(
        new Set(data.map(p => p.category.name))
      )];
      setCategories(cats);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Lọc sản phẩm cho panel chọn (mode=select) ───────────
  const filteredProducts = useMemo(() =>
    products.filter(p => {
      if (filterCat !== 'Tất cả' && p.category.name !== filterCat) return false;
      const q = search.toLowerCase();
      return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    }), [products, search, filterCat]);

  // ── Sản phẩm có finite stock (mode=all) ─────────────────
  // stock=0 && minStock=0 → coi là không giới hạn → bỏ qua
  const finiteProducts = useMemo(() =>
    products.filter(p => !(p.stock === 0 && p.minStock === 0)),
    [products]
  );

  // ── Active rows hiển thị trong bảng nhập liệu ───────────
  const activeRows: StockCheckRow[] = useMemo(() => {
    if (mode === 'all') {
      return finiteProducts.map(p =>
        rows.find(r => r.product.id === p.id) ?? { product: p, actualStock: '', note: '' }
      );
    }
    return rows;
  }, [mode, rows, finiteProducts]);

  const isInRows = (id: number) => rows.some(r => r.product.id === id);

  const toggleSelect = (p: ProductAPI) => {
    if (isInRows(p.id))
      setRows(prev => prev.filter(r => r.product.id !== p.id));
    else
      setRows(prev => [...prev, { product: p, actualStock: '', note: '' }]);
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

  const getRow = (id: number) => rows.find(r => r.product.id === id);

  const getDiff = (p: ProductAPI, actualStr: string) =>
    actualStr === '' ? null : parseInt(actualStr, 10) - p.stock;

  // ── Stats bảng nhập liệu ─────────────────────────────────
  const stats = useMemo(() => {
    let filled = 0, over = 0, under = 0, match = 0;
    activeRows.forEach(r => {
      const actual = getRow(r.product.id)?.actualStock ?? r.actualStock;
      if (!actual) return;
      filled++;
      const diff = parseInt(actual, 10) - r.product.stock;
      if (diff > 0) over++;
      else if (diff < 0) under++;
      else match++;
    });
    return { filled, over, under, match, total: activeRows.length };
  }, [activeRows, rows]);

  // ── Bước 1 → Bước 2 ─────────────────────────────────────
  const handleGoReview = () => {
    if (!checker.trim()) { setCheckerErr(true); return; }
    setCheckerErr(false);

    const items: ReviewItem[] = activeRows
      .filter(r => (getRow(r.product.id)?.actualStock ?? r.actualStock) !== '')
      .map(r => {
        const actual = parseInt(getRow(r.product.id)?.actualStock ?? r.actualStock, 10);
        return {
          productId:   r.product.id,
          productCode: r.product.code,
          productName: r.product.name,
          category:    r.product.category.name,
          systemStock: r.product.stock,
          actualStock: actual,
          diff:        actual - r.product.stock,
          note:        getRow(r.product.id)?.note ?? '',
        };
      });

    if (items.length === 0) return;
    setReviewItems(items);
    setStep('review');
  };

  // ── Bước 2 → Duyệt: gọi API cập nhật từng sản phẩm ─────
  const handleApprove = async () => {
    try {
      setSubmitting(true);

      // Gọi API song song cho tất cả sản phẩm có chênh lệch
      await Promise.all(
        reviewItems.map(item =>
          inventoryApi.updateStock(item.productId, item.actualStock)
        )
      );

      // Lưu vào lịch sử local
      const record: HistoryRecord = {
        id:         `KC${Date.now()}`,
        date:       fmtDate(new Date()),
        checker:    checker.trim(),
        totalItems: reviewItems.length,
        totalDiff:  reviewItems.reduce((s, i) => s + Math.abs(i.diff), 0),
        items:      reviewItems,
      };
      setHistory(prev => [record, ...prev]);

      // Reset
      setRows([]);
      setChecker('');
      setReviewItems([]);
      setStep('done');

      // Reload products từ server
      await fetchProducts();

      setTimeout(() => setStep('input'), 3500);
    } catch (err) {
      console.error('Lỗi cập nhật tồn kho:', err);
      alert('Có lỗi xảy ra khi cập nhật tồn kho. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRows([]); setSearch(''); setFilterCat('Tất cả');
    setChecker(''); setCheckerErr(false);
  };

  // ── Review stats ─────────────────────────────────────────
  const reviewStats = useMemo(() => ({
    over:       reviewItems.filter(i => i.diff > 0).length,
    under:      reviewItems.filter(i => i.diff < 0).length,
    match:      reviewItems.filter(i => i.diff === 0).length,
    totalOver:  reviewItems.filter(i => i.diff > 0).reduce((s, i) => s + i.diff, 0),
    totalUnder: reviewItems.filter(i => i.diff < 0).reduce((s, i) => s + i.diff, 0),
  }), [reviewItems]);

  // ── Loading state ────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#6b7280' }}>
      <FontAwesomeIcon icon={faSpinner} spin />
      <span>Đang tải dữ liệu tồn kho...</span>
    </div>
  );

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="sc-page">
      {/* Header */}
      <div className="sc-header">
        <div className="sc-header-left">
          <FontAwesomeIcon icon={faClipboardCheck} className="sc-header-icon" />
          <div>
            <h1 className="sc-title">Kiểm kho</h1>
            <p className="sc-subtitle">Đối chiếu tồn kho thực tế với hệ thống</p>
          </div>
        </div>
        <div className="sc-tabs">
          <button className={`sc-tab ${tab === 'check' ? 'active' : ''}`}
            onClick={() => { setTab('check'); setStep('input'); }}>
            Phiếu kiểm kho
          </button>
          <button className={`sc-tab ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}>
            Lịch sử
            {history.length > 0 && <span className="sc-badge">{history.length}</span>}
          </button>
        </div>
      </div>

      {tab === 'check' ? (
        <div className="sc-body">

          {/* ══ DONE ══ */}
          {step === 'done' && (
            <div className="sc-done">
              <div className="sc-done-icon"><FontAwesomeIcon icon={faCheckCircle} /></div>
              <h2 className="sc-done-title">Kiểm kho hoàn tất!</h2>
              <p className="sc-done-sub">Tồn kho đã được cập nhật theo kết quả kiểm.</p>
            </div>
          )}

          {/* ══ INPUT ══ */}
          {step === 'input' && (<>
            {/* Progress */}
            <div className="sc-progress">
              {['Nhập liệu', 'Xem xét', 'Hoàn tất'].map((label, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <div className="sc-progress-line" />}
                  <div className={`sc-progress-step ${i === 0 ? 'active' : ''}`}>
                    <span className="sc-step-num">{i + 1}</span>
                    <span className="sc-step-label">{label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Config */}
            <div className="sc-config">
              <div className="sc-config-left">
                <span className="sc-config-label">Phạm vi kiểm:</span>
                <div className="sc-mode-group">
                  <button className={`sc-mode-btn ${mode === 'all' ? 'active' : ''}`}
                    onClick={() => { setMode('all'); setRows([]); }}>
                    <FontAwesomeIcon icon={faBoxOpen} /> Tất cả sản phẩm
                    <em style={{ fontSize: 11, marginLeft: 4 }}>({finiteProducts.length})</em>
                  </button>
                  <button className={`sc-mode-btn ${mode === 'select' ? 'active' : ''}`}
                    onClick={() => { setMode('select'); setRows([]); }}>
                    <FontAwesomeIcon icon={faClipboardCheck} /> Chọn từng sản phẩm
                  </button>
                </div>
              </div>
              <div className="sc-checker-wrap">
                <input
                  className={`sc-checker-input ${checkerErr ? 'input-err' : ''}`}
                  placeholder="Tên người kiểm kho *"
                  value={checker}
                  onChange={e => { setChecker(e.target.value); setCheckerErr(false); }}
                />
                {checkerErr && <span className="sc-err-msg">Vui lòng nhập tên người kiểm</span>}
              </div>
            </div>

            {/* Select panel */}
            {mode === 'select' && (
              <div className="sc-select-panel">
                <div className="sc-select-toolbar">
                  <div className="sc-search-wrap">
                    <FontAwesomeIcon icon={faSearch} className="sc-search-icon" />
                    <input className="sc-search" placeholder="Tìm theo tên, mã sản phẩm..."
                      value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div className="sc-cat-wrap">
                    <select className="sc-cat-select" value={filterCat}
                      onChange={e => setFilterCat(e.target.value)}>
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <FontAwesomeIcon icon={faChevronDown} className="sc-cat-arrow" />
                  </div>
                </div>
                <div className="sc-product-grid">
                  {filteredProducts.map(p => (
                    <div key={p.id}
                      className={`sc-product-card ${isInRows(p.id) ? 'selected' : ''}`}
                      onClick={() => toggleSelect(p)}>
                      <div className="sc-card-check">
                        {isInRows(p.id)
                          ? <FontAwesomeIcon icon={faCheckCircle} className="sc-check-on" />
                          : <div className="sc-check-off" />}
                      </div>
                      <div className="sc-card-info">
                        <span className="sc-card-name">{p.name}</span>
                        <span className="sc-card-cat">{p.category.name}</span>
                      </div>
                      <div className="sc-card-stock">
                        {p.stock === 0 && p.minStock === 0 ? '∞' : p.stock}
                      </div>
                    </div>
                  ))}
                </div>
                {rows.length > 0 && (
                  <div className="sc-selected-count">
                    Đã chọn <strong>{rows.length}</strong> sản phẩm để kiểm
                  </div>
                )}
              </div>
            )}

            {mode === 'select' && rows.length === 0 && (
              <div className="sc-empty">
                <FontAwesomeIcon icon={faClipboardCheck} className="sc-empty-icon" />
                <p>Chọn sản phẩm ở trên để thêm vào phiếu kiểm</p>
              </div>
            )}

            {/* Input table */}
            {activeRows.length > 0 && (
              <div className="sc-table-wrap">
                <div className="sc-table-header">
                  <span className="sc-table-title">
                    {mode === 'all' ? 'Tất cả sản phẩm có tồn kho' : 'Sản phẩm đã chọn'}
                    <em> ({activeRows.length} sản phẩm)</em>
                  </span>
                  <div className="sc-stats">
                    <span className="sc-stat">Đã nhập: <strong>{stats.filled}/{stats.total}</strong></span>
                    <span className="sc-stat over">Thừa: <strong>{stats.over}</strong></span>
                    <span className="sc-stat under">Thiếu: <strong>{stats.under}</strong></span>
                    <span className="sc-stat match">Khớp: <strong>{stats.match}</strong></span>
                  </div>
                </div>
                <div className="sc-table">
                  <div className="sc-row sc-row-head">
                    <div className="sc-col sc-col-name">Sản phẩm</div>
                    <div className="sc-col sc-col-cat">Danh mục</div>
                    <div className="sc-col sc-col-sys">Tồn hệ thống</div>
                    <div className="sc-col sc-col-actual">Tồn thực tế</div>
                    <div className="sc-col sc-col-diff">Chênh lệch</div>
                    <div className="sc-col sc-col-note">Ghi chú</div>
                  </div>
                  {activeRows.map((r, i) => {
                    const actualStr = getRow(r.product.id)?.actualStock ?? r.actualStock;
                    const diff = getDiff(r.product, actualStr);
                    const note = getRow(r.product.id)?.note ?? '';
                    return (
                      <div key={r.product.id}
                        className={`sc-row sc-row-data ${i % 2 === 1 ? 'alt' : ''}`}>
                        <div className="sc-col sc-col-name">
                          <span className="sc-prod-name">{r.product.name}</span>
                          <span className="sc-prod-id">{r.product.code}</span>
                        </div>
                        <div className="sc-col sc-col-cat">
                          <span className="sc-tag">{r.product.category.name}</span>
                        </div>
                        <div className="sc-col sc-col-sys">
                          <span className="sc-sys-stock">{r.product.stock}</span>
                        </div>
                        <div className="sc-col sc-col-actual">
                          <input
                            className={`sc-actual-input ${
                              diff !== null && diff < 0 ? 'input-under' :
                              diff !== null && diff > 0 ? 'input-over'  :
                              diff === 0               ? 'input-match'  : ''
                            }`}
                            placeholder="Nhập số..."
                            value={actualStr}
                            onChange={e => setActual(r.product.id, e.target.value)}
                          />
                        </div>
                        <div className="sc-col sc-col-diff">
                          {diff === null
                            ? <span className="sc-diff-empty">—</span>
                            : diff === 0
                            ? <span className="sc-diff match"><FontAwesomeIcon icon={faMinus} /> Khớp</span>
                            : diff > 0
                            ? <span className="sc-diff over"><FontAwesomeIcon icon={faArrowUp} /> +{diff}</span>
                            : <span className="sc-diff under"><FontAwesomeIcon icon={faArrowDown} /> {diff}</span>
                          }
                        </div>
                        <div className="sc-col sc-col-note">
                          <input className="sc-note-input" placeholder="Ghi chú..."
                            value={note} onChange={e => setNote(r.product.id, e.target.value)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeRows.length > 0 && (
              <div className="sc-footer">
                <button className="sc-btn-reset" onClick={handleReset}>
                  <FontAwesomeIcon icon={faRotateLeft} /> Làm mới
                </button>
                <div className="sc-footer-right">
                  <span className="sc-footer-hint">
                    {stats.filled === 0
                      ? 'Nhập tồn thực tế để tiếp tục'
                      : `Đã nhập ${stats.filled}/${stats.total} sản phẩm`}
                  </span>
                  <button
                    className={`sc-btn-next ${stats.filled === 0 ? 'disabled' : ''}`}
                    onClick={handleGoReview}
                    disabled={stats.filled === 0}
                  >
                    Xem xét kết quả →
                  </button>
                </div>
              </div>
            )}
          </>)}

          {/* ══ REVIEW ══ */}
          {step === 'review' && (<>
            <div className="sc-progress">
              <div className="sc-progress-step done">
                <span className="sc-step-num"><FontAwesomeIcon icon={faCheckCircle} /></span>
                <span className="sc-step-label">Nhập liệu</span>
              </div>
              <div className="sc-progress-line active" />
              <div className="sc-progress-step active">
                <span className="sc-step-num">2</span>
                <span className="sc-step-label">Xem xét</span>
              </div>
              <div className="sc-progress-line" />
              <div className="sc-progress-step">
                <span className="sc-step-num">3</span>
                <span className="sc-step-label">Hoàn tất</span>
              </div>
            </div>

            <div className="sc-review-summary">
              <div className="sc-sum-card">
                <span className="sc-sum-label">Tổng sản phẩm kiểm</span>
                <span className="sc-sum-val">{reviewItems.length}</span>
              </div>
              <div className="sc-sum-card over">
                <FontAwesomeIcon icon={faArrowUp} className="sc-sum-icon" />
                <span className="sc-sum-label">Thừa</span>
                <span className="sc-sum-val">{reviewStats.over} SP</span>
                {reviewStats.totalOver > 0 && <span className="sc-sum-sub">+{reviewStats.totalOver} đơn vị</span>}
              </div>
              <div className="sc-sum-card under">
                <FontAwesomeIcon icon={faArrowDown} className="sc-sum-icon" />
                <span className="sc-sum-label">Thiếu</span>
                <span className="sc-sum-val">{reviewStats.under} SP</span>
                {reviewStats.totalUnder < 0 && <span className="sc-sum-sub">{reviewStats.totalUnder} đơn vị</span>}
              </div>
              <div className="sc-sum-card match">
                <FontAwesomeIcon icon={faMinus} className="sc-sum-icon" />
                <span className="sc-sum-label">Khớp</span>
                <span className="sc-sum-val">{reviewStats.match} SP</span>
              </div>
            </div>

            {(reviewStats.over > 0 || reviewStats.under > 0) && (
              <div className="sc-review-warning">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>Có <strong>{reviewStats.over + reviewStats.under}</strong> sản phẩm chênh lệch. Vui lòng kiểm tra trước khi duyệt.</span>
              </div>
            )}

            <div className="sc-table-wrap">
              <div className="sc-table-header">
                <span className="sc-table-title">
                  Chi tiết kết quả kiểm kho
                  <em> — Người kiểm: {checker}</em>
                </span>
              </div>
              <div className="sc-table">
                <div className="sc-row sc-row-head">
                  <div className="sc-col sc-col-name">Sản phẩm</div>
                  <div className="sc-col sc-col-cat">Danh mục</div>
                  <div className="sc-col sc-col-sys">Tồn hệ thống</div>
                  <div className="sc-col sc-col-actual">Tồn thực tế</div>
                  <div className="sc-col sc-col-diff">Chênh lệch</div>
                  <div className="sc-col sc-col-note">Ghi chú</div>
                </div>
                {reviewItems.map((item, i) => (
                  <div key={item.productId}
                    className={`sc-row sc-row-data ${i % 2 === 1 ? 'alt' : ''} ${item.diff !== 0 ? 'row-diff' : ''}`}>
                    <div className="sc-col sc-col-name">
                      <span className="sc-prod-name">{item.productName}</span>
                      <span className="sc-prod-id">{item.productCode}</span>
                    </div>
                    <div className="sc-col sc-col-cat"><span className="sc-tag">{item.category}</span></div>
                    <div className="sc-col sc-col-sys"><span className="sc-sys-stock">{item.systemStock}</span></div>
                    <div className="sc-col sc-col-actual">
                      <span className={`sc-actual-badge ${item.diff < 0 ? 'under' : item.diff > 0 ? 'over' : 'match'}`}>
                        {item.actualStock}
                      </span>
                    </div>
                    <div className="sc-col sc-col-diff">
                      {item.diff === 0
                        ? <span className="sc-diff match"><FontAwesomeIcon icon={faMinus} /> Khớp</span>
                        : item.diff > 0
                        ? <span className="sc-diff over"><FontAwesomeIcon icon={faArrowUp} /> +{item.diff}</span>
                        : <span className="sc-diff under"><FontAwesomeIcon icon={faArrowDown} /> {item.diff}</span>
                      }
                    </div>
                    <div className="sc-col sc-col-note">
                      <span className="sc-note-text">{item.note || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sc-footer">
              <button className="sc-btn-reset" onClick={() => setStep('input')}
                disabled={submitting}>
                <FontAwesomeIcon icon={faChevronLeft} /> Quay lại chỉnh sửa
              </button>
              <div className="sc-footer-right">
                <span className="sc-footer-hint">
                  Sau khi duyệt, tồn kho sẽ được cập nhật ngay lập tức
                </span>
                <button className="sc-btn-approve" onClick={handleApprove}
                  disabled={submitting}>
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
        <div className="sc-body">
          {history.length === 0 ? (
            <div className="sc-empty">
              <FontAwesomeIcon icon={faClipboardCheck} className="sc-empty-icon" />
              <p>Chưa có lịch sử kiểm kho nào</p>
            </div>
          ) : (
            <div className="sc-history-list">
              {history.map(rec => (
                <details key={rec.id} className="sc-history-card">
                  <summary className="sc-history-summary">
                    <div className="sc-history-main">
                      <span className="sc-history-id">{rec.id}</span>
                      <span className="sc-history-date">{rec.date}</span>
                      <span className="sc-history-checker">👤 {rec.checker}</span>
                    </div>
                    <div className="sc-history-meta">
                      <span className="sc-history-stat">{rec.totalItems} sản phẩm</span>
                      {rec.totalDiff === 0
                        ? <span className="sc-badge-match">Tất cả khớp</span>
                        : <span className="sc-badge-diff">Chênh lệch: {rec.totalDiff}</span>}
                    </div>
                  </summary>
                  <div className="sc-history-detail">
                    <div className="sc-row sc-row-head">
                      <div className="sc-col sc-col-name">Sản phẩm</div>
                      <div className="sc-col sc-col-cat">Danh mục</div>
                      <div className="sc-col sc-col-sys">Tồn hệ thống</div>
                      <div className="sc-col sc-col-actual">Tồn thực tế</div>
                      <div className="sc-col sc-col-diff">Chênh lệch</div>
                      <div className="sc-col sc-col-note">Ghi chú</div>
                    </div>
                    {rec.items.map(item => (
                      <div key={item.productId} className="sc-row sc-row-data">
                        <div className="sc-col sc-col-name">
                          <span className="sc-prod-name">{item.productName}</span>
                          <span className="sc-prod-id">{item.productCode}</span>
                        </div>
                        <div className="sc-col sc-col-cat"><span className="sc-tag">{item.category}</span></div>
                        <div className="sc-col sc-col-sys">{item.systemStock}</div>
                        <div className="sc-col sc-col-actual">
                          <span className={`sc-actual-badge ${item.diff < 0 ? 'under' : item.diff > 0 ? 'over' : 'match'}`}>
                            {item.actualStock}
                          </span>
                        </div>
                        <div className="sc-col sc-col-diff">
                          {item.diff === 0
                            ? <span className="sc-diff match"><FontAwesomeIcon icon={faMinus} /> Khớp</span>
                            : item.diff > 0
                            ? <span className="sc-diff over"><FontAwesomeIcon icon={faArrowUp} /> +{item.diff}</span>
                            : <span className="sc-diff under"><FontAwesomeIcon icon={faArrowDown} /> {item.diff}</span>
                          }
                        </div>
                        <div className="sc-col sc-col-note">
                          <span className="sc-note-text">{item.note || '—'}</span>
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