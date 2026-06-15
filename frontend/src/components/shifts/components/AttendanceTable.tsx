import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import {
  type ShiftDef, type AttendanceEntry, type SalarySetting, type Employee,
  STATUS_CONFIG, DAYS_VI, isToday, toKey, parseHours, fmt,
} from '../hooks/useAttendance';

interface Props {
  shifts: ShiftDef[];
  weekDates: Date[];
  entries: AttendanceEntry[];
  employees: Employee[];
  salaries: SalarySetting[];
  searchEmp: string;
  onCycleStatus: (shiftName: string, empId: string, date: string) => void;
  onAddShift: () => void;
}

const AttendanceTable: React.FC<Props> = ({
  shifts, weekDates, entries, employees, salaries, searchEmp, onCycleStatus, onAddShift,
}) => {
  const getRate = (empId: string) =>
    salaries.find(s => s.employeeId === empId)?.ratePerHour ?? 25000;

  return (
    <div className="flex-1 overflow-auto px-6 pt-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-xl">
      <table className="w-full bg-white rounded-xl border border-gray-200 shadow-[0_1px_8px_rgba(0,0,0,0.06)] min-w-[900px] overflow-hidden border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-slate-50 border-b border-gray-200 sticky top-0 z-[2] text-left w-[185px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.3px]">Ca làm việc</span>
                <button
                  className="w-[22px] h-[22px] border-none bg-slate-200 text-slate-600 rounded-md cursor-pointer text-[10px] flex items-center justify-center hover:bg-green-600 hover:text-white transition-all"
                  onClick={onAddShift}
                  title="Thêm ca mới"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
            </th>
            {weekDates.map((d, i) => (
              <th
                key={i}
                className={`px-3.5 py-3 border-b border-gray-200 text-[11px] font-bold text-gray-400 text-center uppercase tracking-[0.3px] sticky top-0 z-[2] w-[128px] ${isToday(d) ? 'bg-green-50' : 'bg-slate-50'}`}
              >
                <span className="block text-[10px] mb-1.5 tracking-[0.5px]">{DAYS_VI[(i + 1) % 7]}</span>
                <span className={`inline-flex items-center justify-center w-[30px] h-[30px] rounded-full text-sm font-bold ${isToday(d) ? 'bg-green-600 text-white shadow-[0_2px_10px_rgba(22,163,74,0.4)]' : 'text-slate-900'}`}>
                  {d.getDate()}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {shifts.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-12 text-[13px] text-gray-400 italic">
                Chưa có ca nào — nhấn <strong>+</strong> để thêm ca mới
              </td>
            </tr>
          ) : shifts.map(shift => {
            const hours = parseHours(shift.startTime, shift.endTime);
            return (
              <tr key={shift.id} className="border-b border-slate-50 last:border-b-0">
                {/* Shift info cell */}
                <td className="px-4 py-3.5 border-r border-slate-100 bg-slate-50/50 align-middle">
                  <span className="block text-[13.5px] font-bold text-slate-900">{shift.name}</span>
                  <span className="block text-[11.5px] text-gray-400 mt-0.5">
                    {shift.startTime} – {shift.endTime}
                  </span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-xl text-[11px] font-bold">
                    {hours}h
                  </span>
                </td>

                {/* Day cells */}
                {weekDates.map((d, i) => {
                  const key = toKey(d);
                  // match by shiftName (string) vì AttendanceEntry lưu shiftName
                  const dayEntries = entries.filter(
                    e => e.shiftName === shift.name && e.date === key,
                  );
                  const filtered = searchEmp
                    ? dayEntries.filter(e => {
                      const emp = employees.find(em => em.id === e.employeeId);
                      return emp?.fullName.toLowerCase().includes(searchEmp.toLowerCase());
                    })
                    : dayEntries;

                  return (
                    <td
                      key={i}
                      className={`align-top p-0 border-b border-slate-50 ${isToday(d) ? 'bg-green-50/20' : ''}`}
                    >
                      <div className="flex flex-col gap-1.5 min-h-[72px] p-2.5">
                        {filtered.length === 0 ? (
                          <p className="text-xs text-slate-300 italic m-auto text-center">
                            Chưa xếp ca
                          </p>
                        ) : filtered.map(entry => {
                          const emp = employees.find(em => em.id === entry.employeeId);
                          const cfg = STATUS_CONFIG[entry.status];
                          const wage = entry.status !== 'off' && entry.status !== 'missing'
                            ? hours * getRate(entry.employeeId) : 0;

                          return (
                            <div
                              key={entry.employeeId + entry.date}
                              className="px-3 py-2 rounded-lg cursor-pointer hover:translate-x-[3px] hover:brightness-95 transition-all border-l-[3px]"
                              style={{ background: cfg.bg, borderLeftColor: cfg.color }}
                              onClick={() => onCycleStatus(shift.name, entry.employeeId, key)}
                              title="Click để đổi trạng thái"
                            >
                              {/* fullName thay vì name */}
                              <span className="block text-[13px] font-bold text-slate-900">
                                {emp?.fullName ?? entry.employeeId}
                              </span>
                              <span className="block text-[11.5px] text-slate-500 my-0.5">
                                {entry.checkIn || '--'} – {entry.checkOut || '--'}
                              </span>
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] font-bold" style={{ color: cfg.color }}>
                                  {cfg.label}
                                </span>
                                {wage > 0 && (
                                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-px rounded">
                                    {fmt(wage)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
  );
};

export default AttendanceTable;