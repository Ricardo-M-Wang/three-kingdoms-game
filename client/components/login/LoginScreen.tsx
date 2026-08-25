import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    const err = tab === 'login'
      ? await login(username.trim(), password)
      : await register(username.trim(), password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* ── 背景图 + 暗色遮罩 ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'url(/bg-login-1.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'brightness(0.35) saturate(0.7)',
        transform: 'scale(1.05)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.08) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 20%, rgba(0,0,0,0.4) 0%, transparent 50%),
          rgba(0,0,0,0.3)
        `,
      }} />

      {/* ── 登录卡片 ── */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 16px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "'Ma Shan Zheng','KaiTi',cursive", fontSize: '2.5rem',
            color: '#c9a84c', letterSpacing: '0.15em', marginBottom: 4,
            textShadow: '0 0 24px rgba(201,168,76,0.2)',
          }}>三国志</h1>
          <p style={{ fontSize: '0.75rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.2em' }}>
            回合制策略对战
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(20, 14, 8, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 16, padding: 32,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(201,168,76,0.06)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            <button
              onClick={() => { setTab('login'); setError(''); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700,
                letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.25s',
                background: tab === 'login' ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: tab === 'login' ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                color: tab === 'login' ? '#e6d06a' : 'rgba(232,220,200,0.35)',
              }}
            >登录</button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700,
                letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.25s',
                background: tab === 'register' ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: tab === 'register' ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                color: tab === 'register' ? '#e6d06a' : 'rgba(232,220,200,0.35)',
              }}
            >注册</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(232,220,200,0.35)', marginBottom: 6, letterSpacing: '0.06em' }}>
                用户名
              </label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名" maxLength={50} autoFocus
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: '0.95rem',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.12)',
                  color: '#e8dcc8', outline: 'none', transition: 'all 0.25s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.05)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(201,168,76,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(232,220,200,0.35)', marginBottom: 6, letterSpacing: '0.06em' }}>
                密码
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: '0.95rem',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.12)',
                  color: '#e8dcc8', outline: 'none', transition: 'all 0.25s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.05)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(201,168,76,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 20, padding: '10px 16px', borderRadius: 10, fontSize: '0.8rem', textAlign: 'center',
                background: 'rgba(196,30,30,0.08)', border: '1px solid rgba(196,30,30,0.15)', color: '#ef4444',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}
            >
              {loading ? '处理中...' : tab === 'login' ? '登 录' : '注 册'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
