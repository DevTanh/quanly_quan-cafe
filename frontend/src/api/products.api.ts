import api from './api';

// ── Types khớp với backend ──────────────────────────────
export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAPI {
  id: number;
  code: string;
  name: string;
  menuType: 'beverage' | 'food' | 'other';
  categoryId: number;
  status: 'active' | 'inactive';
  imageUrl: string | null;
  imagePublicId: string | null;
  costPrice: string;
  sellingPrice: string;
  stock: number;
  minStock: number;
  maxStock: number;
  createdAt: string;
  updatedAt: string;
  category: Category;
}

export interface ProductsResponse {
  data: ProductAPI[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  menuType?: string;
  status?: string;
}

// ── API calls ───────────────────────────────────────────
export const productsApi = {
  getAll: (params?: ProductQuery) =>
    api.get<ProductsResponse>('/products', { params }),

  getById: (id: number) =>
    api.get<ProductAPI>(`/products/${id}`),

  create: (data: FormData) =>
    api.post<ProductAPI>('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  update: (id: number, data: FormData) =>
    api.patch<ProductAPI>(`/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  delete: (id: number) =>
    api.delete(`/products/${id}`),

  toggleStatus: (id: number, status: 'active' | 'inactive') =>
    api.patch(`/products/${id}`, { status }),

  // Sửa 3 chỗ bị sai endpoint

  getCategories: () =>
    api.get<Category[]>('/categories'),           // ← /categories, không phải /products/categories

  exportExcel: () =>
    api.get('/products/export/excel', { responseType: 'blob' }),   // ← thêm /excel

  downloadTemplate: () =>
    api.get('/products/template/excel', { responseType: 'blob' }), // ← thêm /excel

  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/products/import/excel', form, {             // ← thêm /excel
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};