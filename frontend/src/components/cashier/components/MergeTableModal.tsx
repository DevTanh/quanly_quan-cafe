// src/components/cashier/components/MergeTableModal.tsx
import React, { useState } from 'react';
import type { FlatTable, MergeModalState } from '../hooks/useCashier';

interface Props {
  modal: MergeModalState;
  allTables: FlatTable[];
  occupied: Set<number>;
  paying: boolean;
  onMerge: (target: FlatTable) => void;
  onClose: () => void;
}

const MergeTableModal: React.FC<Props> = ({
  modal, allTables, occupied, paying, onMerge, onClose,
}) => {
  const [search, setSearch] = useState('');

  if (!modal.open) return null;

  const fromId = modal.primaryTable?.id;
  // Chỉ lấy bàn khác đang CÓ khách
  const candidates = allTables.filter(t =>
    t.status === 'active' &&
    String(t.id) !== String(fromId) &&
    occupied.has(Number(t.id)) &&
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      style={{ background: 'rgba(17,17,16,0.5)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f0f0ee]">
          <div>
            <h3 className="text-[16px] font-bold text-[#111110] m-0">Gộp bàn</h3>
            <p className="text-[12px] text-[#a8a8a3] m-0 mt-0.5">
              Gộp <strong className="text-[#6b6b68]">{modal.primaryTable?.name}</strong> vào bàn khác đang có khách
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f6f6f4] hover:bg-[#ebebea] flex items-center justify-center text-[#6b6b68] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11"/>
            </svg>
          </button>
        </div>

        {/* Info */}
        <div className="mx-5 mt-3 bg-amber-50 rounded-xl px-4 py-3 text-[12.5px] text-amber-700 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
            <circle cx="7" cy="7" r="6.5" stroke="#d97706" strokeWidth="1.3"/>
            <path d="M7 4v4M7 9.5v.5" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Các món của {modal.primaryTable?.name} sẽ được gộp vào bàn được chọn. Đơn cũ sẽ bị hủy.
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            placeholder="Tìm bàn đang có khách..."
            className="w-full h-9 px-3 rounded-lg border-[1.5px] border-[#e6e6e2] text-[13px] outline-none focus:border-[#111110] bg-[#fafafa] text-[#111110] placeholder:text-[#c0c0bb]"
          />
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-[#a8a8a3]">
              <p className="text-[13px]">Không có bàn nào đang có khách</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {candidates.map(t => (
                <button
                  key={t.id}
                  disabled={paying}
                  onClick={() => onMerge(t)}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-[1.5px] border-[#bbf7d0] bg-[#f0fdf4] text-center cursor-pointer transition-all hover:border-green-400 hover:shadow-sm hover:-translate-y-px active:scale-95 disabled:opacity-40"
                >
                  <div className="relative">
                    <svg width="28" height="20" viewBox="0 0 38 26" fill="none">
                      <rect x="1" y="1" width="36" height="24" rx="6" stroke="#86efac" strokeWidth="1.5" fill="#dcfce7"/>
                      {[7, 18, 29].map(x => (
                        <React.Fragment key={x}>
                          <rect x={x} y={-1} width={5} height={3} rx={1.5} fill="#86efac"/>
                          <rect x={x} y={24} width={5} height={3} rx={1.5} fill="#86efac"/>
                        </React.Fragment>
                      ))}
                    </svg>
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  </div>
                  <span className="text-[12.5px] font-semibold text-[#166534]">{t.name}</span>
                  <span className="text-[10.5px] text-green-600 font-mono">{t.seats} chỗ</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#f0f0ee]">
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl border-[1.5px] border-[#e6e6e2] text-[13px] text-[#6b6b68] hover:bg-[#f6f6f4] transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeTableModal;
