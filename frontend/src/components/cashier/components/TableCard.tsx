import React from 'react';
import type { FlatTable } from '../hooks/useCashier';

interface Props {
  table: FlatTable;
  isSelected: boolean;
  isOccupied: boolean;
  onClick: (t: FlatTable) => void;
}

const TableCard: React.FC<Props> = ({ table, isSelected, isOccupied, onClick }) => {
  const occ = isOccupied;
  const off = table.status === 'inactive';

  const cls = [
    'relative flex flex-col items-center justify-center gap-[7px] p-[15px_8px_13px]',
    'rounded-xl border cursor-pointer transition-all min-h-[96px] text-center bg-white',
    occ && !isSelected ? 'border-[#bbf7d0] bg-[#f0fdf4]' : '',
    isSelected ? 'border-[#111110] bg-[#111110] shadow-[0_6px_22px_rgba(0,0,0,.18)] -translate-y-0.5' : '',
    !occ && !isSelected ? 'border-[#e6e6e2] hover:border-[#cacac4] hover:shadow-[0_2px_10px_rgba(0,0,0,.07)] hover:-translate-y-px' : '',
    off ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
  ].filter(Boolean).join(' ');

  const strokeColor = isSelected ? 'rgba(255,255,255,.35)' : occ ? '#86efac' : '#dededa';
  const fillColor   = isSelected ? 'rgba(255,255,255,.07)' : occ ? '#dcfce7' : 'transparent';
  const chairColor  = isSelected ? 'rgba(255,255,255,.3)' : occ ? '#86efac' : '#d4d4d0';

  return (
    <button className={cls} onClick={() => onClick(table)}>
      <svg width="38" height="26" viewBox="0 0 38 26" fill="none">
        <rect x="1" y="1" width="36" height="24" rx="6"
          stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
        {[7, 18, 29].map(x => (
          <React.Fragment key={x}>
            <rect x={x} y={-1} width={5} height={3} rx={1.5} fill={chairColor} />
            <rect x={x} y={24} width={5} height={3} rx={1.5} fill={chairColor} />
          </React.Fragment>
        ))}
      </svg>

      <span className={[
        'text-[12.5px] font-semibold leading-none tracking-[-0.015em]',
        isSelected ? 'text-white' : occ ? 'text-green-600' : 'text-[#111110]',
      ].join(' ')}>
        {table.name}
      </span>

      <span className={[
        'font-mono text-[11px]',
        isSelected ? 'text-white/45' : 'text-[#a8a8a3]',
      ].join(' ')}>
        {table.seats} chỗ
      </span>

      {occ && (
        <span className={[
          'absolute top-2 right-2 w-[7px] h-[7px] rounded-full',
          isSelected
            ? 'bg-green-400 shadow-[0_0_0_2.5px_#1a1a18]'
            : 'bg-green-500 shadow-[0_0_0_2.5px_#f0fdf4]',
        ].join(' ')} />
      )}
    </button>
  );
};

export default TableCard;
