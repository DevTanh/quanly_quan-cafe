// src/components/cashier/components/CustomerSearch.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Customer } from '../../../types';
import { customersApi } from '../../../api/customers.api';
import { TIER_CONFIG, POINTS_REDEEM_VALUE, fmt as fmtVnd } from '../hooks/useCashier';

// re-export fmt helper nếu chưa export từ useCashier
const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫';
const fmtPoints = (n: number) => n.toLocaleString('vi-VN') + ' điểm';

interface Props {
  selectedCustomer: Customer | null;
  onSelect: (c: Customer | null) => void;
  disabled?: boolean;
}

type UIState = 'idle' | 'searching' | 'results' | 'creating' | 'selected';

const TierBadge: React.FC<{ tier: Customer['tier'] }> = ({ tier }) => {
  const cfg = TIER_CONFIG[tier];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
};

const CustomerSearch: React.FC<Props> = ({ selectedCustomer, onSelect, disabled }) => {
  const [input, setInput] = useState('');
  const [uiState, setUiState] = useState<UIState>(selectedCustomer ? 'selected' : 'idle');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  // Create form
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync selected customer ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedCustomer) {
      setUiState('selected');
      setInput('');
    }
  }, [selectedCustomer]);

  // ── Debounced search ────────────────────────────────────────────────────
  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      setUiState('idle');
      return;
    }
    setLoading(true);
    setUiState('searching');
    try {
      const list = await customersApi.search(keyword);
      setResults(list);
      setUiState('results');
      setActiveIdx(0);
    } catch {
      setResults([]);
      setUiState('results');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  // ── Click outside ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        if (uiState === 'results' || uiState === 'creating') {
          setUiState('idle');
          setInput('');
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [uiState]);

  // ── Keyboard nav ────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (uiState === 'results') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx < results.length) {
          selectCustomer(results[activeIdx]);
        } else {
          // "Tạo mới" row is at index results.length
          openCreateForm();
        }
      }
      if (e.key === 'Escape') { setUiState('idle'); setInput(''); }
    }
  };

  // ── Select ──────────────────────────────────────────────────────────────
  const selectCustomer = (c: Customer) => {
    onSelect(c);
    setUiState('selected');
    setInput('');
    setResults([]);
  };

  const clearCustomer = () => {
    onSelect(null);
    setUiState('idle');
    setInput('');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Create inline ────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setCreateName('');
    setCreateError('');
    setUiState('creating');
  };

  const handleCreate = async () => {
    const phone = input.trim();
    const name = createName.trim();
    if (!name) { setCreateError('Vui lòng nhập tên khách hàng'); return; }
    if (!/^[0-9]{9,11}$/.test(phone)) { setCreateError('Số điện thoại không hợp lệ'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const newCustomer = await customersApi.create({ name, phone });
      selectCustomer(newCustomer);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setCreateError(Array.isArray(msg) ? msg[0] : msg ?? 'Tạo khách hàng thất bại');
    } finally {
      setCreating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Selected state
  // ─────────────────────────────────────────────────────────────────────────
  if (uiState === 'selected' && selectedCustomer) {
    return (
      <SelectedCustomerCard customer={selectedCustomer} onClear={clearCustomer} disabled={disabled} />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Search input + dropdown
  // ─────────────────────────────────────────────────────────────────────────
  const showDropdown = (uiState === 'results' || uiState === 'searching' || uiState === 'creating') && !disabled;

  return (
    <div className="relative">
      {/* Input */}
      <div className={[
        'flex items-center gap-2 h-9 px-3 border-[1.5px] rounded-lg transition-colors',
        showDropdown
          ? 'border-[#111110] bg-white shadow-sm'
          : 'border-[#e6e6e2] bg-[#f6f6f4]',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}>
        {loading ? (
          <span className="w-3.5 h-3.5 border-[1.5px] border-[#a8a8a3] border-t-[#111110] rounded-full animate-spin shrink-0" />
        ) : (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#a8a8a3" strokeWidth="1.8" className="shrink-0">
            <circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" strokeLinecap="round" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="tel"
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (input && results.length > 0) setUiState('results'); }}
          placeholder="SĐT hoặc tên khách hàng"
          className="flex-1 bg-transparent text-[12.5px] text-[#111110] outline-none placeholder:text-[#a8a8a3] min-w-0"
        />
        {input && (
          <button
            onClick={() => { setInput(''); setResults([]); setUiState('idle'); }}
            className="w-4 h-4 flex items-center justify-center rounded-full text-[#a8a8a3] hover:text-[#6b6b68]"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 1l6 6M7 1L1 7" />
            </svg>
          </button>
        )}
        <span className="font-mono text-[10.5px] text-[#c0c0bb] shrink-0">F4</span>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-xl border border-[#e6e6e2] shadow-xl z-[500] overflow-hidden"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {uiState === 'searching' && (
            <div className="px-4 py-3 text-[12.5px] text-[#a8a8a3] text-center">
              Đang tìm kiếm...
            </div>
          )}

          {uiState === 'results' && (
            <>
              {results.length === 0 ? (
                <div className="px-4 py-3">
                  <p className="text-[12.5px] text-[#a8a8a3] text-center mb-2">
                    Không tìm thấy khách hàng
                  </p>
                  {/^[0-9]{9,11}$/.test(input.trim()) && (
                    <button
                      onClick={openCreateForm}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f6f6f4] hover:bg-[#ebebea] transition-colors text-left"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#111110] flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M5 1v8M1 5h8" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-[#111110]">Tạo khách hàng mới</p>
                        <p className="text-[11px] text-[#a8a8a3]">SĐT: {input.trim()}</p>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {results.map((c, idx) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        activeIdx === idx ? 'bg-[#f6f6f4]' : 'hover:bg-[#fafafa]',
                      ].join(' ')}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[#111110] flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-bold text-white">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-[#111110] truncate">{c.name}</span>
                          <TierBadge tier={c.tier} />
                        </div>
                        <p className="text-[11.5px] text-[#a8a8a3] font-mono mt-0.5">{c.phone}</p>
                      </div>
                      {/* Points */}
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-semibold text-[#111110]">{c.points.toLocaleString()}</p>
                        <p className="text-[10.5px] text-[#a8a8a3]">điểm</p>
                      </div>
                    </button>
                  ))}

                  {/* Create new row */}
                  {/^[0-9]{9,11}$/.test(input.trim()) && (
                    <>
                      <div className="h-px bg-[#f0f0ee] mx-3" />
                      <button
                        onClick={openCreateForm}
                        className={[
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          activeIdx === results.length ? 'bg-[#f6f6f4]' : 'hover:bg-[#fafafa]',
                        ].join(' ')}
                      >
                        <div className="w-8 h-8 rounded-full border-[1.5px] border-dashed border-[#cacac4] flex items-center justify-center shrink-0">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#a8a8a3" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M5 1v8M1 5h8" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[12.5px] font-medium text-[#6b6b68]">Tạo khách hàng mới</p>
                          <p className="text-[11px] text-[#a8a8a3]">SĐT: {input.trim()}</p>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Create inline form */}
          {uiState === 'creating' && (
            <div className="p-4 space-y-3">
              <p className="text-[12.5px] font-semibold text-[#111110]">
                Tạo khách hàng mới
              </p>

              <div>
                <label className="text-[11px] text-[#a8a8a3] font-medium uppercase tracking-wide block mb-1">
                  Số điện thoại
                </label>
                <div className="h-9 px-3 flex items-center rounded-lg border-[1.5px] border-[#e6e6e2] bg-[#f6f6f4] font-mono text-[13px] text-[#6b6b68]">
                  {input}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#a8a8a3] font-medium uppercase tracking-wide block mb-1">
                  Tên khách hàng <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Nhập tên..."
                  className="w-full h-9 px-3 rounded-lg border-[1.5px] border-[#e6e6e2] outline-none focus:border-[#111110] text-[13px] text-[#111110] placeholder:text-[#c0c0bb] transition-colors"
                />
              </div>

              {createError && (
                <p className="text-[12px] text-red-500">{createError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setUiState('results')}
                  className="flex-1 h-9 rounded-lg border-[1.5px] border-[#e6e6e2] text-[12.5px] text-[#6b6b68] hover:bg-[#f6f6f4] transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !createName.trim()}
                  className="flex-[1.5] h-9 rounded-lg bg-[#111110] text-white text-[12.5px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#2a2a28] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M5.5 1v9M1 5.5h9" />
                      </svg>
                      Tạo & chọn
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Selected Customer Card ────────────────────────────────────────────────────

const SelectedCustomerCard: React.FC<{
  customer: Customer;
  onClear: () => void;
  disabled?: boolean;
}> = ({ customer, onClear, disabled }) => {
  const cfg = TIER_CONFIG[customer.tier];

  return (
    <div className={[
      'flex items-center gap-2.5 px-3 py-2 rounded-lg border-[1.5px] border-[#e6e6e2] bg-[#fafafa] transition-all',
      disabled ? 'opacity-60' : '',
    ].join(' ')}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-[#111110] flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold text-white">
          {customer.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-semibold text-[#111110] truncate">{customer.name}</span>
          <span
            className="shrink-0 text-[10px] font-semibold px-1.5 py-px rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="font-mono text-[11px] text-[#a8a8a3]">{customer.phone}</span>
          <span className="text-[#e6e6e2]">·</span>
          <span className="text-[11px] text-[#a8a8a3]">
            <strong className="text-[#6b6b68]">{customer.points.toLocaleString()}</strong> điểm
          </span>
        </div>
      </div>

      {/* Clear */}
      {!disabled && (
        <button
          onClick={onClear}
          className="w-5 h-5 flex items-center justify-center rounded-full text-[#c0c0bb] hover:text-[#6b6b68] hover:bg-[#f0f0ee] transition-colors shrink-0"
          title="Bỏ chọn khách"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1 1l6 6M7 1L1 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default CustomerSearch;
