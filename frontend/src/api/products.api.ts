// src/api/products.api.ts
// Khớp với product_category.md

import api from './api';
import type { Product, Category, QueryProductDto } from '../types';
import { extractArray } from '../utils/extractArray';

export type ProductAPI = Product;
export type { Category };

export const productsApi = {
  // ─── Products ─────────────────────────────────────────────

  /**
   * GET /products — danh sách có filter/search/pagination (product:view)
   * Response: { data: Product[], total, page, limit, totalPages }
   */
  getAll: async (params?: QueryProductDto) => {
    const res = await api.get('/products', { params });
    const data = extractArray<Product>(res.data);
    return { data: { data } };
  },

  /** findAll — alias trả thẳng mảng (dùng cho modal, POS) */
  findAll: async (query?: QueryProductDto): Promise<Product[]> => {
    const res = await api.get('/products', { params: query });
    return extractArray<Product>(res.data);
  },

  /** GET /products/:id (product:view) */
  findById: async (id: number): Promise<Product> => {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },

  /**
   * POST /products (product:manage)
   * multipart/form-data — hỗ trợ upload ảnh Cloudinary.
   */
  create: async (formData: FormData): Promise<Product> => {
    const { data } = await api.post<Product>('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * PATCH /products/:id (product:manage)
   * multipart/form-data — upload ảnh mới sẽ xóa ảnh cũ trên Cloudinary.
   */
  update: async (id: number, formData: FormData): Promise<Product> => {
    const { data } = await api.patch<Product>(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Toggle active/inactive (product:manage) */
  toggleStatus: async (id: number, status: 'active' | 'inactive'): Promise<Product> => {
    const fd = new FormData();
    fd.append('status', status);
    const { data } = await api.patch<Product>(`/products/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * DELETE /products/:id (product:manage)
   * BE tự xóa ảnh Cloudinary nếu có imagePublicId.
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  /**
   * GET /products/template/excel — tải file mẫu (product:manage)
   */
  downloadTemplate: async () => {
    return api.get('/products/template/excel', { responseType: 'blob' });
  },

  /**
   * POST /products/import/excel — import Excel (product:manage)
   * Partial success: BE trả { inserted, errors[] }
   */
  importExcel: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/products/import/excel', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data; // { inserted: number, errors: { row, message }[] }
  },

  /**
   * GET /products/export/excel — export toàn bộ (product:manage)
   */
  exportExcel: async () => {
    return api.get('/products/export/excel', { responseType: 'blob' });
  },

  // ─── Categories ───────────────────────────────────────────

  /**
   * GET /categories — danh sách active (product:view)
   * Luôn trả về array (không bao giờ undefined).
   */
  getCategories: async (): Promise<Category[]> => {
    const res = await api.get('/categories');
    const arr = extractArray<Category>(res.data);
    return Array.isArray(arr) ? arr : [];
  },

  /**
   * GET /categories/all — kể cả inactive (product:manage)
   */
  getAllCategories: async (): Promise<Category[]> => {
    const res = await api.get('/categories/all');
    return extractArray<Category>(res.data);
  },

  /** GET /categories/:id (product:view) */
  getCategoryById: async (id: number): Promise<Category> => {
    const { data } = await api.get<Category>(`/categories/${id}`);
    return data;
  },

  /** POST /categories (product:manage) */
  createCategory: async (body: { name: string; description?: string }): Promise<Category> => {
    const { data } = await api.post<Category>('/categories', body);
    return data;
  },

  /**
   * PATCH /categories/:id (product:manage)
   * Không được xóa danh mục nếu còn sản phẩm → dùng isActive để ẩn.
   */
  updateCategory: async (
    id: number,
    body: Partial<{ name: string; description: string; isActive: boolean }>,
  ): Promise<Category> => {
    const { data } = await api.patch<Category>(`/categories/${id}`, body);
    return data;
  },

  /**
   * DELETE /categories/:id (product:manage)
   * BE trả 400 nếu còn sản phẩm thuộc danh mục.
   */
  removeCategory: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
