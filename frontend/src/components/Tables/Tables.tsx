// src/components/tables/Tables.tsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTableCells, faList, faBoxOpen, faToggleOn, faToggleOff, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { useTables } from './hooks/useTables';
import { TableModal, TableConfirmModal } from './components/TableModals';
import ZoneSidebar from './components/ZoneSidebar';
import TableCard from './components/TableCard';
import TableListView from './components/TableListView';
import TableQrModal from './components/TableQrModal';
import type { Zone, TableItem } from '../../api/tables.api';

/* ── Constants — explicit literal types to avoid widening ── */
const INIT_TABLE = {
  name: '',
  seats: 4,
  note: '',
  status: 'active' as 'active' | 'inactive',
};
const INIT_ZONE = {
  name: '',
  note: '',
  status: 'active' as 'active' | 'inactive',
};

const inputCls = 'h-10 px-3.5 border border-gray-200 rounded-[9px] text-[13.5px] text-gray-900 bg-gray-50 outline-none transition-all focus:border-[#3dba74] focus:shadow-[0_0_0_3px_rgba(61,186,116,0.15)] focus:bg-white font-[inherit] w-full';

/* ══════════════════════════════════════════════════════════════ */
const Tables: React.FC = () => {
  const {
    zones, loading, saving, activeZone, setActiveZone, currentZone,
    createZone, updateZone, deleteZone, toggleZoneStatus,
    createTable, createTablesBulk, updateTable, toggleTableStatus, deleteTable,
  } = useTables();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  /* ── Zone modal ── */
  const [zoneModal, setZoneModal] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    data: { name: string; note: string; status: 'active' | 'inactive' };
    editId?: string;
  }>({ open: false, mode: 'add', data: { ...INIT_ZONE } });

  /* ── Table modal ── */
  const [tableModal, setTableModal] = useState<{
    open: boolean;
    mode: 'add' | 'edit' | 'bulk';
    data: { name: string; seats: number; note: string; status: 'active' | 'inactive' };
    editId?: string;
    bulkCount: number;
    bulkStart: number;
  }>({ open: false, mode: 'add', data: { ...INIT_TABLE }, bulkCount: 5, bulkStart: 1 });

  /* ── Confirm modal ── */
  const [confirm, setConfirm] = useState<{
    open: boolean; message: string; onConfirm: () => void;
  }>({ open: false, message: '', onConfirm: () => { } });

  /* ── QR modal ── */
  const [qrModal, setQrModal] = useState<{
    open: boolean; tableId: string; tableName: string; zoneName?: string;
  }>({ open: false, tableId: '', tableName: '' });

  const openQrModal = (table: TableItem) =>
    setQrModal({ open: true, tableId: table.id, tableName: table.name, zoneName: currentZone?.name });
  const closeQrModal = () => setQrModal(m => ({ ...m, open: false }));

  /* ── Zone modal handlers ── */
  const openAddZone = () =>
    setZoneModal({ open: true, mode: 'add', data: { ...INIT_ZONE } });

  const openEditZone = (z: Zone) =>
    setZoneModal({
      open: true, mode: 'edit',
      data: { name: z.name, note: z.note, status: z.status },
      editId: z.id,
    });

  const saveZone = async () => {
    if (!zoneModal.data.name.trim()) return;
    if (zoneModal.mode === 'add') {
      await createZone({ name: zoneModal.data.name.trim(), note: zoneModal.data.note || undefined });
    } else if (zoneModal.editId) {
      await updateZone(zoneModal.editId, zoneModal.data);
    }
    setZoneModal(v => ({ ...v, open: false }));
  };

  /**
   * FIX: ZoneSidebar.onDelete expects (id: string) — truyền id thay vì Zone object.
   * Hiển thị confirm trước, sau đó gọi deleteZone(id).
   */
  const handleDeleteZone = (id: string) => {
    const z = zones.find(zone => zone.id === id);
    setConfirm({
      open: true,
      message: `Xoá khu vực "${z?.name ?? id}" sẽ xoá tất cả phòng/bàn thuộc khu vực này. Bạn có chắc chắn?`,
      onConfirm: async () => {
        await deleteZone(id, z?.name ?? id);
        setConfirm(v => ({ ...v, open: false }));
      },
    });
  };

  /* ── Table modal handlers ── */
  const openAddTable = () =>
    setTableModal({ open: true, mode: 'add', data: { ...INIT_TABLE }, bulkCount: 5, bulkStart: 1 });

  const openBulkTable = () =>
    setTableModal({ open: true, mode: 'bulk', data: { ...INIT_TABLE }, bulkCount: 5, bulkStart: 1 });

  const openEditTable = (t: TableItem) =>
    setTableModal({
      open: true, mode: 'edit',
      data: { name: t.name, seats: t.seats, note: t.note, status: t.status },
      editId: t.id, bulkCount: 5, bulkStart: 1,
    });

  const saveTable = async () => {
    if (!currentZone) return;
    const zoneIdNum = parseInt(currentZone.id, 10);
    if (tableModal.mode === 'add') {
      if (!tableModal.data.name.trim()) return;
      await createTable({
        zoneId: zoneIdNum,
        name: tableModal.data.name.trim(),
        seats: tableModal.data.seats,
        note: tableModal.data.note || undefined,
      });
    } else if (tableModal.mode === 'bulk') {
      if (!tableModal.data.name.trim()) return;
      await createTablesBulk(
        zoneIdNum,
        tableModal.data.name.trim(),
        tableModal.bulkStart,
        tableModal.bulkCount,
        tableModal.data.seats,
      );
    } else if (tableModal.editId) {
      await updateTable(tableModal.editId, {
        name: tableModal.data.name,
        seats: tableModal.data.seats,
        note: tableModal.data.note || undefined,
        status: tableModal.data.status,
      });
    }
    setTableModal(v => ({ ...v, open: false }));
  };

  const handleDeleteTable = (t: TableItem) => {
    setConfirm({
      open: true,
      message: `Xoá bàn "${t.name}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        await deleteTable(t.id, t.name);
        setConfirm(v => ({ ...v, open: false }));
      },
    });
  };

  const setZoneField = (k: keyof typeof INIT_ZONE, v: string) =>
    setZoneModal(prev => ({ ...prev, data: { ...prev.data, [k]: v } }));

  /* FIX: setTableField — status phải giữ đúng literal type */
  const setTableField = (k: keyof typeof INIT_TABLE, v: string | number) =>
    setTableModal(prev => ({
      ...prev,
      data: { ...prev.data, [k]: v },
    }));

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-96px)] text-gray-400 gap-3">
        <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#3dba74]" />
        <span className="text-[15px]">Đang tải dữ liệu bàn...</span>
      </div>
    );
  }

  return (
    <div
      className="flex bg-[#f4f6f8] overflow-hidden font-['Segoe_UI',sans-serif]"
      style={{ height: 'calc(100vh - 96px)' }}
    >
      {/*
        FIX: ZoneSidebar expects:
          onToggle: (id: string) => void   ← dùng toggleZoneStatus trực tiếp ✓
          onDelete: (id: string) => void   ← dùng handleDeleteZone(id) ✓
          onEdit:   (z: Zone) => void      ← dùng openEditZone(z) ✓
      */}
      <ZoneSidebar
        zones={zones}
        activeZone={activeZone}
        onSelect={setActiveZone}
        onAdd={openAddZone}
        onEdit={openEditZone}
        onToggle={toggleZoneStatus}
        onDelete={handleDeleteZone}
      />

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
              {saving && (
                <FontAwesomeIcon icon={faSpinner} spin className="text-[14px] text-[#3dba74] ml-1" />
              )}
            </h2>
            {currentZone?.note && (
              <span className="text-[12px] text-[#aaa]">{currentZone.note}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#f4f5f7] rounded-lg p-[3px] gap-0.5">
              {(['grid', 'list'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`w-8 h-7 border-none rounded-[6px] cursor-pointer text-[13px] flex items-center justify-center transition-all ${viewMode === mode
                      ? 'bg-white text-[#2a9e5e] shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
                      : 'bg-transparent text-[#aaa]'
                    }`}
                >
                  <FontAwesomeIcon icon={mode === 'grid' ? faTableCells : faList} />
                </button>
              ))}
            </div>

            <button
              onClick={openBulkTable}
              disabled={saving}
              className="flex items-center gap-1.5 h-9 px-3.5 border border-gray-300 bg-white rounded-lg text-[13px] font-semibold text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:border-[#3dba74] hover:text-[#3dba74] hover:bg-[#f0fbf5] disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm hàng loạt
            </button>
            <button
              onClick={openAddTable}
              disabled={saving}
              className="flex items-center gap-1.5 h-9 px-4 border-none bg-[#3dba74] rounded-lg text-[13px] font-bold text-white cursor-pointer transition-all whitespace-nowrap hover:bg-[#31a862] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(61,186,116,0.3)] disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faPlus} /> Thêm phòng/bàn
            </button>
          </div>
        </div>

        {/* Content */}
        {!currentZone || (currentZone.tables ?? []).length === 0 ? (
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
            {(currentZone.tables ?? []).map(t => (
              <TableCard
                key={t.id}
                table={t}
                zoneName={currentZone.name}
                onEdit={() => openEditTable(t)}
                onToggle={() => toggleTableStatus(t.id)}
                onDelete={() => handleDeleteTable(t)}
                onShowQr={() => openQrModal(t)}
              />
            ))}
          </div>
        ) : (
          <TableListView
            tables={currentZone.tables ?? []}
            onEdit={openEditTable}
            onToggle={toggleTableStatus}
            onDelete={(id) => {
              const t = (currentZone.tables ?? []).find(x => x.id === id);
              if (t) handleDeleteTable(t);
            }}
            onShowQr={openQrModal}
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
        </TableModal>
      )}

      {/* ── Table Modal ── */}
      {tableModal.open && (
        <TableModal
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
                  <span className="text-[11.5px] text-[#9ca3af]">
                    Hệ thống sẽ tự thêm số: Bàn 1, Bàn 2...
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số lượng</label>
                    <input
                      className={inputCls} type="number" min={1} max={100}
                      value={tableModal.bulkCount}
                      onChange={e => setTableModal(v => ({ ...v, bulkCount: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Số bắt đầu</label>
                    <input
                      className={inputCls} type="number" min={1}
                      value={tableModal.bulkStart}
                      onChange={e => setTableModal(v => ({ ...v, bulkStart: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-bold text-gray-700">Số ghế mỗi bàn</label>
                  <input
                    className={inputCls} type="number" min={1}
                    value={tableModal.data.seats}
                    onChange={e => setTableField('seats', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[9px] px-3.5 py-[11px] text-[13px] text-[#16a34a] font-medium">
                  Sẽ tạo: <strong>{tableModal.bulkCount}</strong> bàn —{' '}
                  {tableModal.data.name} {tableModal.bulkStart} → {tableModal.data.name}{' '}
                  {tableModal.bulkStart + tableModal.bulkCount - 1}
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
                      className={inputCls} type="number" min={1}
                      value={tableModal.data.seats}
                      onChange={e => setTableField('seats', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-bold text-gray-700">Trạng thái</label>
                    {/* FIX: toggle status — phải cast rõ ràng sang literal type */}
                    <button
                      onClick={() =>
                        setTableModal(prev => ({
                          ...prev,
                          data: {
                            ...prev.data,
                            status: prev.data.status === 'active' ? 'inactive' : 'active',
                          },
                        }))
                      }
                      className={[
                        'flex items-center gap-2 h-10 px-3.5 rounded-[9px] border cursor-pointer text-[13px] font-semibold transition-all font-[inherit]',
                        tableModal.data.status === 'active'
                          ? 'border-[#3dba74] text-[#16a34a] bg-[#f0fdf4]'
                          : 'border-gray-200 text-[#9ca3af] bg-[#f9fafb]',
                      ].join(' ')}
                    >
                      <FontAwesomeIcon
                        icon={tableModal.data.status === 'active' ? faToggleOn : faToggleOff}
                      />
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
        </TableModal>
      )}

      {/* ── Confirm Modal ── */}
      {confirm.open && (
        <TableConfirmModal
          message={confirm.message}
          onCancel={() => setConfirm(v => ({ ...v, open: false }))}
          onConfirm={confirm.onConfirm}
        />
      )}

      {/* ── QR Modal ── */}
      {qrModal.open && (
        <TableQrModal
          tableId={qrModal.tableId}
          tableName={qrModal.tableName}
          zoneName={qrModal.zoneName}
          onClose={closeQrModal}
        />
      )}
    </div>
  );
};

export default Tables;