// 变体 A — 古朴卷轴 (Scroll & Parchment)
// 羊皮纸暖色底、木纹边框、印章按钮、竖排装饰

export default function PreviewA() {
  const navItems = ['首页', '编队', '图鉴', '招贤', '对战'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe3d5 30%, #d4c9b8 60%, #c8bda3 100%)',
      fontFamily: '"Noto Serif SC", "Source Han Serif SC", "KaiTi", serif',
      color: '#3d2b1a',
    }}>
      {/* ── 顶部纸纹纹理 ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.04,
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,115,85,0.5) 2px, rgba(139,115,85,0.5) 4px)`,
      }} />

      {/* ══════════ 顶部导航 ══════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'linear-gradient(180deg, rgba(245,240,232,0.95) 0%, rgba(235,227,213,0.9) 100%)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid #8b7355',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <span style={{ fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 28, color: '#5a3a1a', letterSpacing: 6, textShadow: '1px 1px 0 rgba(139,115,85,0.3)' }}>
            三国志
          </span>

          {/* Nav links */}
          <div style={{ display: 'flex', gap: 4 }}>
            {navItems.map((item, i) => (
              <a key={item} href="#" style={{
                padding: '6px 18px', borderRadius: 3, fontSize: 14, fontWeight: 600,
                color: i === 0 ? '#8b4513' : '#5a4328', textDecoration: 'none',
                background: i === 0 ? 'rgba(139,69,19,0.08)' : 'transparent',
                borderBottom: i === 0 ? '2px solid #8b4513' : '2px solid transparent',
                letterSpacing: 2, transition: 'all 0.2s',
              }}>{item}</a>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px',
              background: 'rgba(139,69,19,0.06)', borderRadius: 4,
              border: '1px solid rgba(139,69,19,0.15)', color: '#8b4513', fontWeight: 700, fontSize: 14,
            }}>● 2,000</div>
            <div style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
              background: 'rgba(139,69,19,0.04)', border: '1px solid rgba(139,69,19,0.12)', color: '#5a4328',
            }}>暗</div>
          </div>
        </div>
      </nav>

      {/* ══════════ 英雄横幅 ══════════ */}
      <section style={{ position: 'relative', padding: '80px 24px 70px', textAlign: 'center', zIndex: 1 }}>
        {/* 卷轴装饰线 */}
        <div style={{ margin: '0 auto 16px', width: 200, height: 2, background: 'linear-gradient(90deg, transparent, #8b7355, transparent)' }} />

        <p style={{ fontSize: 12, letterSpacing: 8, color: '#8b7355', marginBottom: 12, textTransform: 'uppercase' }}>
          · 沉浸式三国策略对战 ·
        </p>

        <h1 style={{
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 64, color: '#3d2b1a',
          letterSpacing: 16, marginBottom: 10, lineHeight: 1.2,
          textShadow: '2px 2px 0 rgba(139,115,85,0.15), 0 4px 12px rgba(0,0,0,0.06)',
        }}>三国志</h1>

        <p style={{ fontSize: 17, color: '#5a4328', letterSpacing: 6, marginBottom: 40 }}>
          运筹帷幄　决胜千里
        </p>

        {/* CTA 按钮 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <button style={{
            padding: '12px 40px', fontSize: 16, fontWeight: 700, letterSpacing: 4, cursor: 'pointer',
            background: 'linear-gradient(180deg, #8b4513 0%, #6b3410 100%)',
            color: '#f5f0e8', border: '2px solid #5a2a0a', borderRadius: 3,
            boxShadow: '0 4px 12px rgba(107,52,16,0.25)',
            fontFamily: '"Ma Shan Zheng","KaiTi",cursive',
          }}>开 始 新 战 斗</button>

          <button style={{
            padding: '12px 40px', fontSize: 16, fontWeight: 700, letterSpacing: 4, cursor: 'pointer',
            background: 'transparent', color: '#8b4513',
            border: '2px solid #8b4513', borderRadius: 3,
            fontFamily: '"Ma Shan Zheng","KaiTi",cursive',
          }}>招 贤 纳 士</button>
        </div>

        <div style={{ margin: '40px auto 0', width: 200, height: 2, background: 'linear-gradient(90deg, transparent, #8b7355, transparent)' }} />
      </section>

      {/* ══════════ 功能入口卡片 ══════════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 64px', position: 'relative', zIndex: 1 }}>
        <div style={{
          textAlign: 'center', marginBottom: 32,
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 24, color: '#5a3a1a', letterSpacing: 8,
        }}>— 游戏特色 —</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { icon: '⚔', t: '编队配将', d: '组建你的三国阵容\n武将战法自由搭配' },
            { icon: '♟', t: '匹配对战', d: '真实玩家实时对决\n五局三胜智勇双全' },
            { icon: '★', t: '招贤纳士', d: '抽取三国名将战法\n扩充你的不世战力' },
            { icon: '☷', t: '武将图鉴', d: '浏览全部武将属性\n研究战术克制关系' },
          ].map(c => (
            <div key={c.t} style={{
              padding: '28px 22px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
              background: 'rgba(245,240,232,0.7)', borderRadius: 6,
              border: '1px solid rgba(139,115,85,0.25)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12), 0 0 20px rgba(139,115,85,0.15)';
                e.currentTarget.style.borderColor = 'rgba(139,69,19,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = 'rgba(139,115,85,0.25)';
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>{c.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#3d2b1a', marginBottom: 8, letterSpacing: 3 }}>{c.t}</h3>
              <p style={{ fontSize: 13, color: '#5a4328', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ 武将展示 ══════════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 56px', position: 'relative', zIndex: 1 }}>
        <div style={{
          textAlign: 'center', marginBottom: 24,
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 24, color: '#5a3a1a', letterSpacing: 8,
        }}>— 名将录 —</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {['曹操', '关羽', '周瑜', '吕布'].map(name => (
            <div key={name} style={{
              width: 120, textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              <div style={{
                width: 120, height: 140, margin: '0 auto 8px', borderRadius: 4,
                background: 'linear-gradient(135deg, rgba(139,115,85,0.15), rgba(139,115,85,0.05))',
                border: '2px solid rgba(139,115,85,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, color: '#8b7355', fontFamily: '"Ma Shan Zheng","KaiTi",cursive',
              }}>{name[0]}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3d2b1a', letterSpacing: 2 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#8b7355', marginTop: 2 }}>★★★★★</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ 底部 ══════════ */}
      <footer style={{
        background: 'linear-gradient(180deg, rgba(200,189,163,0.3), rgba(180,170,145,0.5))',
        borderTop: '1px solid rgba(139,115,85,0.2)', textAlign: 'center',
        padding: '36px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 120, height: 1, background: 'linear-gradient(90deg, transparent, #8b7355, transparent)',
          margin: '0 auto 20px',
        }} />

        {/* Seal stamp */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px 18px', border: '2px solid #8b4513', color: '#8b4513',
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 14, letterSpacing: 6,
          transform: 'rotate(-2deg)', marginBottom: 16,
        }}>三 國 志 略</div>

        <p style={{ fontSize: 11, color: '#8b7355', letterSpacing: 3 }}>
          &copy; 2026 三国志 · 古朴卷轴 · 策略对战
        </p>
      </footer>
    </div>
  );
}
