import { useState, useCallback, useEffect } from 'react';
import { tablesApi } from '../../../api/tables.api';
import type { Zone, TableItem, CreateZoneDto, UpdateZoneDto, CreateTableDto, UpdateTableDto } from '../../../api/tables.api';
import { useToast } from '../../../context/ToastContext';

export function useTables() {
  const toast = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeZone, setActiveZone] = useState<string>('');

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tablesApi.getZonesWithTables();
      setZones(data);
      if (data.length > 0 && !activeZone) {
        setActiveZone(data[0].id);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách khu vực. Vui lòng thử lại.');
      console.error('fetchZones error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeZone]);

  useEffect(() => {
    fetchZones();
  }, []);

  /* ── Zone operations ── */
  const createZone = async (dto: CreateZoneDto): Promise<Zone | null> => {
    try {
      setSaving(true);
      const newZone = await tablesApi.createZone(dto);
      await fetchZones();
      setActiveZone(newZone.id);
      toast.success(`Đã tạo khu vực "${newZone.name}"`);
      return newZone;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo khu vực thất bại');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateZone = async (id: string, dto: UpdateZoneDto): Promise<boolean> => {
    try {
      setSaving(true);
      await tablesApi.updateZone(id, dto);
      await fetchZones();
      toast.success('Đã cập nhật khu vực');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật khu vực thất bại');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteZone = async (id: string, zoneName: string): Promise<boolean> => {
    try {
      setSaving(true);
      await tablesApi.deleteZone(id);
      const remaining = zones.filter(z => z.id !== id);
      setZones(remaining);
      if (activeZone === id) {
        setActiveZone(remaining[0]?.id ?? '');
      }
      toast.success(`Đã xóa khu vực "${zoneName}"`);
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa khu vực thất bại');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleZoneStatus = async (id: string): Promise<void> => {
    const zone = zones.find(z => z.id === id);
    if (!zone) return;
    const newStatus = zone.status === 'active' ? 'inactive' : 'active';
    await updateZone(id, { status: newStatus });
  };

  /* ── Table operations ── */
  const createTable = async (dto: CreateTableDto): Promise<TableItem | null> => {
    try {
      setSaving(true);
      const newTable = await tablesApi.createTable(dto);
      await fetchZones();
      toast.success(`Đã tạo bàn "${newTable.name}"`);
      return newTable;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo bàn thất bại');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createTablesBulk = async (
    zoneId: number,
    prefix: string,
    startIndex: number,
    count: number,
    seats: number,
  ): Promise<boolean> => {
    try {
      setSaving(true);
      await tablesApi.createTablesBulk(zoneId, prefix, startIndex, count, seats);
      await fetchZones();
      toast.success(`Đã tạo ${count} bàn thành công`);
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo bàn hàng loạt thất bại');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateTable = async (id: string, dto: UpdateTableDto): Promise<boolean> => {
    try {
      setSaving(true);
      await tablesApi.updateTable(id, dto);
      await fetchZones();
      toast.success('Đã cập nhật bàn');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật bàn thất bại');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleTableStatus = async (id: string): Promise<void> => {
    const zone = zones.find(z => z.tables?.some(t => t.id === id));
    const table = zone?.tables?.find(t => t.id === id);
    if (!table) return;
    const newStatus = table.status === 'active' ? 'inactive' : 'active';
    try {
      setSaving(true);
      await tablesApi.updateTableStatus(id, newStatus);
      await fetchZones();
      toast.success(`Đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} bàn`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái bàn thất bại');
    } finally {
      setSaving(false);
    }
  };

  const deleteTable = async (id: string, tableName: string): Promise<boolean> => {
    try {
      setSaving(true);
      await tablesApi.deleteTable(id);
      await fetchZones();
      toast.success(`Đã xóa bàn "${tableName}"`);
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa bàn thất bại');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const currentZone = zones.find(z => z.id === activeZone);

  return {
    zones, loading, saving, activeZone, setActiveZone, currentZone,
    fetchZones,
    createZone, updateZone, deleteZone, toggleZoneStatus,
    createTable, createTablesBulk, updateTable, toggleTableStatus, deleteTable,
  };
}
