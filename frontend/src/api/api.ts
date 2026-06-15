// src/api/api.ts
// Base URL đọc từ .env → VITE_API_URL=http://localhost:8080/api/v1

import axios from 'axios';
import { globalToast } from '../context/ToastContext';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true, // Bắt buộc để gửi/nhận HttpOnly cookie
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(null);
  });
  failedQueue = [];
};

/**
 * Lấy message lỗi từ response BE (NestJS trả { message: string | string[] }).
 */
const extractErrorMessage = (err: any): string => {
  const data = err?.response?.data;
  if (!data) return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
  if (Array.isArray(data.message)) return data.message.join('; ');
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
};

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const status: number = err.response?.status;

    // ── 401: Thử refresh token trước khi logout ─────────────────
    if (
      status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403: Không có quyền ─────────────────────────────────────
    if (status === 403) {
      globalToast.error('Bạn không có quyền thực hiện thao tác này.');
      return Promise.reject(err);
    }

    // ── 404: Không tìm thấy ─────────────────────────────────────
    if (status === 404) {
      const msg = extractErrorMessage(err);
      globalToast.error(msg !== 'Đã xảy ra lỗi. Vui lòng thử lại.' ? msg : 'Không tìm thấy dữ liệu.');
      return Promise.reject(err);
    }

    // ── 400: Bad request — validate lỗi ─────────────────────────
    if (status === 400) {
      const msg = extractErrorMessage(err);
      globalToast.error(msg);
      return Promise.reject(err);
    }

    // ── 409: Conflict ──────────────────────────────────────────
    if (status === 409) {
      const msg = extractErrorMessage(err);
      globalToast.error(msg);
      return Promise.reject(err);
    }

    // ── 422: Unprocessable entity ──────────────────────────────
    if (status === 422) {
      const msg = extractErrorMessage(err);
      globalToast.error(`Dữ liệu không hợp lệ: ${msg}`);
      return Promise.reject(err);
    }

    // ── 5xx: Server error ──────────────────────────────────────
    if (status >= 500) {
      globalToast.error('Lỗi máy chủ. Vui lòng thử lại sau.');
      return Promise.reject(err);
    }

    // ── Network error (không có response) ─────────────────────
    if (!err.response) {
      globalToast.error('Không thể kết nối máy chủ. Kiểm tra kết nối mạng.');
      return Promise.reject(err);
    }

    return Promise.reject(err);
  },
);

export default api;
