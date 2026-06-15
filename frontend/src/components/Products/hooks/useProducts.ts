import { useState, useEffect, useCallback, useMemo } from 'react';
import { productsApi, type ProductAPI, type Category } from '../../../api/products.api';
import type { ProductForm } from '../../../types';

export interface ProductFilters {
  search: string;
  menuTypes: string[];
  categoryIds: number[];
  statuses: string[];
}

const parseNum = (s: string) => parseInt(s.replace(/\D/g, '') || '0', 10);

const makeFormData = (form: ProductForm): FormData => {
  const fd = new FormData();
  fd.append('name', form.name);
  fd.append('categoryId', form.category);
  fd.append('menuType', form.menuType);
  fd.append('sellingPrice', String(parseNum(form.price)));
  fd.append('costPrice', String(parseNum(form.cost)));
  if (form.stock) fd.append('stock', form.stock);
  fd.append('status', form.status ? 'active' : 'inactive');

  if (form.imageFile) {
    fd.append('image', form.imageFile);
  }
  return fd;
};

export function useProducts() {
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodRes, catRes] = await Promise.all([
        productsApi.getAll({ limit: 100 }),
        productsApi.getCategories(),
      ]);
      setProducts(prodRes.data.data ?? []);
      setCategories(catRes ?? []);
    } catch {
      setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addProduct = async (form: ProductForm) => {
    await productsApi.create(makeFormData(form));
    fetchAll();
  };

  const updateProduct = async (id: number, form: ProductForm) => {
    await productsApi.update(id, makeFormData(form));
    fetchAll();
  };

  const deleteProduct = async (id: number) => {
    await productsApi.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const bulkDeleteProducts = async (ids: number[]) => {
    await productsApi.bulkDelete(ids);
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
  };

  const toggleStatus = async (product: ProductAPI) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
    try {
      await productsApi.toggleStatus(product.id, newStatus);
    } catch {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: product.status } : p));
    }
  };

  const exportExcel = async () => {
    const res = await productsApi.exportExcel();
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importExcel = async (file: File) => {
    await productsApi.importExcel(file);
    fetchAll();
  };

  return {
    products,
    categories,
    loading,
    error,
    retry: fetchAll,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkDeleteProducts,
    toggleStatus,
    exportExcel,
    importExcel,
  };
}

export function useProductFilter(products: ProductAPI[], categories: Category[]) {
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    menuTypes: [],
    categoryIds: [],
    statuses: [],
  });

  const filtered = useMemo(() => products.filter(p => {
    const q = filters.search.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
    if (filters.menuTypes.length && !filters.menuTypes.includes(p.menuType)) return false;
    if (filters.categoryIds.length && !filters.categoryIds.includes(p.categoryId)) return false;
    if (filters.statuses.length) {
      const isActive = p.status === 'active';
      if (filters.statuses.includes('Đang kinh doanh') && !isActive) return false;
      if (filters.statuses.includes('Ngừng kinh doanh') && isActive) return false;
    }
    return true;
  }), [products, filters]);

  const categoriesWithCount = useMemo(
    () => categories.map(cat => ({
      ...cat,
      count: products.filter(p => p.categoryId === cat.id).length,
    })),
    [categories, products],
  );

  const activeFilterCount =
    filters.menuTypes.length + filters.categoryIds.length + filters.statuses.length;

  const toggleFilter = <T,>(key: keyof ProductFilters, val: T) => {
    setFilters(prev => {
      const arr = prev[key] as T[];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val],
      };
    });
  };

  const clearFilters = () => setFilters(prev => ({
    ...prev, menuTypes: [], categoryIds: [], statuses: [],
  }));

  const clearAll = () => setFilters({
    search: '', menuTypes: [], categoryIds: [], statuses: [],
  });

  return {
    filters,
    setSearch: (search: string) => setFilters(prev => ({ ...prev, search })),
    toggleFilter,
    clearFilters,
    clearAll,
    filtered,
    categoriesWithCount,
    activeFilterCount,
  };
}