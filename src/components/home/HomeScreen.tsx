import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store';
import HoverDetail from '../shared/HoverDetail';
import GeneralPortrait from '../shared/GeneralPortrait';

const features = [
  { icon: '⚔', label: '编队配将', desc: '组建三国阵容，武将战法自由搭配', color: '#c9a84c', path: '/team-builder' },
  { icon: '♟', label: '匹配对战', desc: '真实玩家实时对决，五局三胜智勇称霸', color: '#c41e1e', path: '/match' },
  { icon: '★', label: '招贤纳士', desc: '抽取三国名将与绝世战法，扩充战力', color: '#5a8a6a', path: '/gacha' },
  { icon: '☷', label: '武将图鉴', desc: '浏览全部武将属性，研究战术克制关系', color: '#7eb8da', path: '/encyclopedia' },
];

const showcaseGenerals = [
  { id: 'caocao', name: '曹操', title: '乱世枭雄' },
  { id: 'guanyu', name: '关羽', title: '武圣' },
  { id: 'zhouyu', name: '周瑜', title: '美周郎' },
  { id: 'lvbu', name: '吕布', title: '飞将' },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const gold = useGameStore(s => s.gold);

  return (
    <div className="flex-1 flex flex-col" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* ── 背景图 ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'url(/bg-login-1.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
        filter: 'brightness(0.25) saturate(0.6)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 60%, rgba(0,0,0,0.3) 0%, transparent 50%),
          rgba(0,0,0,0.25)
        `,
      }} />

      {/* ══════════ 主区域 ══════════ */}
      <main className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
        {/* ── 英雄横幅 ── */}
        <section className="text-center" style={{ padding: '72px 24px 56px' }}>
          <p className="hero-subtitle" style={{ marginBottom: 14 }}>· SAN GOKU STRATEGY ·</p>
          <h1 className="hero-title" style={{ marginBottom: 10 }}>三国志</h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em', marginBottom: 36 }}>
            运筹帷幄之中 · 决胜千里之外
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/team-builder')}>
              <span style={{ fontSize: '1.2rem' }}>⚔</span> 开始新战斗
            </button>
            <button className="btn-battle" onClick={() => navigate('/match')}>
              <span style={{ fontSize: '1.2rem' }}>♟</span> 匹配对战
            </button>
            <button className="btn-secondary" onClick={() => navigate('/gacha')}>
              <span style={{ fontSize: '1.2rem' }}>★</span> 招贤纳士
            </button>
          </div>
        </section>

        {/* ── 功能入口卡片 ── */}
        <section style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px 48px' }}>
          <div className="section-header">
            <h2 className="section-title">游 戏 特 色</h2>
            <div className="section-divider" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {features.map(f => (
              <HoverDetail key={f.label} type="button" label={f.label}>
                <div className="glass-card" style={{ padding: '28px 22px', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => navigate(f.path)}>
                  <div className="feature-icon-box" style={{ margin: '0 auto 14px', background: `${f.color}10`, border: `1.5px solid ${f.color}22`, color: f.color }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e8dcc8', marginBottom: 6, letterSpacing: '0.06em' }}>{f.label}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(232,220,200,0.45)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </HoverDetail>
            ))}
          </div>
        </section>

        {/* ── 武将展示 ── */}
        <section style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px 56px' }}>
          <div className="section-header">
            <h2 className="section-title">名 将 录</h2>
            <div className="section-divider" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            {showcaseGenerals.map(g => (
              <HoverDetail key={g.id} type="general" id={g.id}>
                <div className="gen-card" onClick={() => navigate('/encyclopedia')}>
                  <div className="gen-card-frame">
                    <GeneralPortrait generalId={g.id} name={g.name} size="lg" showFrame={false} showRank={false} />
                  </div>
                  <div className="gen-card-name">{g.name}</div>
                  <div className="gen-card-title">{g.title}</div>
                </div>
              </HoverDetail>
            ))}
          </div>
        </section>
      </main>

      {/* ══════════ 底部 ══════════ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(201,168,76,0.08)',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <div className="section-divider" style={{ marginBottom: 20 }} />
        <div className="gold-badge" style={{ marginBottom: 16 }}>
          <div className="gold-dot" /> {gold.toLocaleString()} 金币
        </div>
        <p style={{ fontSize: '0.7rem', color: 'rgba(232,220,200,0.2)', letterSpacing: '0.15em' }}>
          &copy; 2026 三国志 · 策略对战
        </p>
      </footer>
    </div>
  );
}
