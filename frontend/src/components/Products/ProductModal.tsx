import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faImage, faToggleOn, faToggleOff, faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import type { Category } from '../../api/products.api';
import type { ProductForm } from '../../types';

const MENU_TYPE_OPTIONS = [
  { value: 'beverage', label: 'Đồ uống' },
  { value: 'food', label: 'Đồ ăn' },
  { value: 'other', label: 'Khác' },
];
const UNITS = ['Ly', 'Phần', 'Cái', 'Hộp', 'Kg', 'Lít'];

const INIT: ProductForm = {
  name: '', category: '', menuType: '',
  price: '', cost: '', stock: '', unit: '',
  status: true, image: '',
};

interface Props {
  mode: 'add' | 'edit';
  categories: Category[];
  initialData?: ProductForm;
  onClose: () => void;
  onSave: (form: ProductForm) => void;
  apiError?: string | null;
}

/* shared input / select classes */
const inputCls = (err?: string) =>
  `w-full h-[38px] border-[1.5px] rounded-lg px-3 text-[13.5px] text-gray-900 bg-gray-50 outline-none transition-all placeholder:text-gray-300 font-[inherit] focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(61,186,116,0.12)] focus:bg-white ${err ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

const ProductModal: React.FC<Props> = ({ mode, categories, initialData, onClose, onSave, apiError }) => {
  const [form, setForm] = useState<ProductForm>(initialData ?? INIT);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const [preview, setPreview] = useState(initialData?.image ?? '');
  const [imgError, setImgError] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null); // lưu File thật

  useEffect(() => {
    if (initialData) { setForm(initialData); setPreview(initialData.image ?? ''); }
    else { setForm(INIT); setPreview(''); }
    setImageFile(null); // reset file khi đóng/mở modal
    setImgError(false);
  }, [initialData, mode]);

  const set = (k: keyof ProductForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên hàng hóa';
    if (!form.category) e.category = 'Vui lòng chọn danh mục';
    if (!form.menuType) e.menuType = 'Vui lòng chọn loại thực đơn';
    if (!form.price || isNaN(Number(form.price.replace(/\D/g, ''))))
      e.price = 'Giá bán không hợp lệ';
    if (!form.unit) e.unit = 'Vui lòng chọn đơn vị';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Đính kèm imageFile vào form trước khi gọi onSave
  const handleSave = () => {
    if (validate()) onSave({ ...form, imageFile: imageFile ?? undefined });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Lưu File thật để gửi lên server
    setImageFile(file);

    // Chỉ dùng FileReader để hiển thị preview, không lưu base64 vào form
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPreview(url);
      setImgError(false);
    };
    reader.readAsDataURL(file);
  };

  const formatNumber = (val: string) => {
    const num = val.replace(/\D/g, '');
    return num ? Number(num).toLocaleString('vi-VN') : '';
  };

  const SelectWrap = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      {children}
      <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none" />
    </div>
  );

  const FieldErr = ({ msg }: { msg?: string }) =>
    msg ? <span className="text-[11.5px] text-red-500 mt-0.5">{msg}</span> : null;

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-[3px] flex items-center justify-center z-[1000] animate-[fadeIn_0.18s_ease]"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-[780px] max-w-[96vw] max-h-[92vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-[slideUp_0.22s_cubic-bezier(0.34,1.3,0.64,1)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-[18px] border-b border-gray-100 flex-shrink-0">
          <h2 className="text-[17px] font-bold text-gray-900 m-0">
            {mode === 'edit' ? 'Chỉnh sửa hàng hóa' : 'Thêm hàng hóa mới'}
          </h2>
          <button
            className="w-8 h-8 border-none bg-gray-100 rounded-lg cursor-pointer flex items-center justify-center text-gray-600 text-[15px] hover:bg-red-100 hover:text-red-500 transition-all"
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-6 px-6 py-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">

          {/* Image column */}
          <div className="flex flex-col gap-2.5 w-[180px] flex-shrink-0">
            {/* Upload box */}
            <div
              className="w-[180px] h-[180px] rounded-xl border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer flex items-center justify-center bg-gray-50 hover:border-green-500 hover:bg-green-50/40 transition-all"
              onClick={() => document.getElementById('img-upload')?.click()}
            >
              {preview && !imgError ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover" onError={() => setImgError(true)} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 text-xs text-center px-3">
                  <FontAwesomeIcon icon={faImage} className="text-[28px] text-gray-300" />
                  <span>Nhấn để tải ảnh lên</span>
                </div>
              )}
            </div>
            <input id="img-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            {/* URL input — chỉ hiện khi chưa chọn file */}
            {!imageFile && (
              <input
                className={inputCls()}
                placeholder="Hoặc dán URL ảnh..."
                value={form.image.startsWith('data:') ? '' : form.image}
                onChange={e => {
                  set('image', e.target.value);
                  setPreview(e.target.value);
                  setImgError(false);
                }}
              />
            )}

            {/* Tên file đã chọn */}
            {imageFile && (
              <div className="flex items-center gap-1.5 text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                <FontAwesomeIcon icon={faImage} className="text-green-400 flex-shrink-0" />
                <span className="truncate">{imageFile.name}</span>
                <button
                  className="ml-auto border-none bg-transparent text-gray-400 cursor-pointer p-0 hover:text-red-500 flex-shrink-0"
                  onClick={() => { setImageFile(null); setPreview(form.image); }}
                  title="Xoá file"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            )}

            {/* Status toggle */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[12.5px] font-semibold text-gray-600">Trạng thái</span>
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] cursor-pointer text-[13px] font-semibold transition-all ${form.status ? 'border-green-400 text-green-700 bg-green-50' : 'border-gray-200 text-gray-400 bg-gray-50'}`}
                onClick={() => set('status', !form.status)}
              >
                <FontAwesomeIcon
                  icon={form.status ? faToggleOn : faToggleOff}
                  className={`text-xl ${form.status ? 'text-green-500' : 'text-gray-300'}`}
                />
                <span>{form.status ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}</span>
              </button>
            </div>
          </div>

          {/* Fields column */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Tên */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-gray-600">Tên hàng hóa <span className="text-red-500">*</span></label>
              <input
                className={inputCls(errors.name)}
                placeholder="Nhập tên sản phẩm..."
                value={form.name}
                onChange={e => { set('name', e.target.value); setErrors(v => ({ ...v, name: '' })); }}
              />
              <FieldErr msg={errors.name} />
            </div>

            {/* Loại thực đơn */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-gray-600">Loại thực đơn <span className="text-red-500">*</span></label>
              <SelectWrap>
                <select
                  className={`${inputCls(errors.menuType)} appearance-none pr-8 cursor-pointer`}
                  value={form.menuType}
                  onChange={e => { set('menuType', e.target.value); setErrors(v => ({ ...v, menuType: '' })); }}
                >
                  <option value="">-- Chọn --</option>
                  {MENU_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </SelectWrap>
              <FieldErr msg={errors.menuType} />
            </div>

            {/* Danh mục */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-gray-600">Danh mục <span className="text-red-500">*</span></label>
              <SelectWrap>
                <select
                  className={`${inputCls(errors.category)} appearance-none pr-8 cursor-pointer`}
                  value={form.category}
                  onChange={e => { set('category', e.target.value); setErrors(v => ({ ...v, category: '' })); }}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </SelectWrap>
              <FieldErr msg={errors.category} />
            </div>

            {/* Giá bán + Giá vốn */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-gray-600">Giá bán (đ) <span className="text-red-500">*</span></label>
                <input
                  className={inputCls(errors.price)}
                  placeholder="0"
                  value={form.price}
                  onChange={e => { set('price', formatNumber(e.target.value)); setErrors(v => ({ ...v, price: '' })); }}
                />
                <FieldErr msg={errors.price} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-gray-600">Giá vốn (đ)</label>
                <input
                  className={inputCls()}
                  placeholder="0"
                  value={form.cost}
                  onChange={e => set('cost', formatNumber(e.target.value))}
                />
              </div>
            </div>

            {/* Tồn kho + Đơn vị */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-gray-600">Tồn kho</label>
                <input
                  className={inputCls()}
                  placeholder="Để trống = không giới hạn"
                  value={form.stock}
                  onChange={e => set('stock', e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-gray-600">Đơn vị tính <span className="text-red-500">*</span></label>
                <SelectWrap>
                  <select
                    className={`${inputCls(errors.unit)} appearance-none pr-8 cursor-pointer`}
                    value={form.unit}
                    onChange={e => { set('unit', e.target.value); setErrors(v => ({ ...v, unit: '' })); }}
                  >
                    <option value="">-- Chọn --</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </SelectWrap>
                <FieldErr msg={errors.unit} />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2.5 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {/* API error banner */}
          {apiError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-red-600 text-[13px]">
              <span>⚠</span>
              <span>{apiError}</span>
            </div>
          )}
          <div className="flex justify-end gap-2.5">
            <button
              className="h-[38px] px-5 rounded-lg border-[1.5px] border-gray-300 bg-white text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors font-[inherit]"
              onClick={onClose}
            >
              Huỷ
            </button>
            <button
              className="h-[38px] px-6 rounded-lg border-none bg-green-500 text-white text-sm font-bold cursor-pointer hover:bg-green-600 active:scale-95 transition-all font-[inherit]"
              onClick={handleSave}
            >
              {mode === 'edit' ? 'Cập nhật' : 'Lưu sản phẩm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;