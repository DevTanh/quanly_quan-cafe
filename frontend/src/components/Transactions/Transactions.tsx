import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faFileExport, faBars, faChevronDown, faChevronUp,
  faInbox, faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';

const trangThaiOptions = ['Đang xử lý', 'Hoàn thành', 'Không giao được', 'Đã hủy'];
const trangThaiGiaoOptions = ['Chờ xử lý', 'Đang lấy hàng', 'Đang giao hàng', 'Giao thành công', 'Đang chuyển hoàn', 'Đã chuyển hoàn', 'Đã hủy'];
const paymentMethods = ['Tiền mặt', 'Thẻ', 'Chuyển khoản', 'Ví điện tử'];

const Transactions: React.FC = () => {
  const [searchInvoice, setSearchInvoice] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [timeType, setTimeType] = useState<'today' | 'all' | 'custom'>('today');
  const [deliveryTimeType, setDeliveryTimeType] = useState<'all' | 'custom'>('all');
  const [checkedStatus, setCheckedStatus] = useState<string[]>(['Đang xử lý', 'Hoàn thành']);
  const [checkedDelivery, setCheckedDelivery] = useState<string[]>([]);
  const [checkedPayment, setCheckedPayment] = useState<string[]>([]);
  const [bangGia, setBangGia] = useState('');
  const [khuVuc, setKhuVuc] = useState('');
  const [phongBan, setPhongBan] = useState('');
  const [kenhBan, setKenhBan] = useState('');
  const [soBanGhi, setSoBanGhi] = useState('10');
  const [showTrangThai, setShowTrangThai] = useState(true);
  const [showGiaoHang, setShowGiaoHang] = useState(true);
  const [showPayment, setShowPayment] = useState(true);
  const [showBangGia, setShowBangGia] = useState(true);
  const [showPhongBan, setShowPhongBan] = useState(true);
  const [showKenhBan, setShowKenhBan] = useState(true);

  const toggleArr = (arr: string[], val: string, setter: (a: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const CollapseSection: React.FC<{ title: string; open: boolean; toggle: () => void; children: React.ReactNode }> = ({ title, open, toggle, children }) => (
    <div className="border-b border-gray-200 py-3">
      <div className="flex items-center justify-between cursor-pointer mb-2" onClick={toggle}>
        <span className="text-[13px] font-semibold text-gray-700 uppercase tracking-tight">{title}</span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-[10px] text-gray-400" />
      </div>
      {open && children}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-['Segoe_UI',sans-serif]">
      {/* Sidebar */}
      <aside className="w-[290px] bg-white border-r border-gray-200 p-4 shrink-0 h-screen overflow-y-auto">
        {/* Tìm kiếm */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-gray-700 uppercase">Tìm kiếm</span>
            <FontAwesomeIcon icon={faChevronUp} className="text-[10px] text-gray-400" />
          </div>
          <input 
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 mb-1.5" 
            placeholder="Theo mã hóa đơn" 
            value={searchInvoice} 
            onChange={e => setSearchInvoice(e.target.value)} 
          />
          <input 
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-blue-500 mb-1.5" 
            placeholder="Theo mã, tên hàng" 
            value={searchItem} 
            onChange={e => setSearchItem(e.target.value)} 
          />
          <button 
            className="flex items-center gap-1 text-[12.5px] text-gray-500 hover:text-gray-700 mt-1 transition-colors" 
            onClick={() => setExpanded(!expanded)}
          >
            Mở rộng <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
          </button>
        </div>

        {/* Thời gian */}
        <div className="border-b border-gray-200 py-4">
          <div className="text-[13px] font-semibold text-gray-700 mb-3 uppercase">Thời gian</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 group cursor-pointer">
              <input type="radio" name="time" className="accent-blue-600" checked={timeType === 'today'} onChange={() => setTimeType('today')} />
              <select className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1 text-[13px] text-gray-700 outline-none cursor-pointer">
                <option>Hôm nay</option>
                <option>Hôm qua</option>
                <option>7 ngày qua</option>
                <option>Tháng này</option>
                <option>Toàn thời gian</option>
              </select>
            </label>
            <label className="flex items-center gap-2 group cursor-pointer">
              <input type="radio" name="time" className="accent-blue-600" checked={timeType === 'custom'} onChange={() => setTimeType('custom')} />
              <div className="flex-1 flex items-center justify-between border border-gray-300 rounded-md px-2 py-1 text-[13px] text-gray-700">
                <span>Lựa chọn khác</span>
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-[12px]" />
              </div>
            </label>
          </div>
        </div>

        {/* Các Section khác dùng chung CollapseSection */}
        <CollapseSection title="Trạng thái" open={showTrangThai} toggle={() => setShowTrangThai(!showTrangThai)}>
          <div className="grid grid-cols-1 gap-2">
            {trangThaiOptions.map(t => (
              <label key={t} className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={checkedStatus.includes(t)} onChange={() => toggleArr(checkedStatus, t, setCheckedStatus)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </CollapseSection>

        <CollapseSection title="Trạng thái giao hàng" open={showGiaoHang} toggle={() => setShowGiaoHang(!showGiaoHang)}>
          <div className="grid grid-cols-1 gap-2">
            {trangThaiGiaoOptions.map(t => (
              <label key={t} className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={checkedDelivery.includes(t)} onChange={() => toggleArr(checkedDelivery, t, setCheckedDelivery)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </CollapseSection>

        <CollapseSection title="Kênh bán" open={showKenhBan} toggle={() => setShowKenhBan(!showKenhBan)}>
          <input className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-[13px] outline-none" placeholder="Chọn kênh bán" value={kenhBan} onChange={e => setKenhBan(e.target.value)} />
        </CollapseSection>

        {/* Số bản ghi */}
        <div className="py-4">
          <div className="flex items-center gap-2 text-[13px] text-gray-600">
            <span>Số bản ghi:</span>
            <select className="border border-gray-300 rounded px-2 py-0.5 outline-none" value={soBanGhi} onChange={e => setSoBanGhi(e.target.value)}>
              <option>10</option><option>20</option><option>50</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Hóa đơn</h1>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm transition-all text-[14px]">
              <FontAwesomeIcon icon={faPlus} />
              <span>Nhận gọi món</span>
            </button>
            <button className="flex items-center gap-2 border border-green-600 text-green-700 px-4 py-2 rounded-md hover:bg-green-50 text-[14px]">
              <FontAwesomeIcon icon={faFileExport} />
              <span>Xuất file</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
            </button>
            <button className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md hover:bg-gray-200">
              <FontAwesomeIcon icon={faBars} />
              <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex bg-gray-50 border-b border-gray-200 text-[13px] font-bold text-gray-600">
            <div className="w-[40px] p-3 text-center"><input type="checkbox" /></div>
            <div className="flex-1 p-3">Mã hóa đơn</div>
            <div className="flex-1 p-3">Thời gian (Giờ đi)</div>
            <div className="flex-[2] p-3">Khách hàng</div>
            <div className="flex-1 p-3 text-right">Tổng tiền hàng</div>
            <div className="flex-1 p-3 text-right">Giảm giá</div>
            <div className="flex-1 p-3 text-right">Khách đã trả</div>
          </div>

          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FontAwesomeIcon icon={faInbox} className="text-gray-200 text-6xl mb-4" />
            <p className="text-gray-500 text-[14px]">
              Không tìm thấy hóa đơn nào phù hợp trong .{' '}
              <a href="#" className="text-blue-500 hover:underline font-medium">vào đây</a> để tìm kiếm trên toàn thời gian.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Transactions;