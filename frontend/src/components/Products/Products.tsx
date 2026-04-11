import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faFileImport, faFileExport,
  faChevronDown, faChevronUp, faSearch,
  faFilter, faToggleOn, faToggleOff,
  faPen, faTrash, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { productsApi, type ProductAPI, type Category } from '../../api/products.api';
import type { ProductForm } from '../../types';
import ProductModal from './ProductModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import './Products.css';

// ── Constants ────────────────────────────────────────────
const MENU_TYPE_LABEL: Record<string, string> = {
  beverage: 'Đồ uống',
  food: 'Đồ ăn',
  other: 'Khác',
};
const MENU_TYPE_OPTIONS = Object.entries(MENU_TYPE_LABEL);
const STATUS_OPTS = ['Đang kinh doanh', 'Ngừng kinh doanh'];

const fmt = (n: number | string) =>
  Number(n).toLocaleString('vi-VN') + 'đ';

// Convert ProductAPI → ProductForm (để truyền vào modal edit)
const toForm = (p: ProductAPI): ProductForm => ({
  name: p.name,
  category: String(p.categoryId),   // dùng id để submit
  menuType: p.menuType,
  price: Number(p.sellingPrice).toLocaleString('vi-VN'),
  cost: Number(p.costPrice).toLocaleString('vi-VN'),
  stock: p.stock === 0 ? '' : String(p.stock),
  unit: '',                      // backend chưa có unit → để trống
  status: p.status === 'active',
  image: p.imageUrl ?? '',
});

const parseNum = (s: string) => parseInt(s.replace(/\D/g, '') || '0', 10);

// ── Modal state types ────────────────────────────────────
type ModalState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; product: ProductAPI };

type DeleteState =
  | { open: false }
  | { open: true; product: ProductAPI };

// ── Component ────────────────────────────────────────────
const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [search, setSearch] = useState('');
  const [checkedMenu, setCheckedMenu] = useState<string[]>([]);
  const [checkedCat, setCheckedCat] = useState<number[]>([]);
  const [checkedStatus, setCheckedStatus] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(true);
  const [showCat, setShowCat] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  // ── Fetch data ──────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodRes, catRes] = await Promise.all([
        productsApi.getAll({ limit: 100 }),
        productsApi.getCategories(),
      ]);
      setProducts(prodRes.data.data);
      setCategories(catRes.data);
    } catch (err) {
      setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Filter ──────────────────────────────────────────────
  const filtered = useMemo(() => products.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
    if (checkedMenu.length && !checkedMenu.includes(p.menuType)) return false;
    if (checkedCat.length && !checkedCat.includes(p.categoryId)) return false;
    if (checkedStatus.length) {
      const isActive = p.status === 'active';
      if (checkedStatus.includes('Đang kinh doanh') && !isActive) return false;
      if (checkedStatus.includes('Ngừng kinh doanh') && isActive) return false;
    }
    return true;
  }), [products, search, checkedMenu, checkedCat, checkedStatus]);

  const toggle = <T,>(arr: T[], val: T, set: (a: T[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const allSelected = filtered.length > 0 && filtered.every(p => selectedRows.includes(p.id));
  const toggleAll = () => setSelectedRows(allSelected ? [] : filtered.map(p => p.id));
  const toggleRow = (id: number) => toggle(selectedRows, id, setSelectedRows);
  const activeFilters = checkedMenu.length + checkedCat.length + checkedStatus.length;
  const clearAll = () => { setCheckedMenu([]); setCheckedCat([]); setCheckedStatus([]); };

  // ── Actions ──────────────────────────────────────────────
  const handleToggleStatus = async (p: ProductAPI, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    // Optimistic update
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x));
    try {
      await productsApi.toggleStatus(p.id, newStatus);
    } catch {
      // Rollback nếu lỗi
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: p.status } : x));
    }
  };

  const handleAdd = async (form: ProductForm) => {
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('categoryId', form.category);
      fd.append('menuType', form.menuType);
      fd.append('sellingPrice', String(parseNum(form.price)));
      fd.append('costPrice', String(parseNum(form.cost)));
      if (form.stock) fd.append('stock', form.stock);
      fd.append('status', form.status ? 'active' : 'inactive');
      // Nếu là file blob thì upload, nếu là URL thì bỏ qua (backend dùng Cloudinary)
      await productsApi.create(fd);
      setModal({ open: false });
      fetchProducts(); // Reload từ server
    } catch (err) {
      console.error('Lỗi tạo sản phẩm:', err);
    }
  };

  const handleUpdate = async (form: ProductForm) => {
    if (!modal.open || modal.mode !== 'edit') return;
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('categoryId', form.category);
      fd.append('menuType', form.menuType);
      fd.append('sellingPrice', String(parseNum(form.price)));
      fd.append('costPrice', String(parseNum(form.cost)));
      if (form.stock) fd.append('stock', form.stock);
      fd.append('status', form.status ? 'active' : 'inactive');
      await productsApi.update(modal.product.id, fd);
      setModal({ open: false });
      fetchProducts();
    } catch (err) {
      console.error('Lỗi cập nhật sản phẩm:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteState.open) return;
    try {
      await productsApi.delete(deleteState.product.id);
      setSelectedRows(prev => prev.filter(id => id !== deleteState.product.id));
      setDeleteState({ open: false });
      fetchProducts();
    } catch (err) {
      console.error('Lỗi xóa sản phẩm:', err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await productsApi.exportExcel();
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await productsApi.importExcel(file);
      fetchProducts();
    } catch (err) {
      console.error('Lỗi import Excel:', err);
    }
    e.target.value = '';
  };

  // ── Sidebar Section component ────────────────────────────
  const Section = ({ title, open, onToggle, children }: {
    title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
  }) => (
    <div className="sidebar-section">
      <div className="section-header" onClick={onToggle}>
        <span className="section-title">{title}</span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="section-chevron" />
      </div>
      {open && <div className="checkbox-list">{children}</div>}
    </div>
  );

  // ── Render ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#6b7280' }}>
      <FontAwesomeIcon icon={faSpinner} spin />
      <span>Đang tải sản phẩm...</span>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#ef4444' }}>
      <span>{error}</span>
      <button onClick={fetchProducts} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ef4444', color: '#ef4444', background: 'white', cursor: 'pointer' }}>
        Thử lại
      </button>
    </div>
  );

  return (
    <div className="page-layout">
      {modal.open && (
        <ProductModal
          mode={modal.mode}
          categories={categories}
          initialData={modal.mode === 'edit' ? toForm(modal.product) : undefined}
          onClose={() => setModal({ open: false })}
          onSave={modal.mode === 'add' ? handleAdd : handleUpdate}
        />
      )}
      {deleteState.open && (
        <DeleteConfirmModal
          productName={deleteState.product.name}
          onCancel={() => setDeleteState({ open: false })}
          onConfirm={handleDelete}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="search-wrap">
            <FontAwesomeIcon icon={faSearch} className="search-icon-sb" />
            <input className="sidebar-input pl-search" placeholder="Theo mã, tên hàng hóa"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {activeFilters > 0 && (
          <div className="filter-badge-row">
            <FontAwesomeIcon icon={faFilter} />
            <span>Đang lọc: {activeFilters} bộ lọc</span>
            <button className="clear-filter" onClick={clearAll}>Xoá hết</button>
          </div>
        )}

        <Section title="Loại thực đơn" open={showMenu} onToggle={() => setShowMenu(!showMenu)}>
          {MENU_TYPE_OPTIONS.map(([val, label]) => (
            <label key={val} className="checkbox-item">
              <input type="checkbox" checked={checkedMenu.includes(val)}
                onChange={() => toggle(checkedMenu, val, setCheckedMenu)} />
              <span>{label}</span>
            </label>
          ))}
        </Section>

        <Section title="Danh mục" open={showCat} onToggle={() => setShowCat(!showCat)}>
          {categories.map(cat => (
            <label key={cat.id} className="checkbox-item">
              <input type="checkbox" checked={checkedCat.includes(cat.id)}
                onChange={() => toggle(checkedCat, cat.id, setCheckedCat)} />
              <span className="cat-label">{cat.name}</span>
              <span className="cat-count">{products.filter(p => p.categoryId === cat.id).length}</span>
            </label>
          ))}
        </Section>

        <Section title="Trạng thái" open={showStatus} onToggle={() => setShowStatus(!showStatus)}>
          {STATUS_OPTS.map(t => (
            <label key={t} className="checkbox-item">
              <input type="checkbox" checked={checkedStatus.includes(t)}
                onChange={() => toggle(checkedStatus, t, setCheckedStatus)} />
              <span>{t}</span>
            </label>
          ))}
        </Section>
      </aside>

      {/* ── MAIN ── */}
      <main className="page-main">
        <div className="page-toolbar">
          <div className="toolbar-left">
            <span className="result-count">Tổng <strong>{filtered.length}</strong> sản phẩm</span>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'add' })}>
              <FontAwesomeIcon icon={faPlus} /><span>Thêm mới</span>
            </button>
            <label className="btn btn-green-outline" style={{ cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faFileImport} /><span>Import</span>
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
            </label>
            <button className="btn btn-green-outline" onClick={handleExport}>
              <FontAwesomeIcon icon={faFileExport} /><span>Xuất file</span>
            </button>
          </div>
        </div>

        <div className="products-table">
          <div className="products-table-header grid-row">
            <div className="col col-check">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            </div>
            <div className="col col-img">Ảnh</div>
            <div className="col col-name">Tên hàng</div>
            <div className="col col-cat">Danh mục</div>
            <div className="col col-menu">Loại TĐ</div>
            <div className="col col-price">Giá bán</div>
            <div className="col col-cost">Giá vốn</div>
            <div className="col col-stock">Tồn kho</div>
            <div className="col col-status">Trạng thái</div>
            <div className="col col-actions">Thao tác</div>
          </div>

          {filtered.length === 0 ? (
            <div className="table-empty">
              <span className="empty-emoji">📦</span>
              <p>Không tìm thấy hàng hóa nào phù hợp</p>
              {(activeFilters > 0 || search) && (
                <button className="clear-filter-btn" onClick={() => { clearAll(); setSearch(''); }}>
                  Xoá bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="products-table-body">
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  className={`data-row grid-row ${selectedRows.includes(p.id) ? 'row-selected' : ''} ${i % 2 === 1 ? 'row-alt' : ''}`}
                  onClick={() => toggleRow(p.id)}
                >
                  <div className="col col-check">
                    <input type="checkbox" checked={selectedRows.includes(p.id)}
                      onChange={() => toggleRow(p.id)} onClick={e => e.stopPropagation()} />
                  </div>

                  <div className="col col-img">
                    {!imgErrors[p.id] && p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="product-img"
                        onError={() => setImgErrors(prev => ({ ...prev, [p.id]: true }))} />
                    ) : (
                      <div className="product-img-fallback" />
                    )}
                  </div>

                  <div className="col col-name">
                    <span className="product-name">{p.name}</span>
                    <span className="product-id">{p.code}</span>
                  </div>

                  <div className="col col-cat">
                    <span className="tag tag-cat">{p.category.name}</span>
                  </div>

                  <div className="col col-menu">
                    <span className={`tag tag-${p.menuType === 'beverage' ? 'drink' : p.menuType === 'food' ? 'food' : 'other'}`}>
                      {MENU_TYPE_LABEL[p.menuType] ?? p.menuType}
                    </span>
                  </div>

                  <div className="col col-price">{fmt(p.sellingPrice)}</div>
                  <div className="col col-cost">{fmt(p.costPrice)}</div>

                  <div className="col col-stock">
                    {p.stock === 0 && p.minStock === 0
                      ? <span className="stock-inf">∞</span>
                      : <span className={p.stock <= p.minStock ? 'stock-low' : 'stock-ok'}>{p.stock}</span>
                    }
                  </div>

                  <div className="col col-status" onClick={e => handleToggleStatus(p, e)}>
                    <FontAwesomeIcon
                      icon={p.status === 'active' ? faToggleOn : faToggleOff}
                      className={`status-toggle ${p.status === 'active' ? 'toggle-on' : 'toggle-off'}`}
                    />
                  </div>

                  <div className="col col-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn edit-btn" title="Chỉnh sửa"
                      onClick={() => setModal({ open: true, mode: 'edit', product: p })}>
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button className="action-btn delete-btn" title="Xoá"
                      onClick={() => setDeleteState({ open: true, product: p })}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="table-footer">
            {selectedRows.length > 0
              ? <span>Đã chọn <strong>{selectedRows.length}</strong> sản phẩm</span>
              : <span>Hiển thị <strong>{filtered.length}</strong> / <strong>{products.length}</strong> sản phẩm</span>
            }
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;