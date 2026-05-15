import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faPen, faTrash, faToggleOn, faToggleOff,
  faTableCells, faList, faChair, faLayerGroup,
  faXmark, faBoxOpen,
} from '@fortawesome/free-solid-svg-icons';
import tablesData from '../../tables.json';

/* ── Types ── */
interface TableItem {
  id: string;
  name: string;
  seats: number;
  note: string;
  status: 'active' | 'inactive';
}

interface Zone {
  id: string;
  name: string;
  note: string;
  status: 'active' | 'inactive';
  tables: TableItem[];
}

/* ── Helpers ── */
const genId = (prefix: string) => `${prefix}-${Date.now()}`;

const INIT_TABLE: Omit<TableItem, 'id'> = { name: '', seats: 4, note: '', status: 'active' };
const INIT_ZONE: Omit<Zone, 'id' | 'tables'> = { name: '', note: '', status: 'active' };

/* ── Modal chung ── */
interface ModalProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ title, onClose, onSave, saveLabel = 'Lưu', children }) => (
  <div
    className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-[1000] animate-[tbFade_0.15s_ease]"
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div className="bg-white rounded-2xl w-[440px] max-w-[95vw] shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden animate-[tbSlide_0.22s_cubic-bezier(0.34,1.3,0.64,1)]">
      {/* Header */}
      <div className="flex items-center justify-between px-[22px] pt-[18px] pb-4 border-b border-gray-100">
        <h3 className="text-base font-extrabold text-gray-900 m-0">{title}</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 border-none bg-gray-100 rounded-lg cursor-pointer text-gray-500 text-sm flex items-center justify-center transition-all hover:bg-red-100 hover:text-red-600"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      {/* Body */}
      <div className="px-[22px] py-5">{children}</div>
      {/* Footer */}
      <div className="flex justify-end gap-2.5 px-[22px] pt-3.5 pb-[18px] border-t border-gray-100">
        <button
          onClick={onClose}
          className="h-10 px-5 border border-gray-200 bg-white rounded-[9px] text-[13.5px] font-semibold text-gray-500 cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300 font-[inherit]"
        >
          Huỷ
        </button>
        <button
          onClick={onSave}
          className="h-10 px-6 border-none bg-[#3dba74] rounded-[9px] text-[13.5px] font-bold text-white cursor-pointer transition-all hover:bg-[#16a34a] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(61,186,116,0.3)] font-[inherit]"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  </div>
);

/* ── Confirm xoá ── */
interface ConfirmProps { message: string; onCancel: () => void; onConfirm: () => void; }
const ConfirmModal: React.FC<ConfirmProps> = ({ message, onCancel, onConfirm }) => (
  <div
    className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-[1000]"
    onClick={e => e.target === e.currentTarget && onCancel()}
  >
    <div className="bg-white rounded-2xl px-[26px] pt-7 pb-[22px] w-[380px] max-w-[95vw] shadow-[0_24px_64px_rgba(0,0,0,0.18)] text-center animate-[tbSlide_0.22s_cubic-bezier(0.34,1.3,0.64,1)]">
      <p className="text-[14px] text-gray-700 leading-[1.65] mb-[22px]">{message}</p>
      <div className="flex justify-center gap-2.5">
        <button
          onClick={onCancel}
          className="h-10 px-5 border border-gray-200 bg-white rounded-[9px] text-[13.5px] font-semibold text-gray-500 cursor-pointer transition-all hover:bg-gray-50 font-[inherit]"
        >
          Huỷ
        </button>
        <button
          onClick={onConfirm}
          className="h-10 px-6 border-none bg-[#e11d48] rounded-[9px] text-[13.5px] font-bold text-white cursor-pointer transition-all hover:bg-[#be123c] font-[inherit]"
        >
          Xoá
        </button>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════ */
const Tables: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>(tablesData as Zone[]);
  const [activeZone, setActiveZone] = useState<string>(tablesData[0]?.id ?? '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [zoneModal, setZoneModal] = useState<{
    open: boolean; mode: 'add' | 'edit';
    data: Omit<Zone, 'id' | 'tables'>; editId?: string;
  }>({ open: false, mode: 'add', data: { ...INIT_ZONE } });

  const [tableModal, setTableModal] = useState<{
    open: boolean; mode: 'add' | 'edit' | 'bulk';
    data: Omit<TableItem, 'id'>; editId?: string;
    bulkCount: number; bulkStart: number;
  }>({ open: false, mode: 'add', data: { ...INIT_TABLE }, bulkCount: 5, bulkStart: 1 });

  const [confirm, setConfirm] = useState<{ open: boolean; message: string; onConfirm: () => void }>
    ({ open: false, message: '', onConfirm: () => {} });

  const currentZone = useMemo(() => zones.find(z => z.id === activeZone), [zones, activeZone]);

  /* ── Zone CRUD ── */
  const openAddZone = () => setZoneModal({ open: true, mode: 'add', data: { ...INIT_ZONE } });
  const openEditZone = (z: Zone) =>
    setZoneModal({ open: true, mode: 'edit', data: { name: z.name, note: z.note, status: z.status }, editId: z.id });

  const saveZone = () => {
    if (!zoneModal.data.name.trim()) return;
    if (zoneModal.mode === 'add') {
      const newZone: Zone = { id: genId('zone'), ...zoneModal.data, tables: [] };
      setZones(prev => [...prev, newZone]);
      setActiveZone(newZone.id);
    } else {
      setZones(prev => prev.map(z => z.id === zoneModal.editId ? { ...z, ...zoneModal.data } : z));
    }
    setZoneModal(v => ({ ...v, open: false }));
  };

  const deleteZone = (zoneId: string) => {
    const z = zones.find(z => z.id === zoneId)!;
    setConfirm({
      open: true,
      message: `Xoá khu vực "${z.name}" sẽ xoá tất cả phòng/bàn thuộc khu vực này. Bạn có chắc chắn?`,
      onConfirm: () => {
        setZones(prev => prev.filter(z => z.id !== zoneId));
        if (activeZone === zoneId) setActiveZone(zones.find(z => z.id !== zoneId)?.id ?? '');
        setConfirm(v => ({ ...v, open: false }));
      },
    });
  };

  const toggleZoneStatus = (zoneId: string) =>
    setZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, status: z.status === 'active' ? 'inactive' : 'active' } : z
    ));

  /* ── Table CRUD ── */
  const openAddTable = () =>
    setTableModal({ open: true, mode: 'add', data: { ...INIT_TABLE }, bulkCount: 5, bulkStart: 1 });
  const openBulkTable = () =>
    setTableModal({ open: true, mode: 'bulk', data: { ...INIT_TABLE, name: 'Bàn' }, bulkCount: 5, bulkStart: 1 });
  const openEditTable = (t: TableItem) =>
    setTableModal({ open: true, mode: 'edit', data: { name: t.name, seats: t.seats, note: t.note, status: t.status }, editId: t.id, bulkCount: 5, bulkStart: 1 });

  const saveTable = () => {
    if (!tableModal.data.name.trim()) return;
    if (tableModal.mode === 'add') {
      const newTable: TableItem = { id: genId('t'), ...tableModal.data };
      setZones(prev => prev.map(z => z.id === activeZone ? { ...z, tables: [...z.tables, newTable] } : z));
    } else if (tableModal.mode === 'edit') {
      setZones(prev => prev.map(z => z.id === activeZone
        ? { ...z, tables: z.tables.map(t => t.id === tableModal.editId ? { ...t, ...tableModal.data } : t) } : z));
    } else {
      const newTables: TableItem[] = Array.from({ length: tableModal.bulkCount }, (_, i) => ({
        id: genId(`t-b${i}`),
        name: `${tableModal.data.name} ${tableModal.bulkStart + i}`,
        seats: tableModal.data.seats,
        note: tableModal.data.note,
        status: 'active' as const,
      }));
      setZones(prev => prev.map(z => z.id === activeZone ? { ...z, tables: [...z.tables, ...newTables] } : z));
    }
    setTableModal(v => ({ ...v, open: false }));
  };

  const deleteTable = (tableId: string) => {
    const t = currentZone?.tables.find(t => t.id === tableId)!;
    setConfirm({
      open: true,
      message: `Xoá "${t.name}" khỏi khu vực này?`,
      onConfirm: () => {
        setZones(prev => prev.map(z => z.id === activeZone
          ? { ...z, tables: z.tables.filter(t => t.id !== tableId) } : z));
        setConfirm(v => ({ ...v, open: false }));
      },
    });
  };

  const toggleTableStatus = (tableId: string) =>
    setZones(prev => prev.map(z => z.id === activeZone
      ? { ...z, tables: z.tables.map(t => t.id === tableId
          ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t) } : z));

  const setZoneField = (k: keyof typeof INIT_ZONE, v: string) =>
    setZoneModal(prev => ({ ...prev, data: { ...prev.data, [k]: v } }));
  const setTableField = (k: keyof typeof INIT_TABLE, v: string | number) =>
    setTableModal(prev => ({ ...prev, data: { ...prev.data, [k]: v } }));

  /* ── Shared input class ── */
  const inputCls = "h-10 px-3.5 border border-gray-200 rounded-[9px] text-[13.5px] text-gray-900 bg-gray-50 outline-none transition-all focus:border-[#3dba74] focus:shadow-[0_0_0_3px_rgba(61,186,116,0.15)] focus:bg-white font-[inherit] w-full";

  return (
    <div className="flex bg-[#f4f6f8] overflow-hidden font-['Segoe_UI',sans-serif]" style={{ height: 'calc(100vh - 96px)' }}>

      {/* ── SIDEBAR ── */}
      <aside className="w-[220px] shrink-0 bg-white border-r border-[#e8eaed] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-gray-100">
          <span className="text-[12px] font-bold text-[#888] uppercase tracking-[0.5px] flex items-center gap-1.5">
            <FontAwesomeIcon icon={faLayerGroup} /> Khu vực
          </span>
          <button
            onClick={openAddZone}
            title="Thêm khu vực"
            className="w-[26px] h-[26px] border-none rounded-[6px] bg-[#f0fbf5] text-[#3dba74] cursor-pointer text-[12px] flex items-center justify-center font-bold transition-all hover:bg-[#3dba74] hover:text-white"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        {/* Zone list */}
        <div className="flex-1 overflow-y-auto px-2 py-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
          {zones.map(z => (
            <div
              key={z.id}
              onClick={() => setActiveZone(z.id)}
              className={[
                'flex items-center justify-between px-2.5 py-[9px] rounded-lg cursor-pointer transition-all mb-0.5 gap-1.5 group',
                activeZone === z.id ? 'bg-[#f0fbf5] shadow-[inset_3px_0_0_#3dba74]' : 'hover:bg-[#f7f8fa]',
                z.status === 'inactive' ? 'opacity-45' : '',
              ].join(' ')}
            >
              <div className="flex-1 min-w-0">
                <span className={`block text-[13.5px] font-semibold truncate ${activeZone === z.id ? 'text-[#2a9e5e]' : 'text-[#1a1a1a]'}`}>
                  {z.name}
                </span>
                <span className="block text-[11px] text-[#bbb] mt-px">{z.tables.length} bàn</span>
              </div>
              <div
                className="flex gap-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ opacity: activeZone === z.id ? 1 : undefined }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  title="Chỉnh sửa"
                  onClick={() => openEditZone(z)}
                  className="w-6 h-6 border-none bg-transparent rounded-[5px] cursor-pointer text-[11px] text-[#bbb] flex items-center justify-center transition-all hover:bg-[#f0f0f0] hover:text-[#555]"
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button
                  title={z.status === 'active' ? 'Ngừng hoạt động' : 'Cho phép hoạt động'}
                  onClick={() => toggleZoneStatus(z.id)}
                  className="w-6 h-6 border-none bg-transparent rounded-[5px] cursor-pointer text-[11px] text-[#bbb] flex items-center justify-center transition-all hover:bg-[#f0f0f0] hover:text-[#555]"
                >
                  <FontAwesomeIcon
                    icon={z.status === 'active' ? faToggleOn : faToggleOff}
                    className={z.status === 'active' ? 'text-[#3dba74] text-[15px]' : 'text-[#d1d5db] text-[15px]'}
                  />
                </button>
                <button
                  title="Xoá khu vực"
                  onClick={() => deleteZone(z.id)}
                  className="w-6 h-6 border-none bg-transparent rounded-[5px] cursor-pointer text-[11px] text-[#bbb] flex items-center justify-center transition-all hover:bg-[#fff1f1] hover:text-[#e03e3e]"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#e8eaed] shrink-0 gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[18px] font-extrabold text-gray-900 m-0 flex items-center gap-2">
              {currentZone?.name ?? '—'}
              {currentZone?.status === 'inactive' && (
                <span className="text-[10.5px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full border border-gray-200">
                  Ngừng HĐ
                </span>
              )}
            </h2>
            {currentZone?.note && <span className="text-[12px] text-[#aaa]">{currentZone.note}</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* View switch */}
            <div className="flex bg-[#f4f5f7] rounded-lg p-[3px] gap-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-8 h-7 border-none rounded-[6px] cursor-pointer text-[13px] flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white text-[#2a9e5e] shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#aaa]'}`}
              >
                <FontAwesomeIcon icon={faTableCells} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-8 h-7 border-none rounded-[6px] cursor-pointer text-[13px] flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-[#2a9e5e] shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#aaa]'}`}
              >
                <FontAwesomeIcon icon={faList} />
              </button>
            </div>
            <button
              onClick={openBulkTable}
              className="flex items-center gap-1.5 h-9 px-3.5 border border-gray-300 bg-white rounded-lg text-[13px] font-semibold text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:border-[#3dba74] hover:text-[#3dba74] hover:bg-[#f0fbf5]"
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm hàng loạt
            </button>
            <button
              onClick={openAddTable}
              className="flex items-center gap-1.5 h-9 px-4 border-none bg-[#3dba74] rounded-lg text-[13px] font-bold text-white cursor-pointer transition-all whitespace-nowrap hover:bg-[#31a862] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(61,186,116,0.3)] active:translate-y-0"
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm phòng/bàn
            </button>
          </div>
        </div>

        {/* Content */}
        {!currentZone || currentZone.tables.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3.5">
            <FontAwesomeIcon icon={faBoxOpen} className="text-[48px] text-gray-200" />
            <p className="text-[14px] text-[#9ca3af] m-0">Khu vực này chưa có phòng/bàn nào</p>
            <button
              onClick={openAddTable}
              className="flex items-center gap-1.5 h-9 px-4 border-none bg-[#3dba74] rounded-lg text-[13px] font-bold text-white cursor-pointer transition-all hover:bg-[#31a862]"
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm phòng/bàn đầu tiên
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Grid view ── */
          <div className="flex-1 p-5 grid gap-3.5 overflow-y-auto content-start [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
          >
            {currentZone.tables.map(t => (
              <div
                key={t.id}
                className={[
                  'bg-white rounded-2xl px-4 pt-[18px] pb-3.5 border flex flex-col gap-2.5 transition-all relative cursor-default',
                  t.status === 'inactive'
                    ? 'opacity-50 border-dashed border-gray-200 hover:border-gray-300'
                    : 'border-[1.5px] border-[#f0f0f0] hover:border-[#3dba74] hover:shadow-[0_6px_24px_rgba(61,186,116,0.12)] hover:-translate-y-0.5',
                ].join(' ')}
              >
                {/* Card top */}
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-[15px] font-bold text-gray-900 leading-snug">{t.name}</span>
                  <div
                    title={t.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}
                    className="w-[9px] h-[9px] rounded-full shrink-0 mt-1 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
                    style={{ background: t.status === 'active' ? '#3dba74' : '#d1d5db' }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] text-gray-500 font-medium">
                  <FontAwesomeIcon icon={faChair} className="text-[#9ca3af] text-[11px]" />
                  <span>{t.seats} ghế</span>
                </div>
                {t.note && (
                  <p className="text-[11.5px] text-[#9ca3af] m-0 italic truncate">{t.note}</p>
                )}
                {/* Divider */}
                <div className="h-px bg-[#f5f5f5] -mx-1" />
                {/* Actions */}
                <div className="flex gap-1.5 pt-0.5">
                  <button
                    onClick={() => openEditTable(t)}
                    className="flex-1 h-7 border-none rounded-[7px] text-[11.5px] font-semibold cursor-pointer flex items-center justify-center gap-1 transition-all bg-[#eff6ff] text-[#3b82f6] hover:bg-[#dbeafe]"
                  >
                    <FontAwesomeIcon icon={faPen} /> Sửa
                  </button>
                  <button
                    onClick={() => toggleTableStatus(t.id)}
                    className={[
                      'flex-[1.5] h-7 border-none rounded-[7px] text-[11px] font-semibold cursor-pointer flex items-center justify-center transition-all',
                      t.status === 'active'
                        ? 'bg-[#fff7ed] text-[#ea580c] hover:bg-[#fed7aa]'
                        : 'bg-[#f0fdf4] text-[#16a34a] hover:bg-[#bbf7d0]',
                    ].join(' ')}
                  >
                    {t.status === 'active' ? 'Ngừng HĐ' : 'Hoạt động'}
                  </button>
                  <button
                    onClick={() => deleteTable(t.id)}
                    className="flex-[0.7] h-7 border-none rounded-[7px] text-[11.5px] cursor-pointer flex items-center justify-center transition-all bg-[#fff1f2] text-[#e11d48] hover:bg-[#fecdd3]"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── List view ── */
          <div className="flex-1 overflow-y-auto m-4 bg-white rounded-xl border border-[#e8eaed] overflow-hidden [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
            {/* Head */}
            <div className="grid border-b border-[#e8eaed] bg-[#f9fafb] sticky top-0 z-[1]"
              style={{ gridTemplateColumns: '2fr 90px 2fr 140px 100px' }}
            >
              {['Tên phòng/bàn', 'Số ghế', 'Ghi chú', 'Trạng thái', 'Thao tác'].map(col => (
                <div key={col} className="px-4 py-3 text-[12px] text-[#9ca3af] font-bold uppercase tracking-[0.3px]">{col}</div>
              ))}
            </div>
            {/* Rows */}
            {currentZone.tables.map((t, i) => (
              <div
                key={t.id}
                className={[
                  'grid border-b border-[#f5f5f5] items-center transition-colors',
                  i % 2 === 1 ? 'bg-[#fafafa] hover:bg-[#f4f5f7]' : 'hover:bg-[#fafbfc]',
                  t.status === 'inactive' ? 'opacity-45' : '',
                ].join(' ')}
                style={{ gridTemplateColumns: '2fr 90px 2fr 140px 100px' }}
              >
                <div className="px-4 py-3">
                  <span className="font-semibold text-gray-900 text-[13.5px]">{t.name}</span>
                </div>
                <div className="px-4 py-3 text-[13.5px] text-gray-700 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faChair} className="text-[#9ca3af] text-[11px]" /> {t.seats}
                </div>
                <div className="px-4 py-3 text-[13.5px] text-gray-700">{t.note || '—'}</div>
                <div className="px-4 py-3">
                  <button
                    onClick={() => toggleTableStatus(t.id)}
                    className="inline-flex items-center gap-1.5 border-none bg-transparent cursor-pointer text-[13px] text-gray-500 px-2 py-[5px] rounded-md transition-colors hover:bg-gray-100 font-[inherit]"
                  >
                    <FontAwesomeIcon
                      icon={t.status === 'active' ? faToggleOn : faToggleOff}
                      className={t.status === 'active' ? 'text-[#3dba74] text-[15px]' : 'text-[#d1d5db] text-[15px]'}
                    />
                    <span>{t.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}</span>
                  </button>
                </div>
                <div className="px-4 py-3 flex items-center gap-1.5">
                  <button
                    onClick={() => openEditTable(t)}
                    className="w-[30px] h-[30px] border-none rounded-[7px] cursor-pointer text-[12px] inline-flex items-center justify-center transition-all bg-[#eff6ff] text-[#3b82f6] hover:bg-[#dbeafe]"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button
                    onClick={() => deleteTable(t.id)}
                    className="w-[30px] h-[30px] border-none rounded-[7px] cursor-pointer text-[12px] inline-flex items-center justify-center transition-all bg-[#fff1f2] text-[#e11d48] hover:bg-[#fecdd3]"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Modal khu vực ── */}
      {zoneModal.open && (
        <Modal
          title={zoneModal.mode === 'add' ? 'Thêm khu vực' : 'Chỉnh sửa khu vực'}
          onClose={() => setZoneModal(v => ({ ...v, open: false }))}
          onSave={saveZone}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-gray-700">
                Tên khu vực <span className="text-[#e11d48]">*</span>
              </label>
              <input
                className={inputCls}
                placeholder="VD: Tầng 1, Sân vườn..."
                value={zoneModal.data.name}
                onChange={e => setZoneField('name', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-gray-700">Ghi chú</label>
              <input
                className={inputCls}
                placeholder="Ghi chú thêm..."
                value={zoneModal.data.note}
                onChange={e => setZoneField('note', e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal phòng/bàn ── */}
      {tableModal.open && (
        <Modal
          title={
            tableModal.mode === 'add' ? 'Thêm phòng/bàn'
            : tableModal.mode === 'edit' ? 'Chỉnh sửa phòng/bàn'
            : 'Thêm hàng loạt'
          }
          onClose={() => setTableModal(v => ({ ...v, open: false }))}
          onSave={saveTable}
        >
          <div className="flex flex-col gap-4">
            {tableModal.mode === 'bulk' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">
                    Tên phòng/bàn <span className="text-[#e11d48]">*</span>
                  </label>
                  <input
                    className={inputCls}
                    placeholder="VD: Bàn"
                    value={tableModal.data.name}
                    onChange={e => setTableField('name', e.target.value)}
                  />
                  <span className="text-[11.5px] text-[#9ca3af]">Hệ thống sẽ tự thêm số: Bàn 1, Bàn 2...</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số lượng</label>
                    <input
                      className={inputCls}
                      type="number" min={1} max={100}
                      value={tableModal.bulkCount}
                      onChange={e => setTableModal(v => ({ ...v, bulkCount: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số bắt đầu</label>
                    <input
                      className={inputCls}
                      type="number" min={1}
                      value={tableModal.bulkStart}
                      onChange={e => setTableModal(v => ({ ...v, bulkStart: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">Số ghế mỗi bàn</label>
                  <input
                    className={inputCls}
                    type="number" min={1}
                    value={tableModal.data.seats}
                    onChange={e => setTableField('seats', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[9px] px-3.5 py-[11px] text-[13px] text-[#16a34a] font-medium">
                  Sẽ tạo: <strong>{tableModal.bulkCount}</strong> bàn —{' '}
                  {tableModal.data.name} {tableModal.bulkStart} → {tableModal.data.name} {tableModal.bulkStart + tableModal.bulkCount - 1}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">
                    Tên phòng/bàn <span className="text-[#e11d48]">*</span>
                  </label>
                  <input
                    className={inputCls}
                    placeholder="VD: Bàn 01, Phòng VIP..."
                    value={tableModal.data.name}
                    onChange={e => setTableField('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số ghế</label>
                    <input
                      className={inputCls}
                      type="number" min={1}
                      value={tableModal.data.seats}
                      onChange={e => setTableField('seats', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Trạng thái</label>
                    <button
                      onClick={() => setTableField('status', tableModal.data.status === 'active' ? 'inactive' : 'active')}
                      className={[
                        'flex items-center gap-2 h-10 px-3.5 rounded-[9px] border cursor-pointer text-[13px] font-semibold bg-none transition-all font-[inherit]',
                        tableModal.data.status === 'active'
                          ? 'border-[#3dba74] text-[#16a34a] bg-[#f0fdf4]'
                          : 'border-gray-200 text-[#9ca3af] bg-[#f9fafb]',
                      ].join(' ')}
                    >
                      <FontAwesomeIcon icon={tableModal.data.status === 'active' ? faToggleOn : faToggleOff} />
                      {tableModal.data.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">Ghi chú</label>
                  <input
                    className={inputCls}
                    placeholder="Ghi chú thêm..."
                    value={tableModal.data.note}
                    onChange={e => setTableField('note', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── Confirm xoá ── */}
      {confirm.open && (
        <ConfirmModal
          message={confirm.message}
          onCancel={() => setConfirm(v => ({ ...v, open: false }))}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
};

export default Tables;