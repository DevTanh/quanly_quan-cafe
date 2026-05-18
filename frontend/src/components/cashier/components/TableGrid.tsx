import React from 'react';
import type { Zone } from '../../../types/cashier.types';
import type { FlatTable, SelectedTable } from '../hooks/useCashier';
import TableCard from './TableCard';

/* ── Skeleton ── */
const TableSkeleton: React.FC = () => (
  <div className="grid gap-[9px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="h-24 rounded-xl bg-gradient-to-r from-[#f0f0ee] via-[#e8e8e5] to-[#f0f0ee] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]" />
    ))}
  </div>
);

interface Props {
  zones: Zone[];
  loadingZones: boolean;
  activeZoneId: string;
  setActiveZoneId: (id: string) => void;
  filterStatus: 'all' | 'occupied' | 'empty';
  setFilterStatus: (s: 'all' | 'occupied' | 'empty') => void;
  pagedTables: FlatTable[];
  zoneTables: FlatTable[];
  totalActive: number;
  totalOcc: number;
  occupied: Set<number>;
  selectedTable: SelectedTable | null;
  selectTable: (t: SelectedTable) => void;
  page: number;
  setPage: (fn: (p: number) => number) => void;
  totalPages: number;
}

const TableGrid: React.FC<Props> = ({
  zones, loadingZones, activeZoneId, setActiveZoneId,
  filterStatus, setFilterStatus,
  pagedTables, zoneTables, totalActive, totalOcc,
  occupied, selectedTable, selectTable,
  page, setPage, totalPages,
}) => {
  const filterChips = [
    { val: 'all'      as const, label: 'Tất cả',    count: totalActive },
    { val: 'occupied' as const, label: 'Đang dùng', count: totalOcc },
    { val: 'empty'    as const, label: 'Còn trống', count: totalActive - totalOcc },
  ];

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

      {/* ── Topbar ── */}
      <div className="flex items-center gap-2 px-4 py-[10px] bg-white border-b border-[#e6e6e2] shrink-0">
        {/* Special buttons */}
        {(
          [
            {
              id: 'takeaway', label: 'Mang về',
              icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2h12l2 7H4L6 2z"/><path d="M4 9v11a2 2 0 002 2h12a2 2 0 002-2V9"/><path d="M9 13h6"/>
              </svg>,
            },
            {
              id: 'delivery', label: 'Giao đi',
              icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>
                <path d="M3 9l2-5h8l3 7H3z" strokeLinejoin="round"/><path d="M13 11l2 5h5l1-3"/>
              </svg>,
            },
          ] as { id: 'takeaway' | 'delivery'; label: string; icon: React.ReactNode }[]
        ).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => selectTable({ id, name: label, special: true })}
            className={[
              'flex flex-col items-center justify-center gap-1 w-[62px] h-[54px] rounded-[9px] border shrink-0',
              'text-[10.5px] font-semibold tracking-[-0.01em] cursor-pointer transition-all',
              selectedTable?.id === id
                ? 'border-[#111110] bg-[#111110] text-white'
                : 'border-[#e6e6e2] bg-white text-[#6b6b68] hover:border-[#cacac4] hover:text-[#111110]',
            ].join(' ')}
          >
            {icon}
            {label}
          </button>
        ))}

        <div className="w-px h-7 bg-[#e6e6e2] shrink-0 mx-0.5" />

        {/* Zone tabs */}
        <div className="flex gap-0.5 flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-[#cacac4]">
          {loadingZones ? (
            <div className="flex gap-1.5">
              {[80, 60, 90, 72].map((w, i) => (
                <div key={i} className="h-7 rounded-md bg-[#f0f0ee] animate-pulse" style={{ width: w }} />
              ))}
            </div>
          ) : (
            [{ id: 'all', name: 'Tất cả' }, ...zones].map(z => (
              <button
                key={z.id}
                onClick={() => { setActiveZoneId(z.id); setPage(() => 1); }}
                className={[
                  'px-[13px] py-[5px] rounded-md text-[13px] font-medium whitespace-nowrap cursor-pointer border-none transition-all tracking-[-0.015em]',
                  activeZoneId === z.id
                    ? 'bg-[#111110] text-white'
                    : 'bg-transparent text-[#6b6b68] hover:bg-[#e6e6e2] hover:text-[#111110]',
                ].join(' ')}
              >
                {z.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b border-[#e6e6e2] shrink-0">
        {filterChips.map(f => (
          <button
            key={f.val}
            onClick={() => { setFilterStatus(f.val); setPage(() => 1); }}
            className={[
              'inline-flex items-center gap-[5px] px-[11px] py-[5px] rounded-full text-[12.5px] font-medium border-[1.5px] cursor-pointer transition-all tracking-[-0.01em]',
              filterStatus === f.val
                ? 'border-[#111110] text-[#111110] bg-black/5'
                : 'border-[#e6e6e2] text-[#6b6b68] hover:border-[#cacac4] hover:text-[#111110]',
            ].join(' ')}
          >
            {f.val !== 'all' && (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-55 shrink-0" />
            )}
            {f.label}
            <span className="font-mono text-[11px] bg-[#e6e6e2] rounded px-1 text-[#a8a8a3] ml-px">
              {loadingZones ? '—' : f.count}
            </span>
          </button>
        ))}
        <span className="ml-auto font-mono text-[11.5px] text-[#a8a8a3]">
          {loadingZones ? '…' : `${zoneTables.length} bàn`}
        </span>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 p-[14px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#cacac4]">
        {loadingZones ? (
          <TableSkeleton />
        ) : pagedTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2.5 text-[#a8a8a3]">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="3" y="6" width="30" height="24" rx="5" stroke="#cacac4" strokeWidth="2"/>
            </svg>
            <p className="text-[13px] text-center">Không có bàn nào</p>
          </div>
        ) : (
          <div className="grid gap-[9px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}>
            {pagedTables.map(t => (
              <TableCard
                key={t.id}
                table={t}
                isSelected={selectedTable?.id === t.id}
                isOccupied={occupied.has(Number(t.id))}
                onClick={selectTable}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-[#e6e6e2] shrink-0">
        <label className="flex items-center gap-1.5 text-[12.5px] text-[#6b6b68] cursor-pointer">
          <input type="checkbox" className="accent-[#111110]" />
          Mở thực đơn khi chọn bàn
        </label>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              className="w-7 h-7 rounded-md border border-[#e6e6e2] bg-transparent text-[#6b6b68] cursor-pointer flex items-center justify-center text-sm transition-all hover:border-[#cacac4] hover:text-[#111110] disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >‹</button>
            <span className="font-mono text-[12px] text-[#6b6b68]">{page}/{totalPages}</span>
            <button
              className="w-7 h-7 rounded-md border border-[#e6e6e2] bg-transparent text-[#6b6b68] cursor-pointer flex items-center justify-center text-sm transition-all hover:border-[#cacac4] hover:text-[#111110] disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableGrid;
