// src/components/cashier/components/TransferTableModal.tsx
import React, { useState } from 'react';
import type { FlatTable, TransferModalState } from '../hooks/useCashier';

interface Props {
  modal: TransferModalState;
  allTables: FlatTable[];
  occupied: Set<number>;
  paying: boolean;
  onTransfer: (target: FlatTable) => void;
  onClose: () => void;
}

const TransferTableModal: React.FC<Props> = ({
  modal, allTables, occupied, paying, onTransfer, onClose,
}) => {
  const [search, setSearch] = useState('');

  if (!modal.open) return null;

  const fromId = modal.fromTable?.id;
  const available = allTables.filter(t =>
    t.status === 'active' &&
    String(t.id) !== String(fromId) &&
    !occupied.has(Number(t.id)) &&
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
            <h3 className="text-[16px] font-bold text-[#111110] m-0">Chuyển bàn</h3>
            <p className="text-[12px] text-[#a8a8a3] m-0 mt-0.5">
              Từ <strong className="text-[#6b6b68]">{modal.fromTable?.name}</strong> → chọn bàn trống
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

        {/* Search */}
        <div className="px-5 py-3 border-b border-[#f6f6f4]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            placeholder="Tìm bàn..."
            className="w-full h-9 px-3 rounded-lg border-[1.5px] border-[#e6e6e2] text-[13px] outline-none focus:border-[#111110] bg-[#fafafa] text-[#111110] placeholder:text-[#c0c0bb]"
          />
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto p-4">
          {available.length === 0 ? (
            <div className="text-center py-8 text-[#a8a8a3]">
              <p className="text-[13px]">Không có bàn trống nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {available.map(t => (
                <button
                  key={t.id}
                  disabled={paying}
                  onClick={() => onTransfer(t)}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-[1.5px] border-[#e6e6e2] bg-white text-center cursor-pointer transition-all hover:border-[#111110] hover:shadow-sm hover:-translate-y-px active:scale-95 disabled:opacity-40"
                >
                  <svg width="28" height="20" viewBox="0 0 38 26" fill="none">
                    <rect x="1" y="1" width="36" height="24" rx="6" stroke="#d4d4d0" strokeWidth="1.5"/>
                    {[7, 18, 29].map(x => (
                      <React.Fragment key={x}>
                        <rect x={x} y={-1} width={5} height={3} rx={1.5} fill="#e0e0dc"/>
                        <rect x={x} y={24} width={5} height={3} rx={1.5} fill="#e0e0dc"/>
                      </React.Fragment>
                    ))}
                  </svg>
                  <span className="text-[12.5px] font-semibold text-[#111110]">{t.name}</span>
                  <span className="text-[10.5px] text-[#a8a8a3] font-mono">{t.seats} chỗ</span>
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

export default TransferTableModal;
