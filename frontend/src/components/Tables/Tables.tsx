import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTableCells, faList, faBoxOpen, faToggleOn, faToggleOff,
} from '@fortawesome/free-solid-svg-icons';
import tablesData from '../../tables.json';
import { TableModal, TableConfirmModal } from './components/TableModals';
import ZoneSidebar from './components/ZoneSidebar';
import TableCard from './components/TableCard';
import TableListView from './components/TableListView';

/* ── Types ── */
interface TableItem {
  id: string; name: string; seats: number; note: string; status: 'active' | 'inactive';
}
interface Zone {
  id: string; name: string; note: string; status: 'active' | 'inactive'; tables: TableItem[];
}

/* ── Constants ── */
const genId = (prefix: string) => `${prefix}-${Date.now()}`;
const INIT_TABLE: Omit<TableItem, 'id'> = { name: '', seats: 4, note: '', status: 'active' };
const INIT_ZONE: Omit<Zone, 'id' | 'tables'> = { name: '', note: '', status: 'active' };
const inputCls = 'h-10 px-3.5 border border-gray-200 rounded-[9px] text-[13.5px] text-gray-900 bg-gray-50 outline-none transition-all focus:border-[#3dba74] focus:shadow-[0_0_0_3px_rgba(61,186,116,0.15)] focus:bg-white font-[inherit] w-full';

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

  const [confirm, setConfirm] = useState<{
    open: boolean; message: string; onConfirm: () => void;
  }>({ open: false, message: '', onConfirm: () => { } });

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
      z.id === zoneId ? { ...z, status: z.status === 'active' ? 'inactive' : 'active' } : z,
    ));

  /* ── Table CRUD ── */
  const openAddTable = () => setTableModal({ open: true, mode: 'add', data: { ...INIT_TABLE }, bulkCount: 5, bulkStart: 1 });
  const openBulkTable = () => setTableModal({ open: true, mode: 'bulk', data: { ...INIT_TABLE, name: 'Bàn' }, bulkCount: 5, bulkStart: 1 });
  const openEditTable = (t: TableItem) =>
    setTableModal({ open: true, mode: 'edit', data: { name: t.name, seats: t.seats, note: t.note, status: t.status }, editId: t.id, bulkCount: 5, bulkStart: 1 });

  const saveTable = () => {
    if (!tableModal.data.name.trim()) return;
    setZones(prev => prev.map(z => {
      if (z.id !== activeZone) return z;
      if (tableModal.mode === 'add') {
        return { ...z, tables: [...z.tables, { id: genId('t'), ...tableModal.data }] };
      } else if (tableModal.mode === 'bulk') {
        const newTables = Array.from({ length: tableModal.bulkCount }, (_, i) => ({
          id: genId(`t${i}`), ...tableModal.data,
          name: `${tableModal.data.name} ${tableModal.bulkStart + i}`,
        }));
        return { ...z, tables: [...z.tables, ...newTables] };
      } else {
        return { ...z, tables: z.tables.map(t => t.id === tableModal.editId ? { ...t, ...tableModal.data } : t) };
      }
    }));
    setTableModal(v => ({ ...v, open: false }));
  };

  const deleteTable = (tableId: string) => {
    const t = currentZone?.tables.find(t => t.id === tableId)!;
    setConfirm({
      open: true,
      message: `Xoá "${t.name}"? Thao tác này không thể hoàn tác.`,
      onConfirm: () => {
        setZones(prev => prev.map(z =>
          z.id === activeZone ? { ...z, tables: z.tables.filter(t => t.id !== tableId) } : z,
        ));
        setConfirm(v => ({ ...v, open: false }));
      },
    });
  };

  const toggleTableStatus = (tableId: string) =>
    setZones(prev => prev.map(z => z.id !== activeZone ? z : {
      ...z,
      tables: z.tables.map(t =>
        t.id === tableId ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t,
      ),
    }));

  const setZoneField = (k: keyof typeof INIT_ZONE, v: string) =>
    setZoneModal(prev => ({ ...prev, data: { ...prev.data, [k]: v } }));
  const setTableField = (k: keyof typeof INIT_TABLE, v: string | number) =>
    setTableModal(prev => ({ ...prev, data: { ...prev.data, [k]: v } }));

  /* ── Render ── */
  return (
    <div className="flex bg-[#f4f6f8] overflow-hidden font-['Segoe_UI',sans-serif]" style={{ height: 'calc(100vh - 96px)' }}>

      <ZoneSidebar
        zones={zones}
        activeZone={activeZone}
        onSelect={setActiveZone}
        onAdd={openAddZone}
        onEdit={openEditZone}
        onToggle={toggleZoneStatus}
        onDelete={deleteZone}
      />

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#e8eaed] shrink-0 gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[18px] font-extrabold text-gray-900 m-0 flex items-center gap-2">
              {currentZone?.name ?? '—'}
              {currentZone?.status === 'inactive' && (
                <span className="text-[10.5px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full border border-gray-200">Ngừng HĐ</span>
              )}
            </h2>
            {currentZone?.note && <span className="text-[12px] text-[#aaa]">{currentZone.note}</span>}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-[#f4f5f7] rounded-lg p-[3px] gap-0.5">
              {(['grid', 'list'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`w-8 h-7 border-none rounded-[6px] cursor-pointer text-[13px] flex items-center justify-center transition-all ${viewMode === mode ? 'bg-white text-[#2a9e5e] shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#aaa]'}`}
                >
                  <FontAwesomeIcon icon={mode === 'grid' ? faTableCells : faList} />
                </button>
              ))}
            </div>
            <button
              onClick={openBulkTable}
              className="flex items-center gap-1.5 h-9 px-3.5 border border-gray-300 bg-white rounded-lg text-[13px] font-semibold text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:border-[#3dba74] hover:text-[#3dba74] hover:bg-[#f0fbf5]"
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm hàng loạt
            </button>
            <button
              onClick={openAddTable}
              className="flex items-center gap-1.5 h-9 px-4 border-none bg-[#3dba74] rounded-lg text-[13px] font-bold text-white cursor-pointer transition-all whitespace-nowrap hover:bg-[#31a862] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(61,186,116,0.3)]"
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
          <div
            className="flex-1 p-5 grid gap-3.5 overflow-y-auto content-start [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
          >
            {currentZone.tables.map(t => (
              <TableCard
                key={t.id}
                table={t}
                onEdit={() => openEditTable(t)}
                onToggle={() => toggleTableStatus(t.id)}
                onDelete={() => deleteTable(t.id)}
              />
            ))}
          </div>
        ) : (
          <TableListView
            tables={currentZone.tables}
            onEdit={openEditTable}
            onToggle={toggleTableStatus}
            onDelete={deleteTable}
          />
        )}
      </main>

      {/* ── Zone Modal ── */}
      {zoneModal.open && (
        <TableModal
          title={zoneModal.mode === 'add' ? 'Thêm khu vực' : 'Chỉnh sửa khu vực'}
          onClose={() => setZoneModal(v => ({ ...v, open: false }))}
          onSave={saveZone}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-gray-700">Tên khu vực <span className="text-[#e11d48]">*</span></label>
              <input className={inputCls} placeholder="VD: Tầng 1, Sân vườn..." value={zoneModal.data.name} onChange={e => setZoneField('name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-gray-700">Ghi chú</label>
              <input className={inputCls} placeholder="Ghi chú thêm..." value={zoneModal.data.note} onChange={e => setZoneField('note', e.target.value)} />
            </div>
          </div>
        </TableModal>
      )}

      {/* ── Table Modal ── */}
      {tableModal.open && (
        <TableModal
          title={tableModal.mode === 'add' ? 'Thêm phòng/bàn' : tableModal.mode === 'edit' ? 'Chỉnh sửa phòng/bàn' : 'Thêm hàng loạt'}
          onClose={() => setTableModal(v => ({ ...v, open: false }))}
          onSave={saveTable}
        >
          <div className="flex flex-col gap-4">
            {tableModal.mode === 'bulk' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">Tên phòng/bàn <span className="text-[#e11d48]">*</span></label>
                  <input className={inputCls} placeholder="VD: Bàn" value={tableModal.data.name} onChange={e => setTableField('name', e.target.value)} />
                  <span className="text-[11.5px] text-[#9ca3af]">Hệ thống sẽ tự thêm số: Bàn 1, Bàn 2...</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số lượng</label>
                    <input className={inputCls} type="number" min={1} max={100} value={tableModal.bulkCount} onChange={e => setTableModal(v => ({ ...v, bulkCount: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số bắt đầu</label>
                    <input className={inputCls} type="number" min={1} value={tableModal.bulkStart} onChange={e => setTableModal(v => ({ ...v, bulkStart: parseInt(e.target.value) || 1 }))} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">Số ghế mỗi bàn</label>
                  <input className={inputCls} type="number" min={1} value={tableModal.data.seats} onChange={e => setTableField('seats', parseInt(e.target.value) || 1)} />
                </div>
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[9px] px-3.5 py-[11px] text-[13px] text-[#16a34a] font-medium">
                  Sẽ tạo: <strong>{tableModal.bulkCount}</strong> bàn — {tableModal.data.name} {tableModal.bulkStart} → {tableModal.data.name} {tableModal.bulkStart + tableModal.bulkCount - 1}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">Tên phòng/bàn <span className="text-[#e11d48]">*</span></label>
                  <input className={inputCls} placeholder="VD: Bàn 01, Phòng VIP..." value={tableModal.data.name} onChange={e => setTableField('name', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số ghế</label>
                    <input className={inputCls} type="number" min={1} value={tableModal.data.seats} onChange={e => setTableField('seats', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Trạng thái</label>
                    <button
                      onClick={() => setTableField('status', tableModal.data.status === 'active' ? 'inactive' : 'active')}
                      className={[
                        'flex items-center gap-2 h-10 px-3.5 rounded-[9px] border cursor-pointer text-[13px] font-semibold transition-all font-[inherit]',
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
                  <input className={inputCls} placeholder="Ghi chú thêm..." value={tableModal.data.note} onChange={e => setTableField('note', e.target.value)} />
                </div>
              </>
            )}
          </div>
        </TableModal>
      )}

      {confirm.open && (
        <TableConfirmModal
          message={confirm.message}
          onCancel={() => setConfirm(v => ({ ...v, open: false }))}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
};

export default Tables;