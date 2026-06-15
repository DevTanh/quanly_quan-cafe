import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft, faChevronRight, faCalendarWeek,
  faUser, faChevronDown, faXmark, faSpinner, faSyncAlt,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/api';
import { shiftsApi } from '../../api/shifts.api';
import { extractArray } from '../../utils/extractArray';
import { useToast } from '../../context/ToastContext';

/* ── Types ── */
interface Employee { id: number; employeeCode: string; fullName: string; role: string }
interface ShiftDef { id: number; name: string; startTime: string; endTime: string }
interface Assignment {
  id: number;
  userId: number;
  shiftId: number;
  workDate: string;   // YYYY-MM-DD
  status: string;
  shift: ShiftDef;
  user: Employee;
}

/* ── Helpers ── */
const SHIFT_COLORS: Record<string, { bg: string; text: string }> = {
  default0: { bg: '#bbf7d0', text: '#166534' },
  default1: { bg: '#bfdbfe', text: '#1e40af' },
  default2: { bg: '#fed7aa', text: '#9a3412' },
  default3: { bg: '#fde68a', text: '#92400e' },
  default4: { bg: '#e9d5ff', text: '#6b21a8' },
};
const getShiftColor = (shiftId: number) => SHIFT_COLORS[`default${shiftId % 5}`] ?? SHIFT_COLORS.default0;

const getWeekDates = (base: Date): Date[] => {
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
  });
};
const toKey = (d: Date) => d.toISOString().slice(0, 10);
const isToday = (d: Date) => toKey(d) === toKey(new Date());
const fmt = (n: number) => n.toLocaleString('vi-VN');
const DAYS_VI = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const WAGE_PER_SHIFT = 80_000;

/* ══════════════════════════════════════════════════════════════ */
const WorkSchedule: React.FC = () => {
  const toast = useToast();

  const [baseDate, setBaseDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftDef[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchEmp, setSearchEmp] = useState('');
  const [modal, setModal] = useState<{
    open: boolean; empId: number; empName: string; date: string;
  }>({ open: false, empId: 0, empName: '', date: '' });
  const [checkedShiftIds, setCheckedShiftIds] = useState<number[]>([]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth() + 1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth() + 1}/${weekDates[6].getFullYear()}`;

  /* ── Fetch employees: GET /users?isActive=true ── */
  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/users', { params: { isActive: true } });
      setEmployees(extractArray<Employee>(data));
    } catch (err) {
      console.error('fetchEmployees:', err);
    }
  }, []);

  /* ── Fetch shifts: GET /shifts ── */
  const fetchShifts = useCallback(async () => {
    try {
      const data = await shiftsApi.findAll();
      setShifts(data as ShiftDef[]);
    } catch (err) {
      console.error('fetchShifts:', err);
    }
  }, []);

  /* ── Fetch assignments: GET /shift-assignments?startDate=...&endDate=... ── */
  const fetchAssignments = useCallback(async () => {
    try {
      const startDate = toKey(weekDates[0]);
      const endDate = toKey(weekDates[6]);
      const { data } = await api.get('/shift-assignments', {
        params: { startDate, endDate },
      });
      setAssignments(extractArray<Assignment>(data));
    } catch (err) {
      console.error('fetchAssignments:', err);
    }
  }, [weekDates]);

  /* ── Initial load ── */
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.allSettled([fetchEmployees(), fetchShifts()]);
      setLoading(false);
    };
    init();
  }, []);

  /* ── Reload assignments khi đổi tuần ── */
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  /* ── Helpers ── */
  const getCellAssignments = (userId: number, date: string) =>
    assignments.filter(a => a.userId === userId && a.workDate === date);

  const openModal = (emp: Employee, date: string) => {
    const existing = getCellAssignments(emp.id, date).map(a => a.shiftId);
    setCheckedShiftIds(existing);
    setModal({ open: true, empId: emp.id, empName: emp.fullName, date });
  };

  const toggleShift = (shiftId: number) =>
    setCheckedShiftIds(prev =>
      prev.includes(shiftId) ? prev.filter(id => id !== shiftId) : [...prev, shiftId],
    );

  /* ── Save: POST /shift-assignments/bulk ── */
  const saveShifts = async () => {
    const { empId, date } = modal;
    const existing = getCellAssignments(empId, date);

    // Xóa các ca đã bỏ chọn
    const toDelete = existing.filter(a => !checkedShiftIds.includes(a.shiftId));
    // Thêm các ca mới chọn
    const existingShiftIds = existing.map(a => a.shiftId);
    const toAdd = checkedShiftIds.filter(id => !existingShiftIds.includes(id));

    try {
      setSaving(true);

      // DELETE từng assignment bị bỏ
      await Promise.all(
        toDelete.map(a => api.delete(`/shift-assignments/${a.id}`)),
      );

      // POST /shift-assignments/bulk cho ca mới
      if (toAdd.length > 0) {
        await Promise.all(
          toAdd.map(shiftId =>
            api.post('/shift-assignments/bulk', {
              shiftId,
              userIds: [empId],
              workDates: [date],
            }),
          ),
        );
      }

      toast.success('Đã lưu lịch làm việc');
      await fetchAssignments();
      setModal(v => ({ ...v, open: false }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu lịch thất bại');
    } finally {
      setSaving(false);
    }
  };

  /* ── Remove single assignment ── */
  const removeAssignment = async (assignmentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/shift-assignments/${assignmentId}`);
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa ca thất bại');
    }
  };

  const totalWage = (userId: number) =>
    weekDates.reduce((s, d) => s + getCellAssignments(userId, toKey(d)).length * WAGE_PER_SHIFT, 0);

  const grandTotal = employees.reduce((s, e) => s + totalWage(e.id), 0);

  const filteredEmps = useMemo(() =>
    employees.filter(e =>
      !searchEmp ||
      e.fullName.toLowerCase().includes(searchEmp.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(searchEmp.toLowerCase()),
    ),
    [employees, searchEmp],
  );

  const modalShiftDates = modal.date
    ? new Date(modal.date + 'T00:00:00').toLocaleDateString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit',
    })
    : '';

  const btnOutline = 'flex items-center gap-1.5 h-[34px] px-3.5 border border-gray-200 bg-white rounded-lg text-[12.5px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit]';

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-slate-50 overflow-hidden font-[Segoe_UI,sans-serif]">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="text-[19px] font-black text-slate-900 m-0 flex items-center gap-2.5 tracking-tight">
          <FontAwesomeIcon icon={faCalendarWeek} className="text-green-600 text-[17px]" />
          Lịch làm việc
          {saving && <FontAwesomeIcon icon={faSpinner} spin className="text-[15px] text-green-500 ml-1" />}
        </h1>
        <button className={btnOutline} onClick={fetchAssignments}>
          <FontAwesomeIcon icon={faSyncAlt} /> Làm mới
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center px-6 py-2.5 bg-white border-b border-gray-200 flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center h-9 border border-gray-200 rounded-lg bg-slate-50 overflow-hidden transition-all focus-within:border-green-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]">
          <FontAwesomeIcon icon={faUser} className="px-2.5 text-gray-400 text-xs flex-shrink-0" />
          <input
            className="h-full border-none bg-transparent text-[13px] text-slate-900 outline-none w-44 font-[inherit] placeholder:text-gray-400"
            placeholder="Tìm kiếm nhân viên..."
            value={searchEmp}
            onChange={e => setSearchEmp(e.target.value)}
          />
          {searchEmp && (
            <button className="px-2 text-gray-400 hover:text-gray-600" onClick={() => setSearchEmp('')}>
              <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
            </button>
          )}
        </div>

        {/* Week nav */}
        <div className="flex items-center bg-slate-50 border border-gray-200 rounded-lg h-9 overflow-hidden">
          <button
            className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 transition-all flex-shrink-0"
            onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); }}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="text-[13px] font-bold text-slate-900 px-2.5 border-x border-gray-200 min-w-[185px] text-center leading-[34px]">
            {weekLabel}
          </span>
          <button
            className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 transition-all flex-shrink-0"
            onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); }}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>

        <button
          className="h-9 px-3.5 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit]"
          onClick={() => setBaseDate(new Date())}
        >
          Tuần này
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-gray-400">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-green-500" />
          <span className="text-[14px]">Đang tải lịch làm việc...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-6 pt-5 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
          <table className="w-full border-collapse bg-white rounded-xl border border-gray-200 shadow-[0_1px_8px_rgba(0,0,0,0.06)] min-w-[900px] overflow-hidden">
            <thead>
              <tr>
                <th className="px-5 py-3 bg-slate-50 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-left uppercase tracking-[0.3px] sticky top-0 z-[2] w-[200px]">
                  Nhân viên
                </th>
                {weekDates.map((d, i) => (
                  <th key={i} className={`px-3.5 py-3 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-center uppercase tracking-[0.3px] sticky top-0 z-[2] w-[118px] ${isToday(d) ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <span className="block text-[10px] text-gray-400 mb-1.5 tracking-[0.5px]">{DAYS_VI[(i + 1) % 7]}</span>
                    <span className={`inline-flex items-center justify-center w-[30px] h-[30px] rounded-full text-sm font-bold ${isToday(d) ? 'bg-green-600 text-white shadow-[0_2px_10px_rgba(22,163,74,0.4)]' : 'text-slate-900'}`}>
                      {d.getDate()}
                    </span>
                  </th>
                ))}
                <th className="px-3.5 py-3 bg-slate-50 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-center uppercase tracking-[0.3px] sticky top-0 z-[2] w-[140px]">
                  Lương dự kiến
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Grand total */}
              <tr className="border-b-2 border-gray-200">
                <td className="px-5 py-2.5 bg-slate-50 text-[12px] font-bold text-gray-400">
                  Tổng cộng ({filteredEmps.length} NV)
                </td>
                {weekDates.map((_, i) => <td key={i} className="py-2.5 bg-slate-50" />)}
                <td className="py-2.5 bg-slate-50 text-base font-black text-slate-900 text-right pr-5">
                  {fmt(grandTotal)}đ
                </td>
              </tr>

              {filteredEmps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[14px] text-gray-400">
                    {employees.length === 0 ? 'Không có nhân viên' : 'Không tìm thấy nhân viên'}
                  </td>
                </tr>
              ) : filteredEmps.map(emp => (
                <tr key={emp.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 align-middle">
                    <span className="block text-[13.5px] font-semibold text-slate-900">{emp.fullName}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5 font-mono">{emp.employeeCode}</span>
                    <span className="block text-[11px] text-gray-300 mt-0.5">{emp.role}</span>
                  </td>
                  {weekDates.map((d, i) => {
                    const key = toKey(d);
                    const cells = getCellAssignments(emp.id, key);
                    return (
                      <td
                        key={i}
                        className={`align-top p-2 cursor-pointer transition-colors hover:bg-green-50/60 ${isToday(d) ? 'bg-green-50/30' : ''}`}
                        onClick={() => openModal(emp, key)}
                      >
                        <div className="flex flex-col gap-1 min-h-[44px]">
                          {cells.length === 0 ? (
                            <div className="w-[30px] h-[30px] rounded-lg border-[1.5px] border-dashed border-gray-300 flex items-center justify-center text-base text-gray-300 hover:border-green-500 hover:text-green-400 transition-all">
                              +
                            </div>
                          ) : cells.map(c => {
                            const clr = getShiftColor(c.shiftId);
                            return (
                              <div
                                key={c.id}
                                className="flex items-center justify-between px-2 py-[5px] rounded-lg text-[11.5px] font-semibold leading-snug"
                                style={{ background: clr.bg, color: clr.text }}
                              >
                                <span className="truncate">{c.shift?.name ?? `Ca #${c.shiftId}`}</span>
                                <button
                                  className="w-4 h-4 border-none bg-transparent cursor-pointer opacity-50 text-[9px] flex items-center justify-center rounded p-0 hover:opacity-100 flex-shrink-0 ml-1"
                                  style={{ color: clr.text }}
                                  onClick={e => removeAssignment(c.id, e)}
                                  title="Xóa ca này"
                                >
                                  <FontAwesomeIcon icon={faXmark} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 align-middle text-right">
                    <span className="block text-sm font-bold text-slate-900">{fmt(totalWage(emp.id))}đ</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">
                      {weekDates.reduce((s, d) => s + getCellAssignments(emp.id, toKey(d)).length, 0)} ca
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal xếp ca */}
      {modal.open && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[6px] flex items-center justify-center z-[1000]"
          onClick={() => setModal(v => ({ ...v, open: false }))}
        >
          <div
            className="bg-white rounded-[18px] w-[400px] max-w-[96vw] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.18)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-[17px] font-black text-slate-900 m-0 tracking-tight">Xếp ca làm việc</h3>
                <p className="text-[13px] text-slate-500 m-0 mt-0.5">{modal.empName} — {modalShiftDates}</p>
              </div>
              <button
                className="w-8 h-8 bg-slate-100 border-none rounded-lg cursor-pointer text-slate-500 text-sm flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all"
                onClick={() => setModal(v => ({ ...v, open: false }))}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <p className="text-[12.5px] text-gray-400 italic mb-4 mt-3">Chọn ca làm việc trong ngày</p>

            {shifts.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-4">Chưa có ca nào được tạo</p>
            ) : (
              <div className="flex flex-col gap-2 mb-6">
                {shifts.map(s => {
                  const checked = checkedShiftIds.includes(s.id);
                  const clr = getShiftColor(s.id);
                  return (
                    <button
                      key={s.id}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-[1.5px] cursor-pointer transition-all font-[inherit] ${checked ? 'shadow-[0_2px_10px_rgba(0,0,0,0.08)]' : 'border-gray-200 bg-slate-50 hover:border-gray-400 hover:bg-slate-100'}`}
                      style={checked ? { background: clr.bg, borderColor: clr.text, color: clr.text, borderWidth: 2 } : {}}
                      onClick={() => toggleShift(s.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all"
                          style={checked ? { background: clr.text, borderColor: clr.text } : { background: '#fff', borderColor: '#d1d5db' }}
                        >
                          {checked && <FontAwesomeIcon icon={faXmark} style={{ fontSize: 8, color: '#fff', transform: 'rotate(45deg) scale(1.5)' }} />}
                        </span>
                        <span className="text-sm font-bold">{s.name}</span>
                      </div>
                      <span className="text-xs opacity-65 font-medium">{s.startTime} – {s.endTime}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {checkedShiftIds.length > 0 && (
              <div className="bg-slate-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-600 mb-5">
                Đã chọn <strong className="text-green-600">{checkedShiftIds.length}</strong> ca:{' '}
                {checkedShiftIds.map(id => shifts.find(s => s.id === id)?.name).join(', ')}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                className="h-10 px-5 border border-gray-200 bg-white rounded-lg text-[13.5px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors font-[inherit]"
                onClick={() => setModal(v => ({ ...v, open: false }))}
              >
                Huỷ
              </button>
              <button
                className="h-10 px-6 border-none bg-green-600 rounded-lg text-[13.5px] font-bold text-white cursor-pointer hover:bg-green-700 hover:-translate-y-px transition-all font-[inherit] flex items-center gap-2 disabled:opacity-50"
                onClick={saveShifts}
                disabled={saving}
              >
                {saving && <FontAwesomeIcon icon={faSpinner} spin />}
                Lưu lịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkSchedule;