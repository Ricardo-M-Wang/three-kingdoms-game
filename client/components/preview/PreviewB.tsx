// 变体 B — 宫廷华彩 (Palace Splendor)
// 深墨金辉底、全玻璃拟态、金色主导、多层光晕

export default function PreviewB() {
  const navItems = ['首页', '编队', '图鉴', '招贤', '对战'];

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse at 30% 10%, rgba(201,168,76,0.04) 0%, transparent 60%),
        radial-gradient(ellipse at 70% 60%, rgba(90,138,106,0.03) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 90%, rgba(0,0,0,0.3) 0%, transparent 40%),
        #1a1a1a`,
      fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
      color: '#e8dcc8',
    }}>
      {/* ── 金色粒子纹理 ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.03,
        background: `radial-gradient(circle at 20% 30%, #c9a84c 0.5px, transparent 0.5px),
                     radial-gradient(circle at 60% 70%, #c9a84c 0.8px, transparent 0.8px),
                     radial-gradient(circle at 80% 20%, #c9a84c 0.4px, transparent 0.4px)`,
        backgroundSize: '120px 120px, 180px 180px, 100px 100px',
      }} />

      {/* ══════════ 导航 ══════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 0 1px rgba(201,168,76,0.1)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 28, color: '#c9a84c',
            letterSpacing: 8, textShadow: '0 0 20px rgba(201,168,76,0.3)',
          }}>三国志</span>

          <div style={{ display: 'flex', gap: 2 }}>
            {navItems.map((item, i) => (
              <a key={item} href="#" style={{
                padding: '6px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                color: i === 0 ? '#e6d06a' : 'rgba(232,220,200,0.5)', textDecoration: 'none',
                background: i === 0 ? 'rgba(201,168,76,0.1)' : 'transparent',
                letterSpacing: 3, transition: 'all 0.25s',
              }}>{item}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px',
              background: 'rgba(201,168,76,0.08)', borderRadius: 20,
              border: '1px solid rgba(201,168,76,0.2)', color: '#e6d06a', fontWeight: 700, fontSize: 14,
            }}>● 2,000</div>
            <div style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', transition: 'all 0.25s',
              background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)',
              color: '#c9a84c', letterSpacing: 2,
            }}>暗</div>
          </div>
        </div>
      </nav>

      {/* ══════════ 英雄横幅 ══════════ */}
      <section style={{ position: 'relative', padding: '90px 24px 80px', textAlign: 'center', zIndex: 1 }}>
        {/* 装饰光环 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <p style={{ fontSize: 12, letterSpacing: 10, color: 'rgba(201,168,76,0.5)', marginBottom: 16 }}>
          · SANGOKU STRATEGY ·
        </p>

        <h1 style={{
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 80, color: '#e8dcc8',
          letterSpacing: 20, marginBottom: 12, lineHeight: 1.1,
          textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.15)',
        }}>三国志</h1>

        <p style={{ fontSize: 18, color: 'rgba(201,168,76,0.7)', letterSpacing: 8, marginBottom: 45 }}>
          运筹帷幄之中 · 决胜千里之外
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <button style={{
            padding: '14px 44px', fontSize: 17, fontWeight: 700, letterSpacing: 6, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.35))',
            color: '#e6d06a', border: '1.5px solid rgba(201,168,76,0.4)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 24px rgba(201,168,76,0.15)',
            transition: 'all 0.3s',
          }}>开 始 新 战 斗</button>

          <button style={{
            padding: '14px 44px', fontSize: 17, fontWeight: 700, letterSpacing: 6, cursor: 'pointer',
            background: 'transparent', color: '#c9a84c',
            border: '1.5px solid rgba(201,168,76,0.25)', borderRadius: 10,
            transition: 'all 0.3s',
          }}>招 贤 纳 士</button>
        </div>
      </section>

      {/* ══════════ 玻璃拟态卡片 ══════════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 64px', position: 'relative', zIndex: 1 }}>
        <div style={{
          textAlign: 'center', marginBottom: 36,
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 28, color: '#c9a84c',
          letterSpacing: 12, textShadow: '0 0 20px rgba(201,168,76,0.2)',
        }}>游 戏 特 色</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          {[
            { icon: '⚔', t: '编队配将', d: '组建你的三国阵容\n武将战法自由搭配', c: '#c9a84c' },
            { icon: '♟', t: '匹配对战', d: '真实玩家实时对决\n五局三胜智勇双全', c: '#c41e1e' },
            { icon: '★', t: '招贤纳士', d: '抽取三国名将战法\n扩充你的不世战力', c: '#5a8a6a' },
            { icon: '☷', t: '武将图鉴', d: '浏览全部武将属性\n研究战术克制关系', c: '#7eb8da' },
          ].map(c => (
            <div key={c.t} style={{
              padding: '30px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
              background: 'rgba(26,26,26,0.55)', borderRadius: 16,
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(201,168,76,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.45), 0 0 36px rgba(201,168,76,0.2)';
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)';
              }}
            >
              <div style={{
                width: 56, height: 56, margin: '0 auto 12px', borderRadius: 14,
                background: `${c.c}15`, border: `1.5px solid ${c.c}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: c.c,
              }}>{c.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e8dcc8', marginBottom: 8, letterSpacing: 4 }}>{c.t}</h3>
              <p style={{ fontSize: 13, color: 'rgba(232,220,200,0.55)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ 武将展示 ══════════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 56px', position: 'relative', zIndex: 1 }}>
        <div style={{
          textAlign: 'center', marginBottom: 28,
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 28, color: '#c9a84c',
          letterSpacing: 12, textShadow: '0 0 20px rgba(201,168,76,0.2)',
        }}>名 将 录</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
          {[
            { name: '曹操', title: '乱世枭雄' },
            { name: '关羽', title: '武圣' },
            { name: '周瑜', title: '美周郎' },
            { name: '吕布', title: '飞将' },
          ].map(g => (
            <div key={g.name} style={{
              width: 130, textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              <div style={{
                width: 130, height: 155, margin: '0 auto 10px', borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.03))',
                border: '1.5px solid rgba(201,168,76,0.2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(201,168,76,0.06)',
              }}>
                {/* 顶部金线 */}
                <div style={{
                  position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
                }} />
                <span style={{ fontSize: 48, color: '#c9a84c', fontFamily: '"Ma Shan Zheng","KaiTi",cursive', opacity: 0.6 }}>
                  {g.name[0]}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.4)', letterSpacing: 2 }}>{g.title}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#e8dcc8', letterSpacing: 3 }}>{g.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ 底部 ══════════ */}
      <footer style={{
        background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(201,168,76,0.1)', textAlign: 'center',
        padding: '40px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 160, height: 1, margin: '0 auto 20px',
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), #c9a84c, rgba(201,168,76,0.3), transparent)',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px 20px', border: '2px solid rgba(201,168,76,0.4)', color: '#c9a84c',
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 14, letterSpacing: 8,
          transform: 'rotate(-2deg)', marginBottom: 18, borderRadius: 4,
        }}>三 國 志 略</div>

        <p style={{ fontSize: 11, color: 'rgba(232,220,200,0.25)', letterSpacing: 4 }}>
          &copy; 2026 三国志 · 宫廷华彩 · 策略对战
        </p>
      </footer>
    </div>
  );
}
