import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToggleOn, faToggleOff, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { ProductAPI } from '../../../api/products.api';
import { EmptyState, IconBtn } from '../../ui';

const MENU_TYPE_LABEL: Record<string, string> = {
  beverage: 'Đồ uống',
  food: 'Đồ ăn',
  other: 'Khác',
};

const MENU_TAG_CLS: Record<string, string> = {
  beverage: 'bg-blue-100 text-blue-700',
  food: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
};

const fmt = (n: number | string) => Number(n).toLocaleString('vi-VN') + 'đ';

const HEADERS = [
  '', 'Ảnh', 'Tên hàng', 'Danh mục', 'Loại TĐ',
  'Giá bán', 'Giá vốn', 'Tồn kho', 'T.thái', 'Thao tác',
];
const GRID_COLS = '36px 60px 220px 100px 110px 100px 100px 80px 80px 100px';

interface ProductTableProps {
  products: ProductAPI[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onToggleStatus: (product: ProductAPI, e: React.MouseEvent) => void;
  onEdit: (product: ProductAPI) => void;
  onDelete: (product: ProductAPI) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products, selectedIds,
  onToggleSelect, onToggleSelectAll,
  onToggleStatus, onEdit, onDelete,
  hasFilters, onClearFilters,
}) => {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const allSelected = products.length > 0 && products.every(p => selectedIds.includes(p.id));

  return (
    <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden overflow-x-auto flex-1">
      {/* Header row */}
      <div
        className="grid min-w-[1100px] bg-green-50 border-b-2 border-green-200"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        {HEADERS.map((h, i) => (
          <div
            key={i}
            className={`px-2.5 py-[11px] text-xs font-bold text-green-800 uppercase tracking-[0.4px] whitespace-nowrap overflow-hidden text-ellipsis flex items-center ${
              i === 0 || i === 1 || i === 8 ? 'justify-center' : i >= 5 && i <= 7 ? 'justify-end' : ''
            }`}
          >
            {i === 0
              ? <input type="checkbox" className="accent-green-600" checked={allSelected} onChange={onToggleSelectAll} />
              : h}
          </div>
        ))}
      </div>

      {/* Body */}
      {products.length === 0 ? (
        <EmptyState
          message="Không tìm thấy hàng hóa nào phù hợp"
          action={hasFilters ? { label: 'Xoá bộ lọc', onClick: onClearFilters } : undefined}
        />
      ) : (
        products.map((p, i) => (
          <div
            key={p.id}
            className={`grid min-w-[1100px] border-b border-gray-100 cursor-pointer transition-colors last:border-b-0 hover:bg-gray-50 ${
              selectedIds.includes(p.id) ? 'bg-green-50' : i % 2 === 1 ? 'bg-gray-50/60' : ''
            }`}
            style={{ gridTemplateColumns: GRID_COLS }}
            onClick={() => onToggleSelect(p.id)}
          >
            {/* Checkbox */}
            <div className="flex items-center justify-center px-2.5 py-2.5">
              <input
                type="checkbox"
                className="accent-green-600"
                checked={selectedIds.includes(p.id)}
                onChange={() => onToggleSelect(p.id)}
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Image */}
            <div className="flex items-center justify-center px-2.5 py-2.5">
              {!imgErrors[p.id] && p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-[38px] h-[38px] rounded-lg object-cover border border-gray-200 bg-gray-100"
                  onError={() => setImgErrors(prev => ({ ...prev, [p.id]: true }))}
                />
              ) : (
                <div className="w-[38px] h-[38px] rounded-lg bg-gray-100 border border-gray-200" />
              )}
            </div>

            {/* Name + code */}
            <div className="flex flex-col gap-0.5 justify-center px-2.5 py-2.5 overflow-hidden">
              <span className="font-semibold text-gray-900 text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">
                {p.name}
              </span>
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

            {/* Selling price */}
            <div className="flex items-center justify-end px-2.5 py-2.5 font-semibold text-green-600 text-[13px]">
              {fmt(p.sellingPrice)}
            </div>

            {/* Cost price */}
            <div className="flex items-center justify-end px-2.5 py-2.5 text-gray-500 text-[13px]">
              {fmt(p.costPrice)}
            </div>

            {/* Stock */}
            <div className="flex items-center justify-end px-2.5 py-2.5 text-[13px]">
              {p.stock === 0 && p.minStock === 0
                ? <span className="text-gray-400 text-base">∞</span>
                : <span className={p.stock <= p.minStock ? 'text-red-500 font-bold' : 'text-gray-700 font-medium'}>
                    {p.stock}
                  </span>
              }
            </div>

            {/* Status toggle */}
            <div
              className="flex items-center justify-center px-2.5 py-2.5"
              onClick={e => onToggleStatus(p, e)}
            >
              <FontAwesomeIcon
                icon={p.status === 'active' ? faToggleOn : faToggleOff}
                className={`text-[22px] ${p.status === 'active' ? 'text-green-500' : 'text-gray-300'}`}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 px-2.5 py-2.5" onClick={e => e.stopPropagation()}>
              <IconBtn variant="edit" title="Chỉnh sửa" onClick={() => onEdit(p)}>
                <FontAwesomeIcon icon={faPen} />
              </IconBtn>
              <IconBtn variant="delete" title="Xoá" onClick={() => onDelete(p)}>
                <FontAwesomeIcon icon={faTrash} />
              </IconBtn>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ProductTable;
