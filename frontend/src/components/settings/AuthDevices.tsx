// src/components/settings/AuthDevices.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLaptop, faMobileAlt, faDesktop, faSignOutAlt,
  faSpinner, faSyncAlt, faShieldAlt, faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

/* ── Types ── */

/**
 * FIX: BE trả { id: number, deviceId, deviceName, ipAddress, lastUsedAt, createdAt }
 * (xem auth.service.ts → getDevices())
 * Trước đây FE dùng sessionId: string → gây lỗi khi gọi DELETE /auth/devices/:sessionId
 */
interface DeviceSession {
  id: number;            // FIX: dùng id (number), không phải sessionId (string)
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt: string;
  createdAt: string;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

/* ── Helpers ── */
function guessDevice(ua?: string): 'mobile' | 'laptop' | 'desktop' {
  if (!ua) return 'desktop';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'laptop';
  return 'desktop';
}

function getBrowser(ua?: string): string {
  if (!ua) return 'Không xác định';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edge/i.test(ua)) return 'Edge';
  return 'Trình duyệt khác';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const DEVICE_ICON = {
  mobile: faMobileAlt,
  laptop: faLaptop,
  desktop: faDesktop,
};

/* ══════════════════════════════════════════════════════════════ */
const AuthDevices: React.FC = () => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'my' | 'all'>('my');
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSessions, setUserSessions] = useState<DeviceSession[]>([]);
  const [revoking, setRevoking] = useState<number | null>(null);   // FIX: number id
  const [forcingLogout, setForcingLogout] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUserSessions, setLoadingUserSessions] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  /* ── Fetch my sessions ── */
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/devices');
      // BE trả { message, data: DeviceSession[] }
      const arr: DeviceSession[] = Array.isArray(data)
        ? data
        : (data as any)?.data ?? [];
      setSessions(arr);
    } catch {
      toast.error('Không thể tải danh sách thiết bị');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /* ── Fetch all users (admin tab) ── */
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      const arr: User[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
      setUsers(arr);
    } catch {
      // silently fail — không block UI
    }
  }, []);

  /* ── Fetch sessions của một user cụ thể (admin) ── */
  const fetchUserSessions = useCallback(async (userId: number) => {
    try {
      setLoadingUserSessions(true);
      // FIX: dùng đúng endpoint BE: GET /auth/devices/user/:userId
      const { data } = await api.get(`/auth/devices/user/${userId}`);
      const arr: DeviceSession[] = Array.isArray(data)
        ? data
        : (data as any)?.data ?? [];
      setUserSessions(arr);
    } catch {
      toast.error('Không thể tải phiên của nhân viên này');
      setUserSessions([]);
    } finally {
      setLoadingUserSessions(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions();
    fetchUsers();
  }, [fetchSessions, fetchUsers]);

  useEffect(() => {
    if (selectedUserId !== null) {
      fetchUserSessions(selectedUserId);
    }
  }, [selectedUserId, fetchUserSessions]);

  /* ── Revoke own device ── */
  const revokeDevice = async (sessionId: number) => {
    try {
      setRevoking(sessionId);
      // FIX: sessionId là number → BE endpoint DELETE /auth/devices/:sessionId
      await api.delete(`/auth/devices/${sessionId}`);
      toast.success('Đã đăng xuất thiết bị thành công');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Đăng xuất thiết bị thất bại');
    } finally {
      setRevoking(null);
    }
  };

  /* ── Admin: revoke specific device of a user ── */
  const revokeUserDevice = async (userId: number, sessionId: number, userName: string) => {
    try {
      setRevoking(sessionId);
      // FIX: dùng đúng endpoint BE: DELETE /auth/force-logout/:userId/device/:sessionId
      await api.delete(`/auth/force-logout/${userId}/device/${sessionId}`);
      toast.success(`Đã thu hồi thiết bị của "${userName}"`);
      setUserSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Thu hồi thiết bị thất bại');
    } finally {
      setRevoking(null);
    }
  };

  /* ── Admin: force logout all devices of a user ── */
  const forceLogoutUser = async (userId: number, userName: string) => {
    try {
      setForcingLogout(userId);
      await api.post(`/auth/force-logout/${userId}`);
      toast.success(`Đã đăng xuất tất cả thiết bị của "${userName}"`);
      if (selectedUserId === userId) {
        setUserSessions([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Force logout thất bại');
    } finally {
      setForcingLogout(null);
    }
  };

  const filteredUsers = users.filter(u =>
    !searchUser ||
    u.fullName.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase()),
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="p-5 font-['Segoe_UI',sans-serif] bg-[#f3f4f6] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-800 flex items-center gap-2 m-0">
            <FontAwesomeIcon icon={faShieldAlt} className="text-[#3dba74]" />
            Quản lý thiết bị đăng nhập
          </h1>
          <p className="text-[12.5px] text-gray-400 mt-0.5">
            {loading ? 'Đang tải...' : `${sessions.length} phiên của bạn đang hoạt động`}
          </p>
        </div>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <FontAwesomeIcon icon={faSyncAlt} spin={loading} /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5 bg-white rounded-t-xl px-4">
        {[
          { key: 'my' as const, label: 'Phiên của tôi' },
          { key: 'all' as const, label: 'Tất cả nhân viên' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-3 text-[13.5px] font-medium border-b-2 transition-colors -mb-px',
              tab === t.key
                ? 'border-[#16a34a] text-[#16a34a]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: My Sessions ── */}
      {tab === 'my' && (
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-[#3dba74]" />
              <span className="text-[14px]">Đang tải thiết bị...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center text-gray-400">
              <FontAwesomeIcon icon={faLaptop} className="text-[48px] mb-3 text-gray-200" />
              <p className="text-[14px]">Không có phiên đăng nhập nào đang hoạt động</p>
            </div>
          ) : (
            sessions.map(session => {
              const deviceType = guessDevice(session.userAgent ?? session.deviceName);
              const icon = DEVICE_ICON[deviceType];
              // FIX: dùng session.id thay vì session.sessionId
              const isRevokingThis = revoking === session.id;

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[20px] bg-gray-100 text-gray-500 shrink-0">
                      <FontAwesomeIcon icon={icon} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-gray-800">
                          {session.deviceName ?? getBrowser(session.userAgent)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-gray-400 flex-wrap">
                        {session.ipAddress && (
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faGlobe} className="text-[10px]" />
                            {session.ipAddress}
                          </span>
                        )}
                        <span>Hoạt động: {formatDate(session.lastUsedAt)}</span>
                        <span>Đăng nhập: {formatDate(session.createdAt)}</span>
                      </div>
                      {session.userAgent && (
                        <p className="text-[11px] text-gray-300 mt-0.5 truncate max-w-[400px]">
                          {session.userAgent}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => revokeDevice(session.id)}
                      disabled={!!revoking}
                      className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-[13px] hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isRevokingThis
                        ? <FontAwesomeIcon icon={faSpinner} spin />
                        : <FontAwesomeIcon icon={faSignOutAlt} />}
                      Đăng xuất
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: All Users (Admin) ── */}
      {tab === 'all' && (
        <div className="flex gap-4">
          {/* User list */}
          <div className="w-[300px] shrink-0">
            <input
              className="w-full mb-3 border border-gray-200 rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-[#3dba74]"
              placeholder="Tìm nhân viên..."
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
            />
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors',
                    selectedUserId === user.id
                      ? 'bg-green-50 border-l-2 border-l-[#16a34a]'
                      : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <div className="w-9 h-9 rounded-full bg-[#3dba74] flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-gray-800 m-0 truncate">{user.fullName}</p>
                    <p className="text-[12px] text-gray-400 m-0">{user.role}</p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="flex items-center justify-center py-8 text-gray-300 text-[13px]">
                  Không tìm thấy nhân viên
                </div>
              )}
            </div>
          </div>

          {/* User sessions */}
          <div className="flex-1">
            {selectedUser ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-800 m-0">{selectedUser.fullName}</h3>
                    <p className="text-[12.5px] text-gray-400 m-0">
                      {loadingUserSessions
                        ? 'Đang tải...'
                        : `${userSessions.length} phiên đang hoạt động`}
                    </p>
                  </div>
                  {userSessions.length > 0 && (
                    <button
                      onClick={() => forceLogoutUser(selectedUser.id, selectedUser.fullName)}
                      disabled={!!forcingLogout}
                      className="flex items-center gap-1.5 px-3 py-2 border border-orange-200 text-orange-600 rounded-lg text-[13px] hover:bg-orange-50 transition-colors disabled:opacity-50"
                    >
                      {forcingLogout === selectedUser.id
                        ? <FontAwesomeIcon icon={faSpinner} spin />
                        : <FontAwesomeIcon icon={faSignOutAlt} />}
                      Đăng xuất tất cả
                    </button>
                  )}
                </div>

                {loadingUserSessions ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span className="text-[13px]">Đang tải...</span>
                  </div>
                ) : userSessions.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                    <FontAwesomeIcon icon={faLaptop} className="text-[40px] mb-3 text-gray-200" />
                    <p className="text-[14px]">Không có phiên nào đang hoạt động</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {userSessions.map(session => {
                      const deviceType = guessDevice(session.userAgent ?? session.deviceName);
                      const icon = DEVICE_ICON[deviceType];
                      const isRevokingThis = revoking === session.id;
                      return (
                        <div key={session.id} className="bg-white rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-[18px] shrink-0">
                              <FontAwesomeIcon icon={icon} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13.5px] font-semibold text-gray-800 m-0">
                                {session.deviceName ?? getBrowser(session.userAgent)}
                              </p>
                              <div className="flex items-center gap-3 text-[12px] text-gray-400 flex-wrap mt-0.5">
                                {session.ipAddress && (
                                  <span className="flex items-center gap-1">
                                    <FontAwesomeIcon icon={faGlobe} className="text-[10px]" />
                                    {session.ipAddress}
                                  </span>
                                )}
                                <span>Hoạt động: {formatDate(session.lastUsedAt)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => revokeUserDevice(selectedUser.id, session.id, selectedUser.fullName)}
                              disabled={!!revoking}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[12.5px] hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                            >
                              {isRevokingThis
                                ? <FontAwesomeIcon icon={faSpinner} spin />
                                : <FontAwesomeIcon icon={faSignOutAlt} />}
                              Thu hồi
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center text-gray-300">
                <FontAwesomeIcon icon={faShieldAlt} className="text-[48px] mb-3" />
                <p className="text-[14px] text-gray-400">Chọn nhân viên để xem phiên đăng nhập</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDevices;