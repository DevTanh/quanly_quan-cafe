import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft, faChevronRight, faCalendarWeek,
  faFileImport, faFileExport, faUser, faChevronDown,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
// TODO: Sau khi đồng bộ backend, thay bằng: import { useUsers } from '../../hooks/useUsers';
import employeesData from '../../components/employees/employees.json';

/* ── Types ── */
interface ShiftEntry {
  id: string;
  employeeId: string;
  date: string;
  shiftName: string;
  shiftColor: string;
  shiftTextColor: string;
}

const SHIFTS = [
  { name: 'Ca sáng', color: '#bbf7d0', textColor: '#166534', time: '08:00 - 12:00' },
  { name: 'Ca chiều', color: '#bfdbfe', textColor: '#1e40af', time: '13:00 - 17:00' },
  { name: 'Ca tối', color: '#fed7aa', textColor: '#9a3412', time: '18:00 - 22:00' },
];

const DAYS_VI = ['CN', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const getWeekDates = (base: Date): Date[] => {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const toKey = (d: Date) => d.toISOString().slice(0, 10);
const isToday = (d: Date) => toKey(d) === toKey(new Date());
const fmt = (n: number) => n.toLocaleString('vi-VN');
const genId = () => `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const WAGE_PER_SHIFT = 80_000;

/* fake initial data */
const today = toKey(new Date());
const tomorrow = toKey(new Date(Date.now() + 86400000));
const INIT_ENTRIES: ShiftEntry[] = [
  { id: genId(), employeeId: 'NV0001', date: today, shiftName: 'Ca sáng', shiftColor: '#bbf7d0', shiftTextColor: '#166534' },
  { id: genId(), employeeId: 'NV0001', date: today, shiftName: 'Ca tối', shiftColor: '#fed7aa', shiftTextColor: '#9a3412' },
  { id: genId(), employeeId: 'NV0002', date: today, shiftName: 'Ca chiều', shiftColor: '#bfdbfe', shiftTextColor: '#1e40af' },
  { id: genId(), employeeId: 'NV0003', date: tomorrow, shiftName: 'Ca sáng', shiftColor: '#bbf7d0', shiftTextColor: '#166534' },
];

const WorkSchedule: React.FC = () => {
  const [baseDate, setBaseDate] = useState(new Date());
  const [entries, setEntries] = useState<ShiftEntry[]>(INIT_ENTRIES);
  const [searchEmp, setSearchEmp] = useState('');
  const [modal, setModal] = useState<{ open: boolean; empId: string; date: string }>({ open: false, empId: '', date: '' });
  const [checkedShifts, setCheckedShifts] = useState<string[]>([]);

  const employees = employeesData.employees.filter(e => e.status === 'active');
  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const filteredEmps = employees.filter(e =>
    e.name.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.id.toLowerCase().includes(searchEmp.toLowerCase())
  );

  const weekLabel = `Tuần ${Math.ceil(weekDates[0].getDate() / 7)} - Th. ${weekDates[0].getMonth() + 1} ${weekDates[0].getFullYear()}`;

  const getEntries = (empId: string, date: string) =>
    entries.filter(e => e.employeeId === empId && e.date === date);

  const openModal = (empId: string, date: string) => {
    setCheckedShifts(getEntries(empId, date).map(e => e.shiftName));
    setModal({ open: true, empId, date });
  };

  const toggleShift = (name: string) =>
    setCheckedShifts(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);

  const saveShifts = () => {
    const { empId, date } = modal;
    setEntries(prev =>
      prev.filter(e => !(e.employeeId === empId && e.date === date && !checkedShifts.includes(e.shiftName)))
    );
    const existing = getEntries(empId, date).map(e => e.shiftName);
    const newEntries: ShiftEntry[] = checkedShifts
      .filter(s => !existing.includes(s))
      .map(s => {
        const shift = SHIFTS.find(sh => sh.name === s)!;
        return { id: genId(), employeeId: empId, date, shiftName: shift.name, shiftColor: shift.color, shiftTextColor: shift.textColor };
      });
    setEntries(prev => [...prev, ...newEntries]);
    setModal(v => ({ ...v, open: false }));
  };

  const removeEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEntries(prev => prev.filter(en => en.id !== id));
  };

  const totalWage = (empId: string) =>
    weekDates.reduce((sum, d) => sum + getEntries(empId, toKey(d)).length, 0) * WAGE_PER_SHIFT;

  const grandTotal = employees.reduce((s, e) => s + totalWage(e.id), 0);

  const modalEmp = employees.find(e => e.id === modal.empId);
  const modalDate = modal.date
    ? new Date(modal.date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
    : '';

  const btnOutline = 'flex items-center gap-1.5 h-[34px] px-3.5 border border-gray-200 bg-white rounded-lg text-[12.5px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit]';

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-slate-50 overflow-hidden font-[Segoe_UI,sans-serif]">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="text-[19px] font-black text-slate-900 m-0 flex items-center gap-2.5 tracking-tight">
          <FontAwesomeIcon icon={faCalendarWeek} className="text-green-600 text-[17px]" />
          Lịch làm việc
        </h1>
        <div className="flex gap-2">
          <button className={btnOutline}><FontAwesomeIcon icon={faFileImport} /> Import</button>
          <button className={btnOutline}><FontAwesomeIcon icon={faFileExport} /> Xuất file</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center px-6 py-2.5 bg-white border-b border-gray-200 flex-shrink-0 gap-2 flex-wrap">
        {/* Search */}
        <div className="flex items-center h-9 border border-gray-200 rounded-lg bg-slate-50 overflow-hidden transition-all focus-within:border-green-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]">
          <FontAwesomeIcon icon={faUser} className="px-2.5 text-gray-400 text-xs flex-shrink-0" />
          <input
            className="h-full border-none bg-transparent text-[13px] text-slate-900 outline-none w-44 font-[inherit] placeholder:text-gray-400"
            placeholder="Tìm kiếm nhân viên..."
            value={searchEmp}
            onChange={e => setSearchEmp(e.target.value)}
          />
          <FontAwesomeIcon icon={faChevronDown} className="px-2.5 text-gray-400 text-[9px] flex-shrink-0 cursor-pointer" />
        </div>

        {/* Week nav */}
        <div className="flex items-center bg-slate-50 border border-gray-200 rounded-lg h-9 overflow-hidden">
          <button className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 hover:text-slate-900 transition-all flex-shrink-0" onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); }}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="text-[13px] font-bold text-slate-900 px-2.5 border-x border-gray-200 min-w-[165px] text-center leading-[34px]">
            {weekLabel}
          </span>
          <button className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 hover:text-slate-900 transition-all flex-shrink-0" onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); }}>
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>

        <button className="h-9 px-3.5 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit]" onClick={() => setBaseDate(new Date())}>Tuần này</button>

        <div className="flex bg-slate-50 border border-gray-200 rounded-lg p-[3px] gap-0.5">
          <button className="flex items-center gap-1.5 h-7 px-3 border-none rounded-[7px] text-[12.5px] font-semibold cursor-pointer font-[inherit] bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.1)] transition-all">
            <FontAwesomeIcon icon={faUser} /> Xem theo nhân viên
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto px-6 pt-5 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
        <table className="w-full border-collapse bg-white rounded-xl border border-gray-200 shadow-[0_1px_8px_rgba(0,0,0,0.06)] min-w-[900px] overflow-hidden">
          <thead>
            <tr>
              <th className="px-5 py-3 bg-slate-50 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-left uppercase tracking-[0.3px] sticky top-0 z-[2] w-[200px]">Nhân viên</th>
              {weekDates.map((d, i) => (
                <th key={i} className={`px-3.5 py-3 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-center uppercase tracking-[0.3px] sticky top-0 z-[2] w-[118px] ${isToday(d) ? 'bg-green-50' : 'bg-slate-50'}`}>
                  <span className="block text-[10px] text-gray-400 mb-1.5 tracking-[0.5px]">{DAYS_VI[(i + 1) % 7]}</span>
                  <span className={`inline-flex items-center justify-center w-[30px] h-[30px] rounded-full text-sm font-bold ${isToday(d) ? 'bg-green-600 text-white shadow-[0_2px_10px_rgba(22,163,74,0.4)]' : 'text-slate-900'}`}>
                    {d.getDate()}
                  </span>
                </th>
              ))}
              <th className="px-3.5 py-3 bg-slate-50 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-center uppercase tracking-[0.3px] sticky top-0 z-[2] w-[140px]">Lương dự kiến</th>
            </tr>
          </thead>
          <tbody>
            {/* Grand total row */}
            <tr className="border-b-2 border-gray-200">
              <td className="px-5 py-2.5 bg-slate-50" />
              {weekDates.map((_, i) => <td key={i} className="py-2.5 bg-slate-50" />)}
              <td className="py-2.5 bg-slate-50 text-base font-black text-slate-900 text-right pr-5">{fmt(grandTotal)}</td>
            </tr>

            {filteredEmps.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-[14px] text-gray-400">Không tìm thấy nhân viên</td></tr>
            ) : filteredEmps.map(emp => (
              <tr key={emp.id} className="border-b border-slate-50 last:border-b-0">
                <td className="px-5 py-3 align-middle">
                  <span className="block text-[13.5px] font-semibold text-slate-900">{emp.name}</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5 font-mono">{emp.id}</span>
                </td>
                {weekDates.map((d, i) => {
                  const key = toKey(d);
                  const cells = getEntries(emp.id, key);
                  return (
                    <td
                      key={i}
                      className={`align-top p-2 cursor-pointer transition-colors hover:bg-green-50 ${isToday(d) ? 'bg-green-50/30' : ''}`}
                      onClick={() => openModal(emp.id, key)}
                    >
                      <div className="flex flex-col gap-1 min-h-[44px]">
                        {cells.length === 0 ? (
                          <div className="w-[30px] h-[30px] rounded-lg border-[1.5px] border-dashed border-gray-300 flex items-center justify-center text-base text-gray-300 transition-all group-hover:border-green-500">+</div>
                        ) : cells.map(c => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between px-2.5 py-[5px] rounded-lg text-xs font-semibold cursor-pointer hover:brightness-90 hover:scale-95 transition-all leading-snug"
                            style={{ background: c.shiftColor, color: c.shiftTextColor }}
                          >
                            <span>{c.shiftName}</span>
                            <button
                              className="w-4 h-4 border-none bg-transparent cursor-pointer opacity-60 text-[10px] flex items-center justify-center rounded p-0 hover:opacity-100 transition-opacity flex-shrink-0"
                              style={{ color: c.shiftTextColor }}
                              onClick={e => removeEntry(c.id, e)}
                              title="Xoá ca này"
                            >
                              <FontAwesomeIcon icon={faXmark} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
                <td className="px-5 py-3 align-middle text-right">
                  <span className="block text-sm font-bold text-slate-900">{fmt(totalWage(emp.id))}</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {weekDates.reduce((s, d) => s + getEntries(emp.id, toKey(d)).length, 0)} ca
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: xếp ca */}
      {modal.open && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000]"
          onClick={() => setModal(v => ({ ...v, open: false }))}
        >
          <div className="bg-white rounded-[18px] w-[390px] max-w-[96vw] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.18)]" onClick={e => e.stopPropagation()}>
            {/* Title */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-[17px] font-black text-slate-900 m-0 tracking-tight">Xếp ca làm việc</h3>
                <p className="text-[13px] text-slate-500 m-0 mt-0.5">{modalEmp?.name} — {modalDate}</p>
              </div>
              <button className="w-8 h-8 bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all" onClick={() => setModal(v => ({ ...v, open: false }))}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <p className="text-[12.5px] text-gray-400 italic mb-4 mt-3">Chọn một hoặc nhiều ca trong ngày</p>

            <div className="flex flex-col gap-2 mb-6">
              {SHIFTS.map(s => {
                const checked = checkedShifts.includes(s.name);
                return (
                  <button
                    key={s.name}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-[1.5px] cursor-pointer transition-all font-[inherit] ${checked ? 'shadow-[0_2px_10px_rgba(0,0,0,0.08)]' : 'border-gray-200 bg-slate-50 hover:border-gray-400 hover:bg-slate-100'}`}
                    style={checked ? { background: s.color, borderColor: s.textColor, color: s.textColor, borderWidth: 2 } : {}}
                    onClick={() => toggleShift(s.name)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all"
                        style={checked ? { background: s.textColor, borderColor: s.textColor } : { background: '#fff', borderColor: '#d1d5db' }}
                      >
                        {checked && <FontAwesomeIcon icon={faXmark} style={{ fontSize: 8, color: '#fff', transform: 'rotate(45deg) scale(1.5)' }} />}
                      </span>
                      <span className="text-sm font-bold">{s.name}</span>
                    </div>
                    <span className="text-xs opacity-65 font-medium">{s.time}</span>
                  </button>
                );
              })}
            </div>

            {checkedShifts.length > 0 && (
              <div className="bg-slate-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-600 mb-5">
                Đã chọn <strong className="text-green-600">{checkedShifts.length}</strong> ca: {checkedShifts.join(', ')}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button className="h-10 px-5 border border-gray-200 bg-white rounded-lg text-[13.5px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors font-[inherit]" onClick={() => setModal(v => ({ ...v, open: false }))}>Huỷ</button>
              <button className="h-10 px-6 border-none bg-green-600 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-700 hover:shadow-[0_4px_14px_rgba(22,163,74,0.4)] hover:-translate-y-px active:translate-y-0 transition-all font-[inherit]" onClick={saveShifts}>
                Lưu lịch ({checkedShifts.length} ca)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkSchedule;