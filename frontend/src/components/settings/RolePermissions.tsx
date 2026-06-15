// src/components/settings/RolePermissions.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt, faSpinner, faSyncAlt, faCheck,
  faChevronDown, faChevronRight, faSave,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

/* ── Types ── */
interface Permission {
  id: number;
  action: string;
  subject: string;
  description?: string;
  group?: string;
}

interface RolePermissionEntry {
  role: string;
  permissionId: number;
  granted: boolean;
}

const ROLES = ['admin', 'manager', 'cashier', 'barista', 'staff'] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  cashier: 'Thu ngân',
  barista: 'Pha chế / Bar',
  staff: 'Nhân viên',
};

const ROLE_COLORS: Record<Role, string> = {
  admin:   'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-orange-100 text-orange-700 border-orange-200',
  cashier: 'bg-blue-100 text-blue-700 border-blue-200',
  barista: 'bg-green-100 text-green-700 border-green-200',
  staff:   'bg-gray-100 text-gray-600 border-gray-200',
};

/* ── Group permissions by their prefix (before ':') ── */
function groupPermissions(perms: Permission[]): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const p of perms) {
    const g = p.group ?? p.action.split(':')[0];
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  }
  return groups;
}

const GROUP_LABELS: Record<string, string> = {
  order: 'Đơn hàng', payment: 'Thanh toán', product: 'Sản phẩm',
  table: 'Bàn / Khu vực', shift: 'Ca làm việc', user: 'Nhân viên',
  report: 'Báo cáo', inventory: 'Kho hàng', customer: 'Khách hàng',
  auth: 'Xác thực / Thiết bị', system: 'Hệ thống', permission: 'Phân quyền',
  menu: 'Thực đơn',
};

/* ══════════════════════════════════════════════════════════════ */
const RolePermissions: React.FC = () => {
  const toast = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<RolePermissionEntry[]>([]);
  const [localGrants, setLocalGrants] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeRole, setActiveRole] = useState<Role>('admin');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchPerm, setSearchPerm] = useState('');

  const makeKey = (role: string, permId: number) => `${role}::${permId}`;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [permsRes, rpRes] = await Promise.all([
        api.get<Permission[]>('/permissions'),
        api.get<RolePermissionEntry[]>('/role-permissions'),
      ]);

      const permsArr: Permission[] = Array.isArray(permsRes.data)
        ? permsRes.data
        : (permsRes.data as any)?.data ?? [];
      const rpArr: RolePermissionEntry[] = Array.isArray(rpRes.data)
        ? rpRes.data
        : (rpRes.data as any)?.data ?? [];

      setPermissions(permsArr);
      setRolePerms(rpArr);

      // Build localGrants map
      const grants: Record<string, boolean> = {};
      for (const rp of rpArr) {
        grants[makeKey(rp.role, rp.permissionId)] = rp.granted;
      }
      setLocalGrants(grants);
      setIsDirty(false);

      // Expand all groups by default
      const groups = groupPermissions(permsArr);
      setExpandedGroups(new Set(Object.keys(groups)));
    } catch (err) {
      toast.error('Không thể tải danh sách phân quyền');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePermission = (permId: number) => {
    const key = makeKey(activeRole, permId);
    setLocalGrants(prev => ({ ...prev, [key]: !prev[key] }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Build list of granted permissions for active role
      const grantedIds = permissions
        .filter(p => localGrants[makeKey(activeRole, p.id)])
        .map(p => p.id);

      await api.post('/role-permissions/sync', {
        role: activeRole,
        permissionIds: grantedIds,
      });

      toast.success(`Đã lưu phân quyền cho vai trò "${ROLE_LABELS[activeRole]}"`);
      setIsDirty(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu phân quyền thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleGrantAll = (groupPerms: Permission[]) => {
    const updates: Record<string, boolean> = {};
    for (const p of groupPerms) {
      updates[makeKey(activeRole, p.id)] = true;
    }
    setLocalGrants(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const handleRevokeAll = (groupPerms: Permission[]) => {
    const updates: Record<string, boolean> = {};
    for (const p of groupPerms) {
      updates[makeKey(activeRole, p.id)] = false;
    }
    setLocalGrants(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => {
      const s = new Set(prev);
      if (s.has(g)) s.delete(g); else s.add(g);
      return s;
    });
  };

  const grouped = groupPermissions(permissions);
  const filteredGrouped: Record<string, Permission[]> = {};
  for (const [g, perms] of Object.entries(grouped)) {
    const filtered = searchPerm
      ? perms.filter(p =>
          p.action.toLowerCase().includes(searchPerm.toLowerCase()) ||
          (p.description ?? '').toLowerCase().includes(searchPerm.toLowerCase()),
        )
      : perms;
    if (filtered.length > 0) filteredGrouped[g] = filtered;
  }

  const grantedCount = permissions.filter(p => localGrants[makeKey(activeRole, p.id)]).length;

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-['Segoe_UI',sans-serif]">
      {/* ── Role sidebar ── */}
      <aside className="w-[220px] bg-white border-r border-gray-200 p-4 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faShieldAlt} className="text-[#3dba74] text-[18px]" />
          <h2 className="text-[15px] font-extrabold text-gray-800 m-0">Phân quyền</h2>
        </div>
        <div className="flex flex-col gap-1">
          {ROLES.map(role => {
            const count = permissions.filter(p => localGrants[makeKey(role, p.id)]).length;
            return (
              <button
                key={role}
                onClick={() => { setActiveRole(role); setIsDirty(false); }}
                className={[
                  'w-full text-left px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all border',
                  activeRole === role
                    ? 'bg-[#f0fdf4] border-[#3dba74] text-[#16a34a] font-semibold shadow-sm'
                    : 'border-transparent text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span>{ROLE_LABELS[role]}</span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${ROLE_COLORS[role]}`}>
                    {count}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-normal">{role}</div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 p-5 overflow-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="text-[18px] font-extrabold text-gray-800 m-0 flex items-center gap-2">
              {ROLE_LABELS[activeRole]}
              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[activeRole]}`}>
                {grantedCount} / {permissions.length} quyền
              </span>
            </h1>
            <p className="text-[12.5px] text-gray-400 mt-0.5">
              Cấu hình quyền truy cập cho vai trò <code className="bg-gray-100 px-1 rounded text-[11.5px]">{activeRole}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} /> Làm mới
            </button>
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3dba74] text-white rounded-lg text-[13.5px] font-semibold hover:bg-[#31a862] transition-colors disabled:opacity-50"
              >
                {saving
                  ? <FontAwesomeIcon icon={faSpinner} spin />
                  : <FontAwesomeIcon icon={faSave} />}
                Lưu thay đổi
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <input
          className="w-full max-w-[320px] mb-4 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3dba74] bg-white"
          placeholder="Tìm kiếm quyền..."
          value={searchPerm}
          onChange={e => setSearchPerm(e.target.value)}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#3dba74]" />
            <span className="text-[14px]">Đang tải...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(filteredGrouped).map(([group, perms]) => {
              const isExpanded = expandedGroups.has(group);
              const grantedInGroup = perms.filter(p => localGrants[makeKey(activeRole, p.id)]).length;
              const allGranted = grantedInGroup === perms.length;

              return (
                <div key={group} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Group header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleGroup(group)}
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon
                        icon={isExpanded ? faChevronDown : faChevronRight}
                        className="text-[11px] text-gray-400 w-3"
                      />
                      <span className="text-[14px] font-bold text-gray-700">
                        {GROUP_LABELS[group] ?? group}
                      </span>
                      <span className="text-[11.5px] text-gray-400 font-mono">{group}:*</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={[
                        'text-[12px] font-semibold px-2 py-0.5 rounded-full',
                        allGranted
                          ? 'bg-green-100 text-green-700'
                          : grantedInGroup > 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500',
                      ].join(' ')}>
                        {grantedInGroup}/{perms.length}
                      </span>
                      {/* Grant/Revoke all in group */}
                      <button
                        onClick={e => { e.stopPropagation(); allGranted ? handleRevokeAll(perms) : handleGrantAll(perms); }}
                        className={[
                          'text-[12px] px-2.5 py-1 rounded-md font-medium border transition-colors',
                          allGranted
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50',
                        ].join(' ')}
                      >
                        {allGranted ? 'Thu hồi tất cả' : 'Cấp tất cả'}
                      </button>
                    </div>
                  </div>

                  {/* Permission rows */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {perms.map(perm => {
                        const granted = !!localGrants[makeKey(activeRole, perm.id)];
                        return (
                          <div
                            key={perm.id}
                            className={[
                              'flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0 transition-colors',
                              granted ? 'bg-[#f0fdf4]' : 'hover:bg-gray-50',
                            ].join(' ')}
                          >
                            <div className="flex flex-col gap-0.5">
                              <code className={[
                                'text-[12.5px] font-mono font-semibold',
                                granted ? 'text-[#16a34a]' : 'text-gray-500',
                              ].join(' ')}>
                                {perm.action}
                              </code>
                              {perm.description && (
                                <span className="text-[12px] text-gray-400">{perm.description}</span>
                              )}
                            </div>
                            {/* Toggle switch */}
                            <button
                              onClick={() => togglePermission(perm.id)}
                              className={[
                                'relative w-11 h-6 rounded-full transition-colors border-2 shrink-0',
                                granted
                                  ? 'bg-[#3dba74] border-[#3dba74]'
                                  : 'bg-gray-200 border-gray-200',
                              ].join(' ')}
                            >
                              <span className={[
                                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                                granted ? 'translate-x-[22px]' : 'translate-x-0.5',
                              ].join(' ')} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {Object.keys(filteredGrouped).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300 gap-2">
                <FontAwesomeIcon icon={faShieldAlt} className="text-[48px]" />
                <p className="text-[14px]">Không tìm thấy quyền nào</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default RolePermissions;
