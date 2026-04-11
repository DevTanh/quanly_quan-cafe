import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faImage, faToggleOn, faToggleOff,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import type { Category } from '../../api/products.api';  // ← import từ đây
import type { ProductForm } from '../../types';
import './ProductModal.css';

// ── Các giá trị gửi lên backend (snake_case khớp API) ──
const MENU_TYPE_OPTIONS = [
  { value: 'beverage', label: 'Đồ uống' },
  { value: 'food',     label: 'Đồ ăn'  },
  { value: 'other',    label: 'Khác'   },
];
const UNITS = ['Ly', 'Phần', 'Cái', 'Hộp', 'Kg', 'Lít'];

const INIT: ProductForm = {
  name: '', category: '', menuType: '',
  price: '', cost: '', stock: '', unit: '',
  status: true, image: '',
};

interface Props {
  mode: 'add' | 'edit';
  categories: Category[];   // ← nhận từ Products.tsx
  initialData?: ProductForm;
  onClose: () => void;
  onSave: (form: ProductForm) => void;
}

const ProductModal: React.FC<Props> = ({
  mode, categories, initialData, onClose, onSave
}) => {
  const [form,    setForm]    = useState<ProductForm>(initialData ?? INIT);
  const [errors,  setErrors]  = useState<Partial<Record<keyof ProductForm, string>>>({});
  const [preview, setPreview] = useState<string>(initialData?.image ?? '');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
      setPreview(initialData.image ?? '');
    } else {
      setForm(INIT);
      setPreview('');
    }
    setImgError(false);
  }, [initialData, mode]);

  const set = (k: keyof ProductForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim())  e.name     = 'Vui lòng nhập tên hàng hóa';
    if (!form.category)     e.category = 'Vui lòng chọn danh mục';
    if (!form.menuType)     e.menuType = 'Vui lòng chọn loại thực đơn';
    if (!form.price || isNaN(Number(form.price.replace(/\D/g, ''))))
                            e.price    = 'Giá bán không hợp lệ';
    if (!form.unit)         e.unit     = 'Vui lòng chọn đơn vị';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => { if (validate()) onSave(form); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPreview(url);
      set('image', url);
      setImgError(false);
    };
    reader.readAsDataURL(file);
  };

  const formatNumber = (val: string) => {
    const num = val.replace(/\D/g, '');
    return num ? Number(num).toLocaleString('vi-VN') : '';
  };

  return (
    <div className="pm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal">

        {/* Header */}
        <div className="pm-header">
          <h2 className="pm-title">
            {mode === 'edit' ? 'Chỉnh sửa hàng hóa' : 'Thêm hàng hóa mới'}
          </h2>
          <button className="pm-close" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Body */}
        <div className="pm-body">

          {/* Cột ảnh */}
          <div className="pm-image-col">
            <div className="pm-img-box"
              onClick={() => document.getElementById('img-upload')?.click()}>
              {preview && !imgError ? (
                <img src={preview} alt="preview" className="pm-preview-img"
                  onError={() => setImgError(true)} />
              ) : (
                <div className="pm-img-placeholder">
                  <FontAwesomeIcon icon={faImage} className="pm-img-icon" />
                  <span>Nhấn để tải ảnh lên</span>
                </div>
              )}
            </div>
            <input id="img-upload" type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleFileUpload} />
            <input
              className="pm-input"
              placeholder="Hoặc dán URL ảnh..."
              value={form.image.startsWith('data:') ? '' : form.image}
              onChange={e => { set('image', e.target.value); setPreview(e.target.value); setImgError(false); }}
            />
            <div className="pm-status-box">
              <span className="pm-label">Trạng thái</span>
              <button
                className={`pm-toggle ${form.status ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => set('status', !form.status)}
              >
                <FontAwesomeIcon icon={form.status ? faToggleOn : faToggleOff} className="pm-toggle-icon" />
                <span>{form.status ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}</span>
              </button>
            </div>
          </div>

          {/* Cột fields */}
          <div className="pm-fields-col">

            {/* Tên */}
            <div className="pm-field">
              <label className="pm-label">Tên hàng hóa <span className="required">*</span></label>
              <input
                className={`pm-input ${errors.name ? 'input-error' : ''}`}
                placeholder="Nhập tên sản phẩm..."
                value={form.name}
                onChange={e => { set('name', e.target.value); setErrors(v => ({ ...v, name: '' })); }}
              />
              {errors.name && <span className="pm-error">{errors.name}</span>}
            </div>

            {/* Loại thực đơn — value = beverage/food/other khớp backend */}
            <div className="pm-field">
              <label className="pm-label">Loại thực đơn <span className="required">*</span></label>
              <div className="pm-select-wrap">
                <select
                  className={`pm-select ${errors.menuType ? 'input-error' : ''}`}
                  value={form.menuType}
                  onChange={e => { set('menuType', e.target.value); setErrors(v => ({ ...v, menuType: '' })); }}
                >
                  <option value="">-- Chọn --</option>
                  {MENU_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <FontAwesomeIcon icon={faChevronDown} className="select-arrow" />
              </div>
              {errors.menuType && <span className="pm-error">{errors.menuType}</span>}
            </div>

            {/* Danh mục — value = categoryId (string) khớp backend */}
            <div className="pm-field">
              <label className="pm-label">Danh mục <span className="required">*</span></label>
              <div className="pm-select-wrap">
                <select
                  className={`pm-select ${errors.category ? 'input-error' : ''}`}
                  value={form.category}
                  onChange={e => { set('category', e.target.value); setErrors(v => ({ ...v, category: '' })); }}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
                <FontAwesomeIcon icon={faChevronDown} className="select-arrow" />
              </div>
              {errors.category && <span className="pm-error">{errors.category}</span>}
            </div>

            {/* Giá */}
            <div className="pm-row">
              <div className="pm-field">
                <label className="pm-label">Giá bán (đ) <span className="required">*</span></label>
                <input
                  className={`pm-input ${errors.price ? 'input-error' : ''}`}
                  placeholder="0"
                  value={form.price}
                  onChange={e => { set('price', formatNumber(e.target.value)); setErrors(v => ({ ...v, price: '' })); }}
                />
                {errors.price && <span className="pm-error">{errors.price}</span>}
              </div>
              <div className="pm-field">
                <label className="pm-label">Giá vốn (đ)</label>
                <input
                  className="pm-input"
                  placeholder="0"
                  value={form.cost}
                  onChange={e => set('cost', formatNumber(e.target.value))}
                />
              </div>
            </div>

            {/* Tồn kho + Đơn vị */}
            <div className="pm-row">
              <div className="pm-field">
                <label className="pm-label">Tồn kho</label>
                <input
                  className="pm-input"
                  placeholder="Để trống = không giới hạn"
                  value={form.stock}
                  onChange={e => set('stock', e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="pm-field">
                <label className="pm-label">Đơn vị tính <span className="required">*</span></label>
                <div className="pm-select-wrap">
                  <select
                    className={`pm-select ${errors.unit ? 'input-error' : ''}`}
                    value={form.unit}
                    onChange={e => { set('unit', e.target.value); setErrors(v => ({ ...v, unit: '' })); }}
                  >
                    <option value="">-- Chọn --</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} className="select-arrow" />
                </div>
                {errors.unit && <span className="pm-error">{errors.unit}</span>}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="pm-footer">
          <button className="btn-cancel" onClick={onClose}>Huỷ</button>
          <button className="btn-save" onClick={handleSave}>
            {mode === 'edit' ? 'Cập nhật' : 'Lưu sản phẩm'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProductModal;