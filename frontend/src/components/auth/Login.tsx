// src/components/auth/Login.tsx
// ── Thay thế UI cũ, GIỮ NGUYÊN props interface { navColor } ──
// ── Dùng useAuth() từ AuthContext như cũ ──

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  navColor?: string;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" width={16} height={16} stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" width={16} height={16} stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

const Login: React.FC<Props> = () => {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focused, setFocused]   = useState<'email' | 'password' | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message;
      if (msg === 'Invalid email or password') setError('Email hoặc mật khẩu không đúng');
      else if (msg === 'Account is not active') setError('Tài khoản đã bị khóa. Liên hệ quản trị viên');
      else setError('Đăng nhập thất bại. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: 'email' | 'password'): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    paddingRight: field === 'password' ? 44 : 16,
    fontSize: 14,
    color: '#e7e5e4',
    background: focused === field ? 'rgba(217,119,6,0.06)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${focused === field ? 'rgba(217,119,6,0.5)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 12,
    outline: 'none',
    boxShadow: focused === field ? '0 0 0 3px rgba(217,119,6,0.08)' : 'none',
    transition: 'all 0.25s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes steam {
          0%,100% { transform: scaleX(1) translateY(0); opacity:0.5; }
          50% { transform: scaleX(1.6) translateY(-10px); opacity:0.15; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .qc-fade1 { animation: fadeUp 0.55s 0.00s ease both; }
        .qc-fade2 { animation: fadeUp 0.55s 0.08s ease both; }
        .qc-fade3 { animation: fadeUp 0.55s 0.16s ease both; }
        .qc-fade4 { animation: fadeUp 0.55s 0.24s ease both; }
        .qc-fade5 { animation: fadeUp 0.55s 0.32s ease both; }

        .qc-btn:not(:disabled):hover { filter: brightness(1.08); }
        .qc-btn:not(:disabled):active { transform: scale(0.98); }

        input::placeholder { color: #57534e; }
      `}</style>

      {/* Full screen */}
      <div style={{
        minHeight: '100vh', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 60% 40%, #1c1208 0%, #0c0a09 60%, #080605 100%)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Glow */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, #d97706, transparent 70%)',
          filter: 'blur(70px)', opacity: 0.09, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, #92400e, transparent 70%)',
          filter: 'blur(80px)', opacity: 0.07, pointerEvents: 'none',
        }} />

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 360, padding: '0 20px', position: 'relative', zIndex: 1 }}>

          {/* Top line */}
          <div className="qc-fade1" style={{
            height: 1, marginBottom: 40,
            background: 'linear-gradient(90deg, transparent, #d97706 30%, #f59e0b 50%, #d97706 70%, transparent)',
          }} />

          {/* Logo */}
          <div className="qc-fade2" style={{ textAlign: 'center', marginBottom: 36 }}>
            {/* Coffee cup icon */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              {/* Steam */}
              <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 2, height: 16, borderRadius: 4,
                    background: 'rgba(251,191,36,0.5)',
                    animation: `steam 2s ${i * 0.35}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
              {/* Icon box */}
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg,#1c1208,#2d1a08)',
                border: '1px solid rgba(217,119,6,0.25)',
                boxShadow: '0 0 28px rgba(217,119,6,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                <svg viewBox="0 0 24 24" fill="none" width={28} height={28}
                  stroke="#f59e0b" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M6 2c0 0 .5 1.5 0 3M10 2c0 0 .5 1.5 0 3M8 2c0 0 .5 1.5 0 3" />
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 8h14v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 10h1a3 3 0 010 6h-1" />
                </svg>
              </div>
            </div>

            <p style={{ color: '#e7e5e4', fontSize: 12, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 4 }}>
              Quan Cafe
            </p>
            <p style={{ color: '#57534e', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Management System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="qc-fade3" style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#78716c', fontSize: 11,
                fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="name@quancafe.vn"
                required
                style={inputStyle('email')}
              />
            </div>

            {/* Password */}
            <div className="qc-fade4" style={{ marginBottom: 6 }}>
              <label style={{ display: 'block', color: '#78716c', fontSize: 11,
                fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  style={inputStyle('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: showPass ? '#f59e0b' : '#57534e', padding: 2,
                    display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                  }}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10, marginBottom: 14, marginTop: 10,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="qc-fade5" style={{ marginTop: 20 }}>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="qc-btn"
                style={{
                  width: '100%', padding: '13px 0',
                  fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading
                    ? 'rgba(217,119,6,0.5)'
                    : 'linear-gradient(135deg,#d97706,#b45309)',
                  border: 'none', borderRadius: 12,
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(217,119,6,0.28)',
                  transition: 'all 0.25s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                  opacity: (!email || !password) ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                      style={{ animation: 'spin 0.8s linear infinite' }}>
                      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang đăng nhập...
                  </>
                ) : 'Đăng nhập'}
              </button>
            </div>
          </form>

          {/* Bottom */}
          <div style={{
            marginTop: 32, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.15) 50%, transparent)',
          }} />
          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#44403c', letterSpacing: '0.08em' }}>
            © 2026 QuanCafe · Hệ thống quản lý nội bộ
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;