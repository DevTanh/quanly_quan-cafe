import React, { useState } from 'react';
import type { ProductAPI } from '../../api/products.api';
import type { ProductForm } from '../../types';
import { LoadingState, ErrorState, PageLayout } from '../ui';
import { useProducts, useProductFilter } from './hooks/useProducts';
import ProductSidebar from './components/ProductSidebar';
import ProductToolbar from './components/ProductToolbar';
import ProductTable from './components/ProductTable';
import ProductModal from './components/ProductModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

type ModalState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; product: ProductAPI };

type DeleteState =
  | { open: false }
  | { open: true; mode: 'single'; product: ProductAPI }
  | { open: true; mode: 'bulk'; ids: number[] };

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

const Products: React.FC = () => {
  const { products, categories, loading, error, retry,
    addProduct, updateProduct, deleteProduct, bulkDeleteProducts,
    toggleStatus, exportExcel, importExcel } = useProducts();

  const {
    filters, setSearch, toggleFilter, clearFilters, clearAll,
    filtered, categoriesWithCount, activeFilterCount,
  } = useProductFilter(products, categories);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [modalError, setModalError] = useState<string | null>(null);

  if (loading) return <LoadingState message="Đang tải sản phẩm..." />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const closeModal = () => { setModal({ open: false }); setModalError(null); };

  const handleSave = async (form: ProductForm) => {
    try {
      if (modal.open && modal.mode === 'edit') {
        await updateProduct(modal.product.id, form);
      } else {
        await addProduct(form);
      }
      closeModal();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setModalError(Array.isArray(msg) ? msg[0] : msg || 'Thao tác thất bại.');
    }
  };

  const handleDelete = async () => {
    if (!deleteState.open) return;

    if (deleteState.mode === 'single') {
      await deleteProduct(deleteState.product.id);
      setSelectedIds(prev => prev.filter(id => id !== deleteState.product.id));
    } else {
      await bulkDeleteProducts(deleteState.ids);
      setSelectedIds([]);
    }

    setDeleteState({ open: false });
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setDeleteState({ open: true, mode: 'bulk', ids: selectedIds });
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(filtered.every(p => selectedIds.includes(p.id)) ? [] : filtered.map(p => p.id));

  const deleteLabel = deleteState.open
    ? deleteState.mode === 'bulk'
      ? `${deleteState.ids.length} sản phẩm đã chọn`
      : deleteState.product.name
    : '';

  return (
    <PageLayout
      sidebar={
        <ProductSidebar
          search={filters.search}
          onSearchChange={setSearch}
          menuTypes={filters.menuTypes}
          categoryIds={filters.categoryIds}
          statuses={filters.statuses}
          categories={categoriesWithCount}
          activeFilterCount={activeFilterCount}
          onToggleMenu={v => toggleFilter('menuTypes', v)}
          onToggleCategory={id => toggleFilter('categoryIds', id)}
          onToggleStatus={v => toggleFilter('statuses', v)}
          onClearFilters={clearFilters}
        />
      }
    >
      <ProductToolbar
        totalCount={products.length}
        filteredCount={filtered.length}
        selectedCount={selectedIds.length}
        onAdd={() => { setModalError(null); setModal({ open: true, mode: 'add' }); }}
        onImport={async e => { const f = e.target.files?.[0]; if (f) await importExcel(f); e.target.value = ''; }}
        onExport={exportExcel}
        onBulkDelete={handleBulkDelete}
      />

      <ProductTable
        products={filtered}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onToggleStatus={(p, e) => { e.stopPropagation(); toggleStatus(p); }}
        onEdit={p => { setModalError(null); setModal({ open: true, mode: 'edit', product: p }); }}
        onDelete={p => setDeleteState({ open: true, mode: 'single', product: p })}
        hasFilters={activeFilterCount > 0 || !!filters.search}
        onClearFilters={clearAll}
      />

      {filtered.length > 0 && (
        <div className="px-3.5 py-2.5 text-[13px] text-gray-500 bg-white border-t border-gray-100 rounded-b-lg -mt-2.5">
          Hiển thị <strong className="text-gray-900">{filtered.length}</strong> /{' '}
          <strong className="text-gray-900">{products.length}</strong> sản phẩm
        </div>
      )}

      {modal.open && (
        <ProductModal
          mode={modal.mode}
          categories={categories}
          initialData={modal.mode === 'edit' ? toForm(modal.product) : undefined}
          onClose={closeModal}
          onSave={handleSave}
          apiError={modalError}
        />
      )}

      {deleteState.open && (
        <DeleteConfirmModal
          productName={deleteLabel}
          onCancel={() => setDeleteState({ open: false })}
          onConfirm={handleDelete}
        />
      )}
    </PageLayout>
  );
};

export default Products;