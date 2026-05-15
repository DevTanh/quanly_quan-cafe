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

const MENU_TYPE_LABEL: Record<string, string> = {
  beverage: 'Đồ uống',
  food: 'Đồ ăn',
  other: 'Khác',
};
const MENU_TYPE_OPTIONS = Object.entries(MENU_TYPE_LABEL);
const STATUS_OPTS = ['Đang kinh doanh', 'Ngừng kinh doanh'];

const fmt = (n: number | string) => Number(n).toLocaleString('vi-VN') + 'đ';

const toForm = (p: ProductAPI): ProductForm => ({
  name: p.name,
  category: String(p.categoryId),
  menuType: p.menuType,
  price: Number(p.sellingPrice).toLocaleString('vi-VN'),
  cost: Number(p.costPrice).toLocaleString('vi-VN'),
  stock: p.stock === 0 ? '' : String(p.stock),
  unit: '',
  status: p.status === 'active',
  image: p.imageUrl ?? '',
});

const parseNum = (s: string) => parseInt(s.replace(/\D/g, '') || '0', 10);

type ModalState = { open: false } | { open: true; mode: 'add' } | { open: true; mode: 'edit'; product: ProductAPI };
type DeleteState = { open: false } | { open: true; product: ProductAPI };

const MENU_TAG_CLS: Record<string, string> = {
  beverage: 'bg-blue-100 text-blue-700',
  food: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [modalError, setModalError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [checkedMenu, setCheckedMenu] = useState<string[]>([]);
  const [checkedCat, setCheckedCat] = useState<number[]>([]);
  const [checkedStatus, setCheckedStatus] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(true);
  const [showCat, setShowCat] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  /* ── Fetch ── */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [prodRes, catRes] = await Promise.all([
        productsApi.getAll({ limit: 100 }),
        productsApi.getCategories(),
      ]);
      setProducts(prodRes.data.data ?? []);
      setCategories(catRes ?? []);
    } catch {
      setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* ── Filter ── */
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

  /* ── Modal helpers ── */
  const closeModal = () => {
    setModal({ open: false });
    setModalError(null);
  };

  /* ── Actions ── */
  const handleToggleStatus = async (p: ProductAPI, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x));
    try { await productsApi.toggleStatus(p.id, newStatus); }
    catch { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: p.status } : x)); }
  };

  /* ── Build FormData — FIX: append file thật hoặc URL ── */
  const makeFormData = (form: ProductForm) => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('categoryId', form.category);
    fd.append('menuType', form.menuType);
    fd.append('sellingPrice', String(parseNum(form.price)));
    fd.append('costPrice', String(parseNum(form.cost)));
    if (form.stock) fd.append('stock', form.stock);
    fd.append('status', form.status ? 'active' : 'inactive');

    // Ưu tiên file thật (upload Cloudinary), fallback sang URL thuần
    if (form.imageFile) {
      fd.append('image', form.imageFile);                          // → backend nhận qua @UploadedFile()
    } else if (form.image && !form.image.startsWith('data:')) {
      fd.append('imageUrl', form.image);                           // → URL thuần lưu thẳng vào DB
    }
    // base64 không có file đi kèm → bỏ qua, không gửi

    return fd;
  };

  const handleAdd = async (form: ProductForm) => {
    try {
      await productsApi.create(makeFormData(form));
      closeModal();
      fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setModalError(Array.isArray(msg) ? msg[0] : msg || 'Thêm sản phẩm thất bại.');
    }
  };

  const handleUpdate = async (form: ProductForm) => {
    if (!modal.open || modal.mode !== 'edit') return;
    try {
      await productsApi.update(modal.product.id, makeFormData(form));
      closeModal();
      fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setModalError(Array.isArray(msg) ? msg[0] : msg || 'Cập nhật sản phẩm thất bại.');
    }
  };

  const handleDelete = async () => {
    if (!deleteState.open) return;
    try {
      await productsApi.delete(deleteState.product.id);
      setSelectedRows(prev => prev.filter(id => id !== deleteState.product.id));
      setDeleteState({ open: false });
      fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      console.error('Xoá thất bại:', msg || err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await productsApi.exportExcel();
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `products_${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await productsApi.importExcel(file); fetchProducts(); }
    catch (err) { console.error(err); }
    e.target.value = '';
  };

  /* ── Sidebar Section ── */
  const Section = ({ title, open, onToggle, children }: {
    title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg px-3.5 pt-3.5 pb-2.5 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between cursor-pointer select-none mb-2" onClick={onToggle}>
        <span className="text-[13px] font-semibold text-gray-700">{title}</span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-[11px] text-gray-400" />
      </div>
      {open && <div className="flex flex-col gap-1.5">{children}</div>}
    </div>
  );

  /* ── Loading / Error ── */
  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] gap-3 text-gray-500">
      <FontAwesomeIcon icon={faSpinner} spin />
      <span>Đang tải sản phẩm...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-red-500">
      <span>{error}</span>
      <button
        className="px-4 py-2 rounded-md border border-red-400 text-red-500 bg-white cursor-pointer hover:bg-red-50 text-sm font-[inherit]"
        onClick={fetchProducts}
      >
        Thử lại
      </button>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-92px)] bg-gray-100 font-[Segoe_UI,sans-serif]">

      {/* Modals */}
      {modal.open && (
        <ProductModal
          mode={modal.mode}
          categories={categories}
          initialData={modal.mode === 'edit' ? toForm(modal.product) : undefined}
          onClose={closeModal}
          onSave={modal.mode === 'add' ? handleAdd : handleUpdate}
          apiError={modalError}
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
      <aside className="w-[270px] flex-shrink-0 flex flex-col p-3">

        {/* Search */}
        <div className="bg-white rounded-lg px-3.5 py-3.5 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="relative flex items-center">
            <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 text-gray-400 text-xs pointer-events-none" />
            <input
              className="w-full pl-7 pr-3 py-[7px] border border-gray-300 rounded-md text-[13px] text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:shadow-[0_0_0_2px_rgba(22,163,74,0.1)] font-[inherit]"
              placeholder="Theo mã, tên hàng hóa"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Active filter badge */}
        {activeFilters > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2 text-xs text-amber-800 mb-2">
            <FontAwesomeIcon icon={faFilter} className="text-amber-400" />
            <span>Đang lọc: {activeFilters} bộ lọc</span>
            <button
              className="ml-auto bg-transparent border-none text-red-500 text-xs cursor-pointer underline p-0 font-[inherit]"
              onClick={clearAll}
            >Xoá hết</button>
          </div>
        )}

        {/* Loại TĐ */}
        <Section title="Loại thực đơn" open={showMenu} onToggle={() => setShowMenu(!showMenu)}>
          {MENU_TYPE_OPTIONS.map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
              <input type="checkbox" className="w-[15px] h-[15px] accent-green-600 cursor-pointer"
                checked={checkedMenu.includes(val)} onChange={() => toggle(checkedMenu, val, setCheckedMenu)} />
              <span>{label}</span>
            </label>
          ))}
        </Section>

        {/* Danh mục */}
        <Section title="Danh mục" open={showCat} onToggle={() => setShowCat(!showCat)}>
          {categories.map(cat => (
            <label key={cat.id} className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
              <input type="checkbox" className="w-[15px] h-[15px] accent-green-600 cursor-pointer"
                checked={checkedCat.includes(cat.id)} onChange={() => toggle(checkedCat, cat.id, setCheckedCat)} />
              <span className="flex-1">{cat.name}</span>
              <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-px rounded-xl font-semibold">
                {products.filter(p => p.categoryId === cat.id).length}
              </span>
            </label>
          ))}
        </Section>

        {/* Trạng thái */}
        <Section title="Trạng thái" open={showStatus} onToggle={() => setShowStatus(!showStatus)}>
          {STATUS_OPTS.map(t => (
            <label key={t} className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
              <input type="checkbox" className="w-[15px] h-[15px] accent-green-600 cursor-pointer"
                checked={checkedStatus.includes(t)} onChange={() => toggle(checkedStatus, t, setCheckedStatus)} />
              <span>{t}</span>
            </label>
          ))}
        </Section>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 px-3 pt-3 pb-3 pl-1 flex flex-col gap-2.5">

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[13px] text-gray-500">
            Tổng <strong className="text-gray-900">{filtered.length}</strong> sản phẩm
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13.5px] font-medium cursor-pointer border-none bg-green-600 text-white hover:bg-green-700 transition-colors font-[inherit]"
              onClick={() => setModal({ open: true, mode: 'add' })}
            >
              <FontAwesomeIcon icon={faPlus} /><span>Thêm mới</span>
            </button>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13.5px] font-medium cursor-pointer bg-white text-green-600 border border-green-500 hover:bg-green-50 transition-colors font-[inherit]">
              <FontAwesomeIcon icon={faFileImport} /><span>Import</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13.5px] font-medium cursor-pointer bg-white text-green-600 border border-green-500 hover:bg-green-50 transition-colors font-[inherit]"
              onClick={handleExport}
            >
              <FontAwesomeIcon icon={faFileExport} /><span>Xuất file</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden overflow-x-auto flex-1">

          {/* Header */}
          <div className="grid min-w-[1100px] [grid-template-columns:36px_60px_220px_100px_110px_100px_100px_80px_80px_100px] bg-green-50 border-b-2 border-green-200">
            {['', 'Ảnh', 'Tên hàng', 'Danh mục', 'Loại TĐ', 'Giá bán', 'Giá vốn', 'Tồn kho', 'T.thái', 'Thao tác'].map((h, i) => (
              <div
                key={i}
                className={`px-2.5 py-[11px] text-xs font-bold text-green-800 uppercase tracking-[0.4px] whitespace-nowrap overflow-hidden text-ellipsis ${i === 0 ? 'flex items-center justify-center' : i === 1 ? 'flex items-center justify-center' : i >= 5 && i <= 7 ? 'flex items-center justify-end' : i === 8 ? 'flex items-center justify-center' : 'flex items-center'}`}
              >
                {i === 0 ? <input type="checkbox" className="accent-green-600" checked={allSelected} onChange={toggleAll} /> : h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2.5 bg-white">
              <span className="text-[40px]">📦</span>
              <p className="m-0 text-sm text-gray-400">Không tìm thấy hàng hóa nào phù hợp</p>
              {(activeFilters > 0 || search) && (
                <button
                  className="mt-1 px-4 py-[7px] bg-white border border-gray-300 rounded-md cursor-pointer text-[13px] text-gray-700 hover:bg-gray-50 font-[inherit]"
                  onClick={() => { clearAll(); setSearch(''); }}
                >Xoá bộ lọc</button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  className={`grid min-w-[1100px] [grid-template-columns:36px_60px_220px_100px_110px_100px_100px_80px_80px_100px] border-b border-gray-100 cursor-pointer transition-colors last:border-b-0 ${selectedRows.includes(p.id) ? 'bg-green-50' : i % 2 === 1 ? 'bg-gray-50/60' : ''} hover:bg-gray-50`}
                  onClick={() => toggleRow(p.id)}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center px-2.5 py-2.5">
                    <input type="checkbox" className="accent-green-600" checked={selectedRows.includes(p.id)}
                      onChange={() => toggleRow(p.id)} onClick={e => e.stopPropagation()} />
                  </div>

                  {/* Image */}
                  <div className="flex items-center justify-center px-2.5 py-2.5">
                    {!imgErrors[p.id] && p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name}
                        className="w-[38px] h-[38px] rounded-lg object-cover border border-gray-200 bg-gray-100"
                        onError={() => setImgErrors(prev => ({ ...prev, [p.id]: true }))} />
                    ) : (
                      <div className="w-[38px] h-[38px] rounded-lg bg-gray-100 border border-gray-200" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex flex-col gap-0.5 justify-center px-2.5 py-2.5 overflow-hidden">
                    <span className="font-semibold text-gray-900 text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</span>
                    <span className="text-[11px] text-gray-400">{p.code}</span>
                  </div>

                  {/* Category */}
                  <div className="flex items-center px-2.5 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-[11.5px] font-semibold bg-violet-100 text-violet-700 whitespace-nowrap">
                      {p.category.name}
                    </span>
                  </div>

                  {/* Menu type */}
                  <div className="flex items-center px-2.5 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap ${MENU_TAG_CLS[p.menuType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {MENU_TYPE_LABEL[p.menuType] ?? p.menuType}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-end px-2.5 py-2.5 font-semibold text-green-600 text-[13px]">
                    {fmt(p.sellingPrice)}
                  </div>

                  {/* Cost */}
                  <div className="flex items-center justify-end px-2.5 py-2.5 text-gray-500 text-[13px]">
                    {fmt(p.costPrice)}
                  </div>

                  {/* Stock */}
                  <div className="flex items-center justify-end px-2.5 py-2.5 text-[13px]">
                    {p.stock === 0 && p.minStock === 0
                      ? <span className="text-gray-400 text-base">∞</span>
                      : <span className={p.stock <= p.minStock ? 'text-red-500 font-bold' : 'text-gray-700 font-medium'}>{p.stock}</span>
                    }
                  </div>

                  {/* Status toggle */}
                  <div className="flex items-center justify-center px-2.5 py-2.5" onClick={e => handleToggleStatus(p, e)}>
                    <FontAwesomeIcon
                      icon={p.status === 'active' ? faToggleOn : faToggleOff}
                      className={`text-[22px] ${p.status === 'active' ? 'text-green-500' : 'text-gray-300'}`}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 px-2.5 py-2.5" onClick={e => e.stopPropagation()}>
                    <button
                      className="w-[30px] h-[30px] border-none rounded-lg cursor-pointer flex items-center justify-center text-xs bg-blue-50 text-blue-500 hover:bg-blue-100 active:scale-90 transition-all"
                      title="Chỉnh sửa"
                      onClick={() => { setModalError(null); setModal({ open: true, mode: 'edit', product: p }); }}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      className="w-[30px] h-[30px] border-none rounded-lg cursor-pointer flex items-center justify-center text-xs bg-red-50 text-red-500 hover:bg-red-100 active:scale-90 transition-all"
                      title="Xoá"
                      onClick={() => setDeleteState({ open: true, product: p })}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-3.5 py-2.5 text-[13px] text-gray-500 bg-white border-t border-gray-100 rounded-b-lg -mt-2.5">
            {selectedRows.length > 0
              ? <span>Đã chọn <strong className="text-gray-900">{selectedRows.length}</strong> sản phẩm</span>
              : <span>Hiển thị <strong className="text-gray-900">{filtered.length}</strong> / <strong className="text-gray-900">{products.length}</strong> sản phẩm</span>
            }
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;