import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isBattle = location.pathname === '/battle';
  const gold = useGameStore(s => s.gold);
  const { player, logout } = useAuth();

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(15, 10, 5, 0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(201, 168, 76, 0.1)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{
          fontFamily: "'Ma Shan Zheng','KaiTi',cursive", fontSize: '1.6rem', color: '#c9a84c',
          letterSpacing: '0.12em', textDecoration: 'none',
          textShadow: '0 0 20px rgba(201,168,76,0.15)',
        }}>
          三国志
        </Link>

        {!isBattle && (
          <nav style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {[
              { to: '/', label: '首页' },
              { to: '/team-builder', label: '编队' },
              { to: '/encyclopedia', label: '图鉴' },
              { to: '/gacha', label: '招贤' },
              { to: '/match', label: '对战' },
            ].map(item => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}
                  className="nav-link"
                  style={active ? {
                    color: '#e6d06a', background: 'rgba(201,168,76,0.1)',
                    boxShadow: '0 0 8px rgba(201,168,76,0.08)',
                  } : undefined}
                >{item.label}</Link>
              );
            })}

            {player?.isAdmin && (
              <Link to="/gm" className="nav-link"
                style={{ color: 'rgba(196,30,30,0.7)' }}
              >GM</Link>
            )}

            {/* Gold + user */}
            <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="gold-badge">
                <div className="gold-dot" /> {gold}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'rgba(232,220,200,0.4)' }}>{player?.username}</span>
              <button onClick={() => { logout(); navigate('/login'); }}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(232,220,200,0.35)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,220,200,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >退出</button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
