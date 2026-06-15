/**
 * src/components/public/CustomerMenu.tsx
 *
 * Màn hình gọi món qua QR — tối ưu cho điện thoại.
 * Mount độc lập, KHÔNG cần AuthProvider hay cookie nhân viên.
 *
 * URL: http://yourdomain.com/?qr=1&tableId=5
 *
 * Luồng:
 *  1. Đọc tableId từ query string
 *  2. GET /public/qr-order/table/:id  → tên bàn
 *  3. GET /public/qr-order/menu       → danh sách món
 *  4. Khách chọn món, điều chỉnh SL, ghi chú
 *  5. POST /public/qr-order           → tạo đơn
 *  6. Hiển thị màn hình xác nhận thành công
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import axios from 'axios';

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */
interface MenuProduct {
  id: number;
  name: string;
  code: string;
  sellingPrice: number;
  imageUrl?: string;
  description?: string;
  menuType: string;
  category: { id: number; name: string };
}

interface TableInfo {
  id: number;
  name: string;
  zoneName: string;
  isActive: boolean;
}

interface CartItem {
  product: MenuProduct;
  quantity: number;
  note: string;
}

interface CartState {
  items: Record<number, CartItem>; // keyed by productId
}

type CartAction =
  | { type: 'ADD'; product: MenuProduct }
  | { type: 'REMOVE'; productId: number }
  | { type: 'SET_QTY'; productId: number; qty: number }
  | { type: 'SET_NOTE'; productId: number; note: string }
  | { type: 'CLEAR' };

type ViewScreen = 'menu' | 'cart' | 'success' | 'error';

interface QrOrderResult {
  orderId: number;
  tableName: string;
  subtotal: number;
  message: string;
  items: {
    productName: string;
    quantity: number;
    lineTotal: number;
  }[];
}

/* ─────────────────────────────────────────────────────────────────
   CART REDUCER
───────────────────────────────────────────────────────────────── */
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items[action.product.id];
      return {
        items: {
          ...state.items,
          [action.product.id]: {
            product: action.product,
            quantity: (existing?.quantity ?? 0) + 1,
            note: existing?.note ?? '',
          },
        },
      };
    }
    case 'REMOVE': {
      const next = { ...state.items };
      delete next[action.productId];
      return { items: next };
    }
    case 'SET_QTY': {
      if (action.qty <= 0) {
        const next = { ...state.items };
        delete next[action.productId];
        return { items: next };
      }
      return {
        items: {
          ...state.items,
          [action.productId]: {
            ...state.items[action.productId],
            quantity: action.qty,
          },
        },
      };
    }
    case 'SET_NOTE': {
      if (!state.items[action.productId]) return state;
      return {
        items: {
          ...state.items,
          [action.productId]: {
            ...state.items[action.productId],
            note: action.note,
          },
        },
      };
    }
    case 'CLEAR':
      return { items: {} };
    default:
      return state;
  }
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const BASE_URL =
  (typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.VITE_API_URL
    : undefined) ?? 'http://localhost:8080/api/v1';

const publicApi = axios.create({ baseURL: BASE_URL });

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n)) + '₫';

const CATEGORY_EMOJI: Record<string, string> = {
  'cà phê': '☕',
  'coffee': '☕',
  'trà': '🍵',
  'tea': '🍵',
  'sinh tố': '🥤',
  'nước ép': '🍊',
  'đồ ăn': '🍽️',
  'food': '🍽️',
  'bánh': '🧁',
  'cake': '🧁',
  'snack': '🍿',
};

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '🍀';
}

/* ─────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────── */

/** Thanh đầu trang */
const TopBar: React.FC<{
  tableName: string;
  zoneName: string;
  cartCount: number;
  screen: ViewScreen;
  onCartClick: () => void;
  onBackClick: () => void;
}> = ({ tableName, zoneName, cartCount, screen, onCartClick, onBackClick }) => (
  <header
    style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      color: '#fff',
      padding: '14px 16px 12px',
      boxShadow: '0 2px 12px rgba(22,163,74,0.35)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}
  >
    {screen === 'cart' && (
      <button
        onClick={onBackClick}
        style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0,
        }}
      >
        ←
      </button>
    )}

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
        {screen === 'cart' ? 'Giỏ hàng của bạn' : 'Thực đơn'}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
        📍 {zoneName ? `${zoneName} — ` : ''}{tableName}
      </div>
    </div>

    {screen === 'menu' && (
      <button
        onClick={onCartClick}
        style={{
          position: 'relative',
          background: cartCount > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
          border: '1.5px solid rgba(255,255,255,0.4)',
          borderRadius: 12, padding: '8px 14px',
          color: '#fff', fontSize: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.2s',
        }}
      >
        🛒
        {cartCount > 0 && (
          <span
            style={{
              position: 'absolute', top: -6, right: -6,
              background: '#ef4444', color: '#fff',
              fontSize: 11, fontWeight: 800,
              width: 20, height: 20, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #15803d',
            }}
          >
            {cartCount > 9 ? '9+' : cartCount}
          </span>
        )}
      </button>
    )}
  </header>
);

/** Thanh tìm kiếm + filter danh mục */
const SearchBar: React.FC<{
  search: string;
  onSearch: (v: string) => void;
  categories: string[];
  activeCategory: string;
  onCategory: (c: string) => void;
}> = ({ search, onSearch, categories, activeCategory, onCategory }) => (
  <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 16px 0' }}>
    {/* Search input */}
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f5f7f5', borderRadius: 12, padding: '10px 14px',
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Tìm món..."
        style={{
          flex: 1, border: 'none', background: 'transparent',
          fontSize: 15, color: '#1a1a1a', outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      {search && (
        <button
          onClick={() => onSearch('')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999', padding: 0 }}
        >
          ✕
        </button>
      )}
    </div>

    {/* Category tabs */}
    <div
      style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 10,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {['Tất cả', ...categories].map(cat => (
        <button
          key={cat}
          onClick={() => onCategory(cat)}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: 20,
            border: activeCategory === cat ? '1.5px solid #16a34a' : '1.5px solid #e5e7eb',
            background: activeCategory === cat ? '#16a34a' : '#fff',
            color: activeCategory === cat ? '#fff' : '#4b5563',
            fontSize: 13, fontWeight: activeCategory === cat ? 700 : 500,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {cat !== 'Tất cả' && getCategoryEmoji(cat) + ' '}{cat}
        </button>
      ))}
    </div>
  </div>
);

/** Card một sản phẩm trong menu */
const ProductCard: React.FC<{
  product: MenuProduct;
  cartQty: number;
  onAdd: () => void;
  onRemove: () => void;
}> = ({ product, cartQty, onAdd, onRemove }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: cartQty > 0
        ? '0 0 0 2px #16a34a, 0 4px 16px rgba(22,163,74,0.15)'
        : '0 1px 6px rgba(0,0,0,0.08)',
      transition: 'box-shadow 0.2s',
    }}
  >
    {/* Product image */}
    {product.imageUrl ? (
      <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#f3f4f6' }}>
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    ) : (
      <div
        style={{
          width: '100%', aspectRatio: '16/9',
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 42,
        }}
      >
        {getCategoryEmoji(product.category.name)}
      </div>
    )}

    {/* Info */}
    <div style={{ padding: '10px 12px 12px' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 3 }}>
        {product.name}
      </div>
      {product.description && (
        <div
          style={{
            fontSize: 12, color: '#6b7280', marginBottom: 6,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}
        >
          {product.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>
          {fmt(product.sellingPrice)}
        </span>

        {/* Quantity control */}
        {cartQty > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onRemove}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '1.5px solid #16a34a', background: '#fff',
                color: '#16a34a', fontSize: 18, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              −
            </button>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', minWidth: 20, textAlign: 'center' }}>
              {cartQty}
            </span>
            <button
              onClick={onAdd}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: 'none', background: '#16a34a',
                color: '#fff', fontSize: 18, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: 'none', background: '#16a34a',
              color: '#fff', fontSize: 20, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(22,163,74,0.4)',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            +
          </button>
        )}
      </div>
    </div>
  </div>
);

/** Màn hình giỏ hàng */
const CartScreen: React.FC<{
  cartItems: CartItem[];
  subtotal: number;
  orderNote: string;
  submitting: boolean;
  onQtyChange: (productId: number, qty: number) => void;
  onNoteChange: (productId: number, note: string) => void;
  onOrderNoteChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}> = ({
  cartItems, subtotal, orderNote, submitting,
  onQtyChange, onNoteChange, onOrderNoteChange, onSubmit, onBack,
}) => (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 140 }}>
      {cartItems.length === 0 ? (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 300, gap: 12, color: '#9ca3af',
          }}
        >
          <span style={{ fontSize: 60 }}>🛒</span>
          <p style={{ fontSize: 15, margin: 0 }}>Giỏ hàng trống</p>
          <button
            onClick={onBack}
            style={{
              marginTop: 8, padding: '10px 24px',
              background: '#16a34a', border: 'none',
              borderRadius: 12, color: '#fff', fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Chọn món
          </button>
        </div>
      ) : (
        <>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cartItems.map(item => (
              <div
                key={item.product.id}
                style={{
                  background: '#fff', borderRadius: 14,
                  padding: '14px 14px 12px',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  {/* Emoji thumbnail */}
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      overflow: 'hidden',
                    }}
                  >
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : getCategoryEmoji(item.product.category.name)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{item.product.name}</div>
                    <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>
                      {fmt(item.product.sellingPrice)} × {item.quantity} = {fmt(item.product.sellingPrice * item.quantity)}
                    </div>
                  </div>

                  {/* Qty control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => onQtyChange(item.product.id, item.quantity - 1)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: '1.5px solid #d1d5db', background: '#f9fafb',
                        fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#374151',
                      }}
                    >
                      {item.quantity === 1 ? '🗑' : '−'}
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 800, minWidth: 18, textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: 'none', background: '#16a34a',
                        fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Per-item note */}
                <input
                  value={item.note}
                  onChange={e => onNoteChange(item.product.id, e.target.value)}
                  placeholder={`Ghi chú cho ${item.product.name} (ít đá, không đường...)`}
                  maxLength={200}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1.5px solid #e5e7eb', borderRadius: 10,
                    padding: '8px 12px', fontSize: 13, color: '#374151',
                    background: '#f9fafb', outline: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#16a34a')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
            ))}
          </div>

          {/* Order-level note */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              📝 Ghi chú cho cả đơn
            </div>
            <textarea
              value={orderNote}
              onChange={e => onOrderNoteChange(e.target.value)}
              placeholder="Yêu cầu đặc biệt cho cả bàn..."
              maxLength={500}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid #e5e7eb', borderRadius: 12,
                padding: '10px 12px', fontSize: 13, color: '#374151',
                background: '#fff', outline: 'none', fontFamily: 'inherit',
                resize: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#16a34a')}
              onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
        </>
      )}

      {/* Sticky submit bar */}
      {cartItems.length > 0 && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff',
            borderTop: '1px solid #e5e7eb',
            padding: '12px 16px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            zIndex: 200,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {cartItems.reduce((s, i) => s + i.quantity, 0)} món
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>
                {fmt(subtotal)}
              </div>
            </div>
            <button
              onClick={onSubmit}
              disabled={submitting}
              style={{
                padding: '14px 28px',
                background: submitting
                  ? '#86efac'
                  : 'linear-gradient(135deg, #16a34a, #15803d)',
                border: 'none', borderRadius: 14,
                color: '#fff', fontSize: 16, fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 16px rgba(22,163,74,0.45)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'inherit',
              }}
            >
              {submitting ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  Đang gửi...
                </>
              ) : (
                <>🍽️ Gửi nhà bếp</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

/** Màn hình thành công */
const SuccessScreen: React.FC<{
  orderId: number;
  tableName: string;
  items: { productName: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  message: string;
  onOrderMore: () => void;
}> = ({ orderId, tableName, items, subtotal, message, onOrderMore }) => (
  <div
    style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '32px 20px 100px',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #fff 50%)',
      minHeight: '80vh',
    }}
  >
    {/* Success animation */}
    <div
      style={{
        width: 96, height: 96, borderRadius: '50%',
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 48, marginBottom: 20,
        boxShadow: '0 8px 32px rgba(22,163,74,0.4)',
        animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      ✓
    </div>

    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: '0 0 8px', textAlign: 'center' }}>
      Đặt món thành công!
    </h2>
    <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
      {message}
    </p>

    {/* Order summary card */}
    <div
      style={{
        width: '100%', maxWidth: 380,
        background: '#fff', borderRadius: 18,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        overflow: 'hidden', marginBottom: 24,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          padding: '14px 18px', color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Đơn hàng #{orderId}</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📍 {tableName}</div>
        </div>
        <div style={{ fontSize: 24 }}>🧾</div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 0', borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            <span style={{ fontSize: 14, color: '#374151', flex: 1 }}>
              {item.productName}
              <span style={{ color: '#9ca3af', marginLeft: 4 }}>×{item.quantity}</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginLeft: 12 }}>
              {fmt(item.lineTotal)}
            </span>
          </div>
        ))}

        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 10, paddingTop: 10, borderTop: '2px solid #f0f0f0',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: '#374151' }}>Tổng cộng</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{fmt(subtotal)}</span>
        </div>
      </div>
    </div>

    {/* Info box */}
    <div
      style={{
        width: '100%', maxWidth: 380,
        background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: 12, padding: '12px 16px', marginBottom: 24,
        display: 'flex', gap: 10,
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
      <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
        Nhân viên sẽ phục vụ sớm nhất có thể.
        Nếu cần hỗ trợ, vui lòng gọi nhân viên trực tiếp.
      </p>
    </div>

    {/* Order more button */}
    <button
      onClick={onOrderMore}
      style={{
        padding: '14px 40px',
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        border: 'none', borderRadius: 14,
        color: '#fff', fontSize: 16, fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(22,163,74,0.45)',
        fontFamily: 'inherit',
      }}
    >
      🍽️ Gọi thêm món
    </button>

    <style>{`
      @keyframes popIn {
        from { transform: scale(0); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/** Màn hình lỗi (tableId không hợp lệ) */
const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, minHeight: '70vh', gap: 16, textAlign: 'center',
    }}
  >
    <span style={{ fontSize: 60 }}>⚠️</span>
    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#991b1b', margin: 0 }}>
      Không thể tải thực đơn
    </h2>
    <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
      {message}
    </p>
    <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
      Vui lòng quét lại mã QR trên bàn hoặc liên hệ nhân viên.
    </p>
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
const CustomerMenu: React.FC = () => {
  // ── Lấy tableId từ query string ──────────────────────────────
  const tableId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('tableId');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  }, []);

  // ── State ─────────────────────────────────────────────────────
  const [screen, setScreen] = useState<ViewScreen>('menu');
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setCategory] = useState('Tất cả');
  const [orderNote, setOrderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<QrOrderResult | null>(null);
  const menuScrollRef = useRef<HTMLDivElement>(null);

  // ── Cart reducer ──────────────────────────────────────────────
  const [cart, dispatch] = useReducer(cartReducer, { items: {} });

  const cartItems = useMemo(() => Object.values(cart.items), [cart.items]);
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);
  const subtotal = useMemo(
    () => cartItems.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0),
    [cartItems],
  );

  // ── Fetch data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!tableId) {
      setErrorMsg('URL không hợp lệ — thiếu tableId. Vui lòng quét lại mã QR.');
      setScreen('error');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [tableRes, menuRes] = await Promise.all([
        publicApi.get<TableInfo>(`/public/qr-order/table/${tableId}`),
        publicApi.get<MenuProduct[]>('/public/qr-order/menu'),
      ]);

      const table = tableRes.data;
      if (!table.isActive) {
        setErrorMsg(`Bàn "${table.name}" hiện đang tạm ngưng phục vụ.`);
        setScreen('error');
        return;
      }

      setTableInfo(table);
      setProducts(menuRes.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Không thể kết nối máy chủ. Vui lòng thử lại.';
      setErrorMsg(typeof msg === 'string' ? msg : msg[0] ?? 'Lỗi không xác định');
      setScreen('error');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived data ──────────────────────────────────────────────
  const categories = useMemo(
    () => [...new Set(products.map(p => p.category.name))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== 'Tất cả') {
      list = list.filter(p => p.category.name === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, activeCategory, search]);

  // Group products by category for display
  const groupedProducts = useMemo(() => {
    const groups: Record<string, MenuProduct[]> = {};
    for (const p of filteredProducts) {
      const cat = p.category.name;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [filteredProducts]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0 || !tableId) return;
    try {
      setSubmitting(true);
      const res = await publicApi.post<QrOrderResult>('/public/qr-order', {
        tableId,
        note: orderNote.trim() || undefined,
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          note: item.note.trim() || undefined,
        })),
      });

      setSuccessData(res.data);
      dispatch({ type: 'CLEAR' });
      setOrderNote('');
      setScreen('success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Gửi đơn thất bại. Vui lòng thử lại.';
      alert(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderMore = () => {
    setSuccessData(null);
    setScreen('menu');
    // Scroll to top of menu
    if (menuScrollRef.current) {
      menuScrollRef.current.scrollTop = 0;
    }
  };

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: 'linear-gradient(135deg, #f0fdf4, #fff)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '4px solid #dcfce7',
            borderTopColor: '#16a34a',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>Đang tải thực đơn...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        background: '#f5f7f5',
        display: 'flex', flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overscrollBehavior: 'none',
      }}
    >
      {/* TopBar */}
      <TopBar
        tableName={tableInfo?.name ?? `Bàn #${tableId}`}
        zoneName={tableInfo?.zoneName ?? ''}
        cartCount={cartCount}
        screen={screen}
        onCartClick={() => setScreen('cart')}
        onBackClick={() => setScreen('menu')}
      />

      {/* Screen: error */}
      {screen === 'error' && <ErrorScreen message={errorMsg} />}

      {/* Screen: success */}
      {screen === 'success' && successData && (
        <SuccessScreen
          orderId={successData.orderId}
          tableName={successData.tableName}
          items={successData.items}
          subtotal={successData.subtotal}
          message={successData.message}
          onOrderMore={handleOrderMore}
        />
      )}

      {/* Screen: cart */}
      {screen === 'cart' && (
        <CartScreen
          cartItems={cartItems}
          subtotal={subtotal}
          orderNote={orderNote}
          submitting={submitting}
          onQtyChange={(id, qty) => dispatch({ type: 'SET_QTY', productId: id, qty })}
          onNoteChange={(id, note) => dispatch({ type: 'SET_NOTE', productId: id, note })}
          onOrderNoteChange={setOrderNote}
          onSubmit={handleSubmitOrder}
          onBack={() => setScreen('menu')}
        />
      )}

      {/* Screen: menu */}
      {screen === 'menu' && (
        <>
          <SearchBar
            search={search}
            onSearch={setSearch}
            categories={categories}
            activeCategory={activeCategory}
            onCategory={cat => {
              setCategory(cat);
              if (menuScrollRef.current) menuScrollRef.current.scrollTop = 0;
            }}
          />

          <div
            ref={menuScrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '14px 12px 100px',
              scrollbarWidth: 'none',
            }}
          >
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  minHeight: 260, gap: 10, color: '#9ca3af',
                }}
              >
                <span style={{ fontSize: 48 }}>🔍</span>
                <p style={{ margin: 0, fontSize: 14 }}>Không tìm thấy món</p>
              </div>
            ) : (
              Object.entries(groupedProducts).map(([catName, items]) => (
                <div key={catName} style={{ marginBottom: 20 }}>
                  {/* Category header */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{getCategoryEmoji(catName)}</span>
                    <h3
                      style={{
                        margin: 0, fontSize: 15, fontWeight: 800,
                        color: '#1a1a1a', letterSpacing: 0.2,
                      }}
                    >
                      {catName}
                    </h3>
                    <span
                      style={{
                        fontSize: 11, color: '#9ca3af', background: '#f3f4f6',
                        padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      }}
                    >
                      {items.length} món
                    </span>
                  </div>

                  {/* Product grid — 2 columns */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 10,
                    }}
                  >
                    {items.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        cartQty={cart.items[product.id]?.quantity ?? 0}
                        onAdd={() => dispatch({ type: 'ADD', product })}
                        onRemove={() =>
                          dispatch({
                            type: 'SET_QTY',
                            productId: product.id,
                            qty: (cart.items[product.id]?.quantity ?? 1) - 1,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sticky cart FAB */}
          {cartCount > 0 && (
            <div
              style={{
                position: 'fixed', bottom: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '100%', maxWidth: 480,
                padding: '12px 16px',
                background: '#fff',
                borderTop: '1px solid #e5e7eb',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
                zIndex: 200, boxSizing: 'border-box',
              }}
            >
              <button
                onClick={() => setScreen('cart')}
                style={{
                  width: '100%', padding: '14px 20px',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  border: 'none', borderRadius: 14,
                  color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(22,163,74,0.4)',
                }}
              >
                <span
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    borderRadius: 8, padding: '3px 10px',
                    fontSize: 14, fontWeight: 800,
                  }}
                >
                  {cartCount} món
                </span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Xem giỏ hàng 🛒</span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{fmt(subtotal)}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Export type dùng trong main.tsx ─────────────────────────────
export type { QrOrderResult };
export default CustomerMenu;
