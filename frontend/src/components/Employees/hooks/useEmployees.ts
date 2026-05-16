import { useState, useCallback, useEffect } from 'react';
import { usersApi, type UserRecord, type QueryUserParams } from '../../../api/users.api';
import type { UserRole } from '../../../types';

export function useEmployees() {
  const [employees, setEmployees] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (params?: QueryUserParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.findAll(params);
      setEmployees(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Không thể tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createEmployee = async (payload: {
    fullName: string; email: string; phone?: string;
    password: string; role: UserRole; isActive?: boolean;
  }): Promise<UserRecord> => {
    const created = await usersApi.create(payload);
    setEmployees(prev => [created, ...prev]);
    return created;
  };

  const updateEmployee = async (
    id: number,
    payload: { fullName?: string; email?: string; phone?: string; role?: UserRole; isActive?: boolean; password?: string },
  ): Promise<UserRecord> => {
    const updated = await usersApi.update(id, payload);
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    return updated;
  };

  const toggleActive = async (emp: UserRecord): Promise<void> => {
    const updated = await usersApi.toggleActive(emp);
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  return {
    employees,
    loading,
    error,
    search: fetchAll,
    retry: () => fetchAll(),
    createEmployee,
    updateEmployee,
    toggleActive,
  };
}
