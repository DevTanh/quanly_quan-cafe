// src/components/employees/Employees.tsx
// Kết nối thực với BE /api/v1/users — không còn dùng employees.json

import React, { useState, useEffect, useCallback } from 'react'
import { usersApi } from '../../api/users.api'
import type { UserRecord, QueryUserParams } from '../../api/users.api'
import type { UserRole } from '../../types'
import EmployeeList from './EmployeeList'

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch ────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async (params?: QueryUserParams) => {
    setLoading(true)
    setError(null)
    try {
      const data = await usersApi.findAll(params)
      setEmployees(data)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Không thể tải danh sách nhân viên.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleSearch = (params: QueryUserParams) => fetchEmployees(params)

  const handleCreate = async (payload: {
    fullName: string; email: string; phone?: string
    password: string; role: UserRole; isActive: boolean
  }): Promise<UserRecord> => {
    const created = await usersApi.create(payload)
    setEmployees(prev => [created, ...prev])
    return created
  }

  const handleUpdate = async (
    id: number,
    payload: { fullName?: string; email?: string; phone?: string; role?: UserRole; isActive?: boolean; password?: string },
  ): Promise<UserRecord> => {
    const updated = await usersApi.update(id, payload)
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e))
    return updated
  }

  const handleToggleActive = async (emp: UserRecord): Promise<void> => {
    const updated = await usersApi.toggleActive(emp)
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e))
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <EmployeeList
      employees={employees}
      loading={loading}
      error={error}
      onSearch={handleSearch}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onToggleActive={handleToggleActive}
      onRetry={() => fetchEmployees()}
    />
  )
}

export default Employees
