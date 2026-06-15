import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck, faUser, faChevronDown, faChevronLeft, faChevronRight,
  faCheckCircle, faMoneyBill, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { useAttendance, STATUS_CONFIG, fmt } from './hooks/useAttendance';
import AttendanceTable from './components/AttendanceTable';
import AddShiftModal from './components/AddShiftModal';
import SalaryModal from './components/SalaryModal';

const Attendance: React.FC = () => {
  const a = useAttendance();

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-slate-50 overflow-hidden font-[Segoe_UI,sans-serif]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-[19px] font-black text-slate-900 m-0 flex items-center gap-2.5 tracking-tight">
          <FontAwesomeIcon icon={faClipboardCheck} className="text-green-600" />
          Bảng chấm công
          {a.loadingData && (
            <FontAwesomeIcon icon={faSpinner} spin className="text-[15px] text-green-400 ml-1" />
          )}
        </h1>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 h-9 px-4 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all font-[inherit]"
            onClick={a.openSalary}
          >
            <FontAwesomeIcon icon={faMoneyBill} /> Cấu hình lương
          </button>
          <button className="flex items-center gap-1.5 h-9 px-4 border-[1.5px] border-green-500 bg-green-50 rounded-lg text-[13px] font-bold text-green-600 cursor-pointer hover:bg-green-600 hover:text-white hover:shadow-[0_4px_14px_rgba(22,163,74,0.35)] hover:-translate-y-px transition-all font-[inherit]">
            <FontAwesomeIcon icon={faCheckCircle} /> Duyệt chấm công
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-200 shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Search */}
          <div className="flex items-center h-9 border border-gray-200 rounded-lg bg-slate-50 overflow-hidden transition-all focus-within:border-green-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.1)]">
            <FontAwesomeIcon icon={faUser} className="px-2.5 text-gray-400 text-xs shrink-0" />
            <input
              className="h-full border-none bg-transparent text-[13px] text-slate-900 outline-none w-40 font-[inherit] placeholder:text-gray-400"
              placeholder="Tìm kiếm nhân viên..."
              value={a.searchEmp}
              onChange={e => a.setSearchEmp(e.target.value)}
            />
            <FontAwesomeIcon icon={faChevronDown} className="px-2.5 text-gray-400 text-[9px] shrink-0 cursor-pointer" />
          </div>

          {/* Employee dropdown */}
          <div className="relative">
            <select className="h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-[13px] bg-slate-50 text-slate-900 appearance-none outline-none cursor-pointer font-[inherit] focus:border-green-500">
              <option value="all">Tất cả nhân viên</option>
              {/* fullName thay vì name */}
              {a.employees.map(e => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
          </div>

          {/* Week nav */}
          <div className="flex items-center bg-slate-50 border border-gray-200 rounded-lg h-9 overflow-hidden">
            <button
              className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 transition-all shrink-0"
              onClick={() => a.navWeek(-1)}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span className="text-[13px] font-bold text-slate-900 px-2.5 border-x border-gray-200 min-w-[158px] text-center leading-[34px]">
              {a.weekLabel}
            </span>
            <button
              className="w-[34px] h-9 border-none bg-transparent cursor-pointer text-slate-600 flex items-center justify-center text-xs hover:bg-gray-200 transition-all shrink-0"
              onClick={() => a.navWeek(1)}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <button
            className="h-9 px-3.5 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-slate-600 cursor-pointer hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all font-[inherit]"
            onClick={() => a.setBaseDate(new Date())}
          >
            Hôm nay
          </button>

          {/* View toggle */}
          <div className="flex bg-slate-50 border border-gray-200 rounded-lg p-[3px] gap-0.5">
            {(['shift', 'employee'] as const).map(mode => (
              <button
                key={mode}
                className={`h-7 px-3 border-none rounded-[7px] text-[12.5px] font-semibold cursor-pointer font-[inherit] transition-all whitespace-nowrap ${a.viewMode === mode ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-gray-400'}`}
                onClick={() => a.setViewMode(mode)}
              >
                {mode === 'shift' ? 'Xem theo ca' : 'Xem theo nhân viên'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Wage bar ── */}
      <div className="flex items-center gap-3 px-6 py-2 bg-amber-50 border-b border-amber-200 shrink-0 flex-wrap">
        <span className="text-xs font-bold text-amber-800 whitespace-nowrap shrink-0">
          Lương dự kiến tuần này
        </span>
        <div className="flex gap-1.5 flex-wrap flex-1">
          {a.employees.slice(0, 5).map(e => (
            <span key={e.id} className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white border border-amber-200 text-xs">
              {/* Lấy họ cuối từ fullName */}
              <span className="font-semibold text-slate-600">{e.fullName.split(' ').pop()}</span>
              <span className="text-amber-600 font-bold">{fmt(a.weeklyWage(e.id))}</span>
            </span>
          ))}
          {a.employees.length > 5 && (
            <span className="flex items-center px-2.5 py-0.5 rounded-xl bg-slate-50 border border-gray-200 text-xs text-gray-400">
              +{a.employees.length - 5} khác
            </span>
          )}
        </div>
        <span className="text-[13px] font-semibold text-amber-800 whitespace-nowrap shrink-0">
          Tổng: <strong className="text-amber-600 text-sm">{fmt(a.grandTotal)}</strong>
        </span>
      </div>

      {/* ── Calendar table ── */}
      {a.loadingData ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-gray-400">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-green-500" />
          <span className="text-[14px]">Đang tải dữ liệu chấm công...</span>
        </div>
      ) : (
        <AttendanceTable
          shifts={a.shifts}
          weekDates={a.weekDates}
          entries={a.entries}
          employees={a.employees}
          salaries={a.salaries}
          searchEmp={a.searchEmp}
          onCycleStatus={a.cycleStatus}
          onAddShift={() => a.setAddShiftOpen(true)}
        />
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-[18px] px-6 py-3 bg-white border border-gray-200 border-t-slate-100 mx-6 mb-4 rounded-b-xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] shrink-0 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-[12.5px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* ── Modals ── */}
      {a.addShiftOpen && (
        <AddShiftModal
          newShift={a.newShift}
          onChange={(field, val) => a.setNewShift(v => ({ ...v, [field]: val }))}
          onSave={a.saveNewShift}
          onClose={() => a.setAddShiftOpen(false)}
        />
      )}

      {a.salaryOpen && (
        <SalaryModal
          employees={a.employees}
          salaryEdit={a.salaryEdit}
          onChange={(empId, val) => a.setSalaryEdit(prev => ({ ...prev, [empId]: val }))}
          fmtInput={a.fmtInput}
          onSave={a.saveSalary}
          onClose={() => a.setSalaryOpen(false)}
        />
      )}
    </div>
  );
};

export default Attendance;