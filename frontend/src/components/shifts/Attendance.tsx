import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft, faChevronRight, faClipboardCheck,
  faUser, faChevronDown, faPlus, faCheckCircle,
  faMoneyBill, faXmark,
} from '@fortawesome/free-solid-svg-icons';
// TODO: Sau khi đồng bộ backend, thay bằng: import { useUsers } from '../../hooks/useUsers';
import employeesData from '../../components/employees/employees.json';

/* ── Types ── */
type AttendanceStatus = 'on-time' | 'late' | 'missing' | 'pending' | 'off';

interface AttendanceEntry {
  employeeId: string;
  date: string;
  shiftName: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
}

interface Shift { id: string; name: string; startTime: string; endTime: string }
interface SalarySetting { employeeId: string; ratePerHour: number }

/* ── Helpers ── */
const parseHours = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
};
const fmt     = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const toKey   = (d: Date)   => d.toISOString().slice(0, 10);
const isToday = (d: Date)   => toKey(d) === toKey(new Date());

const getWeekDates = (base: Date): Date[] => {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
};

const DAYS_VI = ['CN', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const INIT_SHIFTS: Shift[] = [
  { id: 'ca-sang',  name: 'Ca sáng',  startTime: '08:00', endTime: '12:00' },
  { id: 'ca-chieu', name: 'Ca chiều', startTime: '13:00', endTime: '17:00' },
  { id: 'ca-toi',   name: 'Ca tối',   startTime: '18:00', endTime: '22:00' },
];

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; border: string }> = {
  'on-time': { label: 'Đúng giờ',         color: '#1d4ed8', bg: '#dbeafe', border: '#1d4ed8' },
  'late':    { label: 'Đi muộn / Về sớm', color: '#7c3aed', bg: '#ede9fe', border: '#7c3aed' },
  'missing': { label: 'Chấm công thiếu',  color: '#b91c1c', bg: '#fee2e2', border: '#b91c1c' },
  'pending': { label: 'Chưa chấm công',   color: '#9a3412', bg: '#fed7aa', border: '#9a3412' },
  'off':     { label: 'Nghỉ làm',         color: '#6b7280', bg: '#f3f4f6', border: '#6b7280' },
};

const today_str     = toKey(new Date());
const yesterday_str = toKey(new Date(Date.now() - 86400000));

const INIT_ENTRIES: AttendanceEntry[] = [
  { employeeId: 'NV0001', date: today_str,     shiftName: 'Ca chiều', status: 'pending' },
  { employeeId: 'NV0002', date: yesterday_str, shiftName: 'Ca sáng',  status: 'on-time', checkIn: '08:02', checkOut: '12:05' },
  { employeeId: 'NV0003', date: yesterday_str, shiftName: 'Ca tối',   status: 'late',    checkIn: '18:25', checkOut: '22:00' },
  { employeeId: 'NV0004', date: today_str,     shiftName: 'Ca sáng',  status: 'pending' },
];

const INIT_SALARY: SalarySetting[] = [
  { employeeId: 'NV0001', ratePerHour: 25000 },
  { employeeId: 'NV0002', ratePerHour: 30000 },
  { employeeId: 'NV0003', ratePerHour: 25000 },
  { employeeId: 'NV0004', ratePerHour: 20000 },
  { employeeId: 'NV0005', ratePerHour: 25000 },
  { employeeId: 'NV0006', ratePerHour: 20000 },
  { employeeId: 'NV0007', ratePerHour: 22000 },
  { employeeId: 'NV0008', ratePerHour: 28000 },
];

/* ── Component ── */
const Attendance: React.FC = () => {
  const [baseDate,     setBaseDate]     = useState(new Date());
  const [shifts,       setShifts]       = useState<Shift[]>(INIT_SHIFTS);
  const [entries,      setEntries]      = useState<AttendanceEntry[]>(INIT_ENTRIES);
  const [salaries,     setSalaries]     = useState<SalarySetting[]>(INIT_SALARY);
  const [viewMode,     setViewMode]     = useState<'shift' | 'employee'>('shift');
  const [searchEmp,    setSearchEmp]    = useState('');
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [newShift,     setNewShift]     = useState({ name: '', startTime: '08:00', endTime: '12:00' });
  const [salaryOpen,   setSalaryOpen]   = useState(false);
  const [salaryEdit,   setSalaryEdit]   = useState<Record<string, string>>({});

  const employees = employeesData.employees.filter(e => e.status === 'active');
  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const weekLabel = `Tuần ${Math.ceil(weekDates[0].getDate() / 7)} - Th. ${weekDates[0].getMonth() + 1} ${weekDates[0].getFullYear()}`;

  const getRate     = (empId: string) => salaries.find(s => s.employeeId === empId)?.ratePerHour ?? 25000;
  const shiftHours  = (name: string)  => { const s = shifts.find(s => s.name === name); return s ? parseHours(s.startTime, s.endTime) : 0; };

  const weeklyWage = (empId: string) => {
    const rate = getRate(empId);
    return weekDates.reduce((total, d) => {
      const dayEntries = entries.filter(e => e.employeeId === empId && e.date === toKey(d) && e.status !== 'off' && e.status !== 'missing');
      return total + dayEntries.reduce((s, e) => s + shiftHours(e.shiftName) * rate, 0);
    }, 0);
  };
  const grandTotal = employees.reduce((s, e) => s + weeklyWage(e.id), 0);

  const cycleStatus = (shiftName: string, empId: string, date: string) => {
    const statuses: AttendanceStatus[] = ['pending', 'on-time', 'late', 'missing', 'off'];
    setEntries(prev => {
      const existing = prev.find(e => e.shiftName === shiftName && e.employeeId === empId && e.date === date);
      if (existing) {
        const next = statuses[(statuses.indexOf(existing.status) + 1) % statuses.length];
        return prev.map(e => e.shiftName === shiftName && e.employeeId === empId && e.date === date ? { ...e, status: next } : e);
      }
      return [...prev, { employeeId: empId, date, shiftName, status: 'pending' }];
    });
  };

  const saveNewShift = () => {
    if (!newShift.name.trim()) return;
    setShifts(prev => [...prev, { id: `shift-${Date.now()}`, ...newShift }]);
    setNewShift({ name: '', startTime: '08:00', endTime: '12:00' });
    setAddShiftOpen(false);
  };

  const openSalary = () => {
    const map: Record<string, string> = {};
    employees.forEach(e => { map[e.id] = String(getRate(e.id)); });
    setSalaryEdit(map);
    setSalaryOpen(true);
  };

  const saveSalary = () => {
    const updated: SalarySetting[] = employees.map(e => ({
      employeeId: e.id,
      ratePerHour: parseInt(salaryEdit[e.id]?.replace(/\D/g, '') || '0', 10) || 0,
    }));
    setSalaries(updated);
    setSalaryOpen(false);
  };

  const fmtInput = (val: string) => {
    const num = val.replace(/\D/g, '');
    return num ? Number(num).toLocaleString('vi-VN') : '';
  };

  const inputCls = 'h-10 px-3 border border-gray-200 rounded-lg text-[13.5px] text-slate-900 bg-slate-50 outline-none transition-all font-[inherit] focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,163,74,0.12)]';

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-slate-50 overflow-hidden font-[Segoe_UI,sans-serif]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="text-[19px] font-black text-slate-900 m-0 flex items-center gap-2.5 tracking-tight">
          <FontAwesomeIcon icon={faClipboardCheck} className="text-green-600" />
          Bảng chấm công
        </h1>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 h-9 px-4 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all font-[inherit]"
            onClick={openSalary}
          >
            <FontAwesomeIcon icon={faMoneyBill} /> Cấu hình lương
          </button>
          <button className="flex items-center gap-1.5 h-9 px-4 border-[1.5px] border-green-500 bg-green-50 rounded-lg text-[13px] font-bold text-green-600 cursor-pointer hover:bg-green-600 hover:text-white hover:shadow-[0_4px_14px_rgba(22,163,74,0.35)] hover:-translate-y-px transition-all font-[inherit]">
            <FontAwesomeIcon icon={faCheckCircle} /> Duyệt chấm công
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-200 flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="flex items-center h-9 border border-gray-200 rounded-lg bg-slate-50 overflow-hidden transition-all focus-within:border-green-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]">
            <FontAwesomeIcon icon={faUser} className="px-2.5 text-gray-400 text-xs flex-shrink-0" />
            <input className="h-full border-none bg-transparent text-[13px] text-slate-900 outline-none w-40 font-[inherit] placeholder:text-gray-400" placeholder="Tìm kiếm nhân viên..." value={searchEmp} onChange={e => setSearchEmp(e.target.value)} />
            <FontAwesomeIcon icon={faChevronDown} className="px-2.5 text-gray-400 text-[9px] flex-shrink-0 cursor-pointer" />
          </div>

          {/* Select nhân viên */}
          <div className="relative">
            <select className="h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-[13px] bg-slate-50 text-slate-900 appearance-none outline-none cursor-pointer font-[inherit] focus:border-green-500">
              <option value="all">Theo tất cả</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
          </div>

          {/* Week nav */}
          <div className="flex items-center bg-slate-50 border border-gray-200 rounded-lg h-9 overflow-hidden">
            <button className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 hover:text-slate-900 transition-all flex-shrink-0" onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); }}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span className="text-[13px] font-bold text-slate-900 px-2.5 border-x border-gray-200 min-w-[158px] text-center leading-[34px]">{weekLabel}</span>
            <button className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 hover:text-slate-900 transition-all flex-shrink-0" onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); }}>
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <button className="h-9 px-3.5 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit]" onClick={() => setBaseDate(new Date())}>Chọn</button>

          {/* View toggle */}
          <div className="flex bg-slate-50 border border-gray-200 rounded-lg p-[3px] gap-0.5">
            {(['shift', 'employee'] as const).map(mode => (
              <button
                key={mode}
                className={`h-7 px-3 border-none rounded-[7px] text-[12.5px] font-semibold cursor-pointer font-[inherit] transition-all whitespace-nowrap ${viewMode === mode ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-gray-400'}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'shift' ? 'Xem theo ca' : 'Xem theo nhân viên'}
              </button>
            ))}
          </div>
        </div>

        <button className="w-9 h-9 border border-gray-200 bg-white rounded-lg text-[14px] font-black text-slate-600 cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center tracking-widest">···</button>
      </div>

      {/* ── Wage bar ── */}
      <div className="flex items-center gap-3 px-6 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0 flex-wrap">
        <span className="text-xs font-bold text-amber-800 whitespace-nowrap flex-shrink-0">Lương dự kiến tuần này</span>
        <div className="flex gap-1.5 flex-wrap flex-1">
          {employees.slice(0, 5).map(e => (
            <span key={e.id} className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white border border-amber-200 text-xs">
              <span className="font-semibold text-slate-600">{e.name.split(' ').pop()}</span>
              <span className="text-amber-600 font-bold">{fmt(weeklyWage(e.id))}</span>
            </span>
          ))}
          {employees.length > 5 && <span className="flex items-center px-2.5 py-0.5 rounded-xl bg-slate-50 border border-gray-200 text-xs text-gray-400">+{employees.length - 5} khác</span>}
        </div>
        <span className="text-[13px] font-semibold text-amber-800 whitespace-nowrap flex-shrink-0">Tổng: <strong className="text-amber-600 text-sm">{fmt(grandTotal)}</strong></span>
      </div>

      {/* ── Calendar ── */}
      <div className="flex-1 overflow-auto px-6 pt-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
        <table className="w-full bg-white rounded-xl border border-gray-200 shadow-[0_1px_8px_rgba(0,0,0,0.06)] min-w-[900px] overflow-hidden border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-3 bg-slate-50 border-b border-gray-200 sticky top-0 z-[2] text-left w-[185px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.3px]">Ca làm việc</span>
                  <button className="w-[22px] h-[22px] border-none bg-slate-200 text-slate-600 rounded-md cursor-pointer text-[10px] flex items-center justify-center hover:bg-green-600 hover:text-white transition-all" onClick={() => setAddShiftOpen(true)}>
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
              </th>
              {weekDates.map((d, i) => (
                <th key={i} className={`px-3.5 py-3 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-center uppercase tracking-[0.3px] sticky top-0 z-[2] w-[128px] ${isToday(d) ? 'bg-green-50' : 'bg-slate-50'}`}>
                  <span className="block text-[10px] mb-1.5 tracking-[0.5px]">{DAYS_VI[(i + 1) % 7]}</span>
                  <span className={`inline-flex items-center justify-center w-[30px] h-[30px] rounded-full text-sm font-bold ${isToday(d) ? 'bg-green-600 text-white shadow-[0_2px_10px_rgba(22,163,74,0.4)]' : 'text-slate-900'}`}>{d.getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map(shift => {
              const hours = parseHours(shift.startTime, shift.endTime);
              return (
                <tr key={shift.id} className="border-b border-slate-50 last:border-b-0">
                  <td className="px-4 py-3.5 border-r border-slate-100 bg-slate-50/50 align-middle">
                    <span className="block text-[13.5px] font-bold text-slate-900">{shift.name}</span>
                    <span className="block text-[11.5px] text-gray-400 mt-0.5">{shift.startTime} - {shift.endTime}</span>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-xl text-[11px] font-bold">{hours}h</span>
                  </td>
                  {weekDates.map((d, i) => {
                    const key = toKey(d);
                    const dayEntries = entries.filter(e => e.shiftName === shift.name && e.date === key);
                    const filtered   = searchEmp
                      ? dayEntries.filter(e => { const emp = employees.find(em => em.id === e.employeeId); return emp?.name.toLowerCase().includes(searchEmp.toLowerCase()); })
                      : dayEntries;

                    return (
                      <td key={i} className={`align-top p-0 border-b border-slate-50 ${isToday(d) ? 'bg-green-50/20' : ''}`}>
                        <div className="flex flex-col gap-1.5 min-h-[72px] p-2.5">
                          {filtered.length === 0
                            ? <p className="text-xs text-slate-300 italic m-auto text-center">Chọn để xếp nhân viên làm ca.</p>
                            : filtered.map(entry => {
                                const emp  = employees.find(em => em.id === entry.employeeId);
                                const cfg  = STATUS_CONFIG[entry.status];
                                const wage = entry.status !== 'off' && entry.status !== 'missing' ? hours * getRate(entry.employeeId) : 0;
                                return (
                                  <div
                                    key={entry.employeeId}
                                    className="px-3 py-2 rounded-lg cursor-pointer hover:translate-x-[3px] hover:brightness-95 transition-all border-l-[3px]"
                                    style={{ background: cfg.bg, borderLeftColor: cfg.color }}
                                    onClick={() => cycleStatus(shift.name, entry.employeeId, key)}
                                    title="Click để đổi trạng thái"
                                  >
                                    <span className="block text-[13px] font-bold text-slate-900">{emp?.name}</span>
                                    <span className="block text-[11.5px] text-slate-500 my-0.5">{entry.checkIn || '--'} – {entry.checkOut || '--'}</span>
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                                      {wage > 0 && <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-px rounded">{fmt(wage)}</span>}
                                    </div>
                                  </div>
                                );
                              })
                          }
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-[18px] px-6 py-3 bg-white border border-gray-200 border-t-slate-100 mx-6 mb-4 rounded-b-xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] flex-shrink-0 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-[12.5px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* ── Modal: Thêm ca ── */}
      {addShiftOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000]" onClick={() => setAddShiftOpen(false)}>
          <div className="bg-white rounded-[18px] w-[400px] max-w-[96vw] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.18)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[17px] font-black text-slate-900 m-0 mb-5 tracking-tight">Thêm ca làm việc</h3>
            <div className="flex flex-col gap-3.5 mb-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-bold text-slate-600">Tên ca <span className="text-red-500">*</span></label>
                <input className={inputCls} placeholder="VD: Ca sáng, Ca khuya..." value={newShift.name} onChange={e => setNewShift(v => ({ ...v, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-slate-600">Giờ bắt đầu</label>
                  <input className={inputCls} type="time" value={newShift.startTime} onChange={e => setNewShift(v => ({ ...v, startTime: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-slate-600">Giờ kết thúc</label>
                  <input className={inputCls} type="time" value={newShift.endTime} onChange={e => setNewShift(v => ({ ...v, endTime: e.target.value }))} />
                </div>
              </div>
              {newShift.startTime && newShift.endTime && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5 text-[13px] text-green-800">
                  Số giờ: <strong className="text-[15px]">{parseHours(newShift.startTime, newShift.endTime)}h</strong>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button className="h-10 px-5 border border-gray-200 bg-white rounded-lg text-[13.5px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 font-[inherit]" onClick={() => setAddShiftOpen(false)}>Huỷ</button>
              <button className="h-10 px-6 border-none bg-green-600 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-700 hover:shadow-[0_4px_14px_rgba(22,163,74,0.4)] hover:-translate-y-px transition-all font-[inherit]" onClick={saveNewShift}>Lưu ca</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cấu hình lương ── */}
      {salaryOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000]" onClick={() => setSalaryOpen(false)}>
          <div className="bg-white rounded-[18px] w-[540px] max-w-[96vw] max-h-[85vh] flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.18)] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-[17px] font-black text-slate-900 m-0 tracking-tight">Cấu hình mức lương</h3>
                <p className="text-[13px] text-gray-400 mt-0.5 m-0">Đơn vị: VND / giờ làm việc</p>
              </div>
              <button className="w-8 h-8 bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all" onClick={() => setSalaryOpen(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
              {employees.map(emp => (
                <div
                  key={emp.id}
                  className="grid [grid-template-columns:1fr_160px_120px] items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13.5px] font-semibold text-slate-900">{emp.name}</span>
                    <span className="text-[11px] text-gray-400 font-mono">{emp.id}</span>
                  </div>
                  <div className="flex items-center border-[1.5px] border-gray-200 rounded-lg bg-white overflow-hidden transition-all focus-within:border-amber-400 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
                    <input
                      className="flex-1 h-[38px] px-2.5 border-none bg-transparent text-sm font-bold text-slate-900 outline-none font-[inherit] text-right min-w-0"
                      placeholder="25.000"
                      value={salaryEdit[emp.id] ?? ''}
                      onChange={e => setSalaryEdit(prev => ({ ...prev, [emp.id]: fmtInput(e.target.value) }))}
                    />
                    <span className="px-2.5 text-xs font-semibold text-gray-400 bg-slate-50 border-l border-gray-200 h-[38px] flex items-center whitespace-nowrap">đ/giờ</span>
                  </div>
                  <div className="text-[11.5px] text-amber-600 font-medium text-right">
                    {salaryEdit[emp.id] ? `≈ ${fmt(parseInt(salaryEdit[emp.id].replace(/\D/g, '') || '0', 10) * 8)}/ngày` : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 px-6 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800 leading-relaxed flex-shrink-0">
              <FontAwesomeIcon icon={faMoneyBill} className="flex-shrink-0 mt-px text-amber-600" />
              Lương mỗi ca = Mức lương/giờ × Số giờ ca đó. Trạng thái "Nghỉ" và "Chấm công thiếu" không tính lương.
            </div>

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 flex-shrink-0">
              <button className="h-10 px-5 border border-gray-200 bg-white rounded-lg text-[13.5px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 font-[inherit]" onClick={() => setSalaryOpen(false)}>Huỷ</button>
              <button className="flex items-center gap-1.5 h-10 px-6 border-none bg-green-600 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-700 hover:shadow-[0_4px_14px_rgba(22,163,74,0.4)] hover:-translate-y-px transition-all font-[inherit]" onClick={saveSalary}>
                <FontAwesomeIcon icon={faCheckCircle} /> Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;