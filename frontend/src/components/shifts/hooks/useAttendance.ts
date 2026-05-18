import { useState, useMemo } from 'react';
import employeesData from '../../../components/employees/employees.json';

/* ── Types ── */
export type AttendanceStatus = 'on-time' | 'late' | 'missing' | 'pending' | 'off';

export interface AttendanceEntry {
  employeeId: string; date: string; shiftName: string;
  checkIn?: string; checkOut?: string; status: AttendanceStatus;
}

export interface Shift { id: string; name: string; startTime: string; endTime: string }
export interface SalarySetting { employeeId: string; ratePerHour: number }

/* ── Helpers ── */
export const parseHours = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
};
export const fmt      = (n: number) => n.toLocaleString('vi-VN') + 'đ';
export const toKey    = (d: Date)   => d.toISOString().slice(0, 10);
export const isToday  = (d: Date)   => toKey(d) === toKey(new Date());

export const getWeekDates = (base: Date): Date[] => {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
};

export const DAYS_VI = ['CN', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  'on-time': { label: 'Đúng giờ',           color: '#1d4ed8', bg: '#dbeafe' },
  'late':    { label: 'Đi muộn / Về sớm',   color: '#7c3aed', bg: '#ede9fe' },
  'missing': { label: 'Chấm công thiếu',    color: '#b91c1c', bg: '#fee2e2' },
  'pending': { label: 'Chưa chấm công',     color: '#9a3412', bg: '#fed7aa' },
  'off':     { label: 'Nghỉ làm',           color: '#6b7280', bg: '#f3f4f6' },
};

const today_str     = toKey(new Date());
const yesterday_str = toKey(new Date(Date.now() - 86400000));

const INIT_SHIFTS: Shift[] = [
  { id: 'ca-sang',  name: 'Ca sáng',  startTime: '08:00', endTime: '12:00' },
  { id: 'ca-chieu', name: 'Ca chiều', startTime: '13:00', endTime: '17:00' },
  { id: 'ca-toi',   name: 'Ca tối',   startTime: '18:00', endTime: '22:00' },
];

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

/* ══════════════════════════════════════════════════════════════ */
export function useAttendance() {
  const [baseDate, setBaseDate]   = useState(new Date());
  const [shifts, setShifts]       = useState<Shift[]>(INIT_SHIFTS);
  const [entries, setEntries]     = useState<AttendanceEntry[]>(INIT_ENTRIES);
  const [salaries, setSalaries]   = useState<SalarySetting[]>(INIT_SALARY);
  const [viewMode, setViewMode]   = useState<'shift' | 'employee'>('shift');
  const [searchEmp, setSearchEmp] = useState('');
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [newShift, setNewShift]   = useState({ name: '', startTime: '08:00', endTime: '12:00' });
  const [salaryOpen, setSalaryOpen]     = useState(false);
  const [salaryEdit, setSalaryEdit]     = useState<Record<string, string>>({});

  const employees = (employeesData as any).employees.filter((e: any) => e.status === 'active');
  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const weekLabel = `Tuần ${Math.ceil(weekDates[0].getDate() / 7)} - Th. ${weekDates[0].getMonth() + 1} ${weekDates[0].getFullYear()}`;

  const getRate   = (empId: string) => salaries.find(s => s.employeeId === empId)?.ratePerHour ?? 25000;
  const shiftHours = (name: string) => { const s = shifts.find(s => s.name === name); return s ? parseHours(s.startTime, s.endTime) : 0; };

  const weeklyWage = (empId: string) => {
    const rate = getRate(empId);
    return weekDates.reduce((total, d) => {
      const dayEntries = entries.filter(e =>
        e.employeeId === empId && e.date === toKey(d) && e.status !== 'off' && e.status !== 'missing',
      );
      return total + dayEntries.reduce((s, e) => s + shiftHours(e.shiftName) * rate, 0);
    }, 0);
  };

  const grandTotal = employees.reduce((s: number, e: any) => s + weeklyWage(e.id), 0);

  const cycleStatus = (shiftName: string, empId: string, date: string) => {
    const statuses: AttendanceStatus[] = ['pending', 'on-time', 'late', 'missing', 'off'];
    setEntries(prev => {
      const existing = prev.find(e => e.shiftName === shiftName && e.employeeId === empId && e.date === date);
      if (existing) {
        const next = statuses[(statuses.indexOf(existing.status) + 1) % statuses.length];
        return prev.map(e =>
          e.shiftName === shiftName && e.employeeId === empId && e.date === date ? { ...e, status: next } : e,
        );
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
    employees.forEach((e: any) => { map[e.id] = String(getRate(e.id)); });
    setSalaryEdit(map);
    setSalaryOpen(true);
  };

  const saveSalary = () => {
    const updated: SalarySetting[] = employees.map((e: any) => ({
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

  const navWeek = (dir: -1 | 1) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dir * 7);
    setBaseDate(d);
  };

  return {
    employees, weekDates, weekLabel,
    shifts, entries, salaries,
    viewMode, setViewMode,
    searchEmp, setSearchEmp,
    addShiftOpen, setAddShiftOpen, newShift, setNewShift, saveNewShift,
    salaryOpen, setSalaryOpen, salaryEdit, setSalaryEdit, openSalary, saveSalary, fmtInput,
    getRate, shiftHours, weeklyWage, grandTotal,
    cycleStatus, navWeek, setBaseDate,
  };
}
