import { useState, useMemo, useEffect, useCallback } from 'react';
import api from '../../../api/api';
import { shiftsApi } from '../../../api/shifts.api';
import { extractArray } from '../../../utils/extractArray';

/* ── Types ── */
export type AttendanceStatus = 'on-time' | 'late' | 'missing' | 'pending' | 'off';

export interface AttendanceEntry {
  employeeId: string; date: string; shiftName: string;
  checkIn?: string; checkOut?: string; status: AttendanceStatus;
}

export interface ShiftDef {
  id: string | number;
  name: string;
  startTime: string;
  endTime: string;
  maxStaff?: number;
}

export interface Employee {
  id: string;         // employeeCode hoặc String(id)
  userId: number;     // id thật trong DB — dùng để query shift-assignments
  fullName: string;
  role: string;
  status: string;
}

export interface SalarySetting { employeeId: string; ratePerHour: number }

/* ── Helpers ── */
export const parseHours = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
};
export const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';
export const toKey = (d: Date) => d.toISOString().slice(0, 10);
export const isToday = (d: Date) => toKey(d) === toKey(new Date());

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
  'on-time': { label: 'Đúng giờ', color: '#1d4ed8', bg: '#dbeafe' },
  'late': { label: 'Đi muộn / Về sớm', color: '#7c3aed', bg: '#ede9fe' },
  'missing': { label: 'Chấm công thiếu', color: '#b91c1c', bg: '#fee2e2' },
  'pending': { label: 'Chưa chấm công', color: '#9a3412', bg: '#fed7aa' },
  'off': { label: 'Nghỉ làm', color: '#6b7280', bg: '#f3f4f6' },
};

/* ── Map BE AssignmentStatus → FE AttendanceStatus ── */
const mapAssignmentStatus = (s: string): AttendanceStatus => {
  const map: Record<string, AttendanceStatus> = {
    scheduled: 'pending',
    absent: 'missing',
    // Nếu sau này BE thêm các trạng thái mới:
    checked_in: 'on-time',
    late: 'late',
    cancelled: 'off',
    completed: 'on-time',
  };
  return map[s] ?? 'pending';
};

/* ══════════════════════════════════════════════════════════════ */
export function useAttendance() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftDef[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [salaries, setSalaries] = useState<SalarySetting[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [viewMode, setViewMode] = useState<'shift' | 'employee'>('shift');
  const [searchEmp, setSearchEmp] = useState('');
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [newShift, setNewShift] = useState({ name: '', startTime: '08:00', endTime: '12:00' });
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryEdit, setSalaryEdit] = useState<Record<string, string>>({});

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const weekLabel = `Tuần ${Math.ceil(weekDates[0].getDate() / 7)} - Th. ${weekDates[0].getMonth() + 1} ${weekDates[0].getFullYear()}`;

  /* ─────────────────────────────────────────────────────────────
     Fetch employees: GET /users?isActive=true
     - Dùng đúng field name "isActive" theo QueryUserDto BE
     - Không gửi "limit" vì BE QueryUserDto không có field này
       → ValidationPipe forbidNonWhitelisted sẽ reject
  ───────────────────────────────────────────────────────────── */
  const fetchEmployees = useCallback(async () => {
    try {
      // Chỉ gửi các param có trong QueryUserDto: search, role, isActive
      const { data } = await api.get('/users', {
        params: { isActive: true },
      });
      const list = extractArray<any>(data);
      const mapped: Employee[] = list.map((u: any) => ({
        id: u.employeeCode ?? String(u.id),
        userId: u.id,
        fullName: u.fullName,
        role: u.role,
        status: u.isActive ? 'active' : 'inactive',
      }));
      setEmployees(mapped);
      // Init salary settings (giữ giá trị hiện tại nếu đã có, default 25000)
      setSalaries(prev => {
        const existing = new Map(prev.map(s => [s.employeeId, s.ratePerHour]));
        return mapped.map(e => ({
          employeeId: e.id,
          ratePerHour: existing.get(e.id) ?? 25000,
        }));
      });
    } catch (err) {
      console.error('fetchEmployees error:', err);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     Fetch shifts: GET /shifts (không thay đổi)
  ───────────────────────────────────────────────────────────── */
  const fetchShifts = useCallback(async () => {
    try {
      const data = await shiftsApi.findAll();
      setShifts(data.map(s => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        maxStaff: s.maxStaff,
      })));
    } catch (err) {
      console.error('fetchShifts error:', err);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     Fetch assignments: GET /shift-assignments?startDate=...&endDate=...
     - Đúng field name theo QueryShiftAssignmentDto: startDate / endDate
     - KHÔNG gửi "from", "to", "limit" (các field không khai báo trong DTO)
  ───────────────────────────────────────────────────────────── */
  const fetchAssignments = useCallback(async () => {
    try {
      const startDate = toKey(weekDates[0]);
      const endDate = toKey(weekDates[6]);

      // Chỉ gửi: startDate, endDate, userId, shiftId, status — đúng theo QueryShiftAssignmentDto
      const { data } = await api.get('/shift-assignments', {
        params: { startDate, endDate },
      });

      const list = extractArray<any>(data);
      const mapped: AttendanceEntry[] = list.map((a: any) => ({
        // a.user.employeeCode hoặc fallback String(a.userId)
        employeeId: a.user?.employeeCode ?? String(a.userId),
        // BE trả về field workDate (date column)
        date: a.workDate ?? a.work_date ?? toKey(new Date()),
        shiftName: a.shift?.name ?? '',
        checkIn: a.checkInTime ?? undefined,
        checkOut: a.checkOutTime ?? undefined,
        status: mapAssignmentStatus(a.status ?? 'scheduled'),
      }));
      setEntries(mapped);
    } catch (err) {
      console.error('fetchAssignments error:', err);
    }
  }, [weekDates]);

  /* ─────────────────────────────────────────────────────────────
     Lifecycle: load một lần khi mount
     401 fix: useAttendance chỉ được dùng bên trong AppShell
     (đã authenticated), nên api.ts interceptor sẽ tự refresh nếu
     cần. Không cần check user ở đây.
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      // Fetch employees + shifts song song
      await Promise.allSettled([fetchEmployees(), fetchShifts()]);
      setLoadingData(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chỉ chạy 1 lần khi mount

  // Khi tuần thay đổi → load lại assignments
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  /* ── Computed ── */
  const getRate = (empId: string) => salaries.find(s => s.employeeId === empId)?.ratePerHour ?? 25000;
  const shiftHours = (name: string) => {
    const s = shifts.find(s => s.name === name);
    return s ? parseHours(s.startTime, s.endTime) : 0;
  };

  const weeklyWage = (empId: string) => {
    const rate = getRate(empId);
    return weekDates.reduce((total, d) => {
      const dayEntries = entries.filter(e =>
        e.employeeId === empId &&
        e.date === toKey(d) &&
        e.status !== 'off' &&
        e.status !== 'missing',
      );
      return total + dayEntries.reduce((s, e) => s + shiftHours(e.shiftName) * rate, 0);
    }, 0);
  };

  const grandTotal = employees.reduce((s, e) => s + weeklyWage(e.id), 0);

  /* ── Actions ── */
  const cycleStatus = (shiftName: string, empId: string, date: string) => {
    const statuses: AttendanceStatus[] = ['pending', 'on-time', 'late', 'missing', 'off'];
    setEntries(prev => {
      const existing = prev.find(
        e => e.shiftName === shiftName && e.employeeId === empId && e.date === date,
      );
      if (existing) {
        const next = statuses[(statuses.indexOf(existing.status) + 1) % statuses.length];
        return prev.map(e =>
          e.shiftName === shiftName && e.employeeId === empId && e.date === date
            ? { ...e, status: next }
            : e,
        );
      }
      return [...prev, { employeeId: empId, date, shiftName, status: 'pending' }];
    });
  };

  const saveNewShift = async () => {
    if (!newShift.name.trim()) return;
    try {
      const created = await shiftsApi.create({
        name: newShift.name.trim(),
        startTime: newShift.startTime,
        endTime: newShift.endTime,
      });
      setShifts(prev => [...prev, {
        id: created.id, name: created.name,
        startTime: created.startTime, endTime: created.endTime,
      }]);
      setNewShift({ name: '', startTime: '08:00', endTime: '12:00' });
      setAddShiftOpen(false);
    } catch (err) {
      console.error('saveNewShift error:', err);
    }
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

  const navWeek = (dir: -1 | 1) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dir * 7);
    setBaseDate(d);
  };

  const filteredEmployees = useMemo(() =>
    employees.filter(e =>
      !searchEmp ||
      e.fullName.toLowerCase().includes(searchEmp.toLowerCase()) ||
      e.id.toLowerCase().includes(searchEmp.toLowerCase()),
    ),
    [employees, searchEmp],
  );

  return {
    employees: filteredEmployees,
    allEmployees: employees,
    weekDates, weekLabel, loadingData,
    shifts, entries, salaries,
    viewMode, setViewMode,
    searchEmp, setSearchEmp,
    addShiftOpen, setAddShiftOpen, newShift, setNewShift, saveNewShift,
    salaryOpen, setSalaryOpen, salaryEdit, setSalaryEdit, openSalary, saveSalary, fmtInput,
    getRate, shiftHours, weeklyWage, grandTotal,
    cycleStatus, navWeek, setBaseDate, fetchAssignments,
  };
}