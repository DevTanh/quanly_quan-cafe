import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileImport, faFileExport } from '@fortawesome/free-solid-svg-icons';

interface ProductToolbarProps {
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  onAdd: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

const ProductToolbar: React.FC<ProductToolbarProps> = ({
  totalCount, filteredCount, selectedCount,
  onAdd, onImport, onExport,
}) => (
  <div className="flex items-center justify-between flex-wrap gap-2">
    <span className="text-[13px] text-gray-500">
      {selectedCount > 0 ? (
        <>Đã chọn <strong className="text-gray-900">{selectedCount}</strong> sản phẩm</>
      ) : (
        <>Tổng <strong className="text-gray-900">{filteredCount}</strong> sản phẩm</>
      )}
    </span>

    <div className="flex items-center gap-2 flex-wrap">
      <button
        className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13.5px] font-medium cursor-pointer border-none bg-green-600 text-white hover:bg-green-700 transition-colors font-[inherit]"
        onClick={onAdd}
      >
        <FontAwesomeIcon icon={faPlus} />
        <span>Thêm mới</span>
      </button>

      <label className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13.5px] font-medium cursor-pointer bg-white text-green-600 border border-green-500 hover:bg-green-50 transition-colors font-[inherit]">
        <FontAwesomeIcon icon={faFileImport} />
        <span>Import</span>
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
      </label>

      <button
        className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13.5px] font-medium cursor-pointer bg-white text-green-600 border border-green-500 hover:bg-green-50 transition-colors font-[inherit]"
        onClick={onExport}
      >
        <FontAwesomeIcon icon={faFileExport} />
        <span>Xuất file</span>
      </button>
    </div>
  </div>
);

export default ProductToolbar;
