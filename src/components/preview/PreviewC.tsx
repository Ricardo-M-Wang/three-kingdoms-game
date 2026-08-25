// 变体 C — 水墨战意 (Ink & Battle)
// 墨色渐变、朱砂红强调、战纹装饰、红黑强对比

export default function PreviewC() {
  const navItems = ['首页', '编队', '图鉴', '招贤', '对战'];

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse at 60% 10%, rgba(196,30,30,0.04) 0%, transparent 50%),
        radial-gradient(ellipse at 30% 80%, rgba(0,0,0,0.3) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(45,45,45,0.08) 0%, transparent 60%),
        #1a1a1a`,
      fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
      color: '#d4c5a0',
    }}>
      {/* ── 水墨笔触纹理 ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.025,
        background: `
          radial-gradient(ellipse at 30% 40%, #fff 0.1px, transparent 0.1px),
          radial-gradient(ellipse at 70% 60%, #fff 0.15px, transparent 0.15px)`,
        backgroundSize: '200px 200px, 160px 160px',
      }} />

      {/* ══════════ 导航 — 朱砂红底线 ══════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '2px solid rgba(196,30,30,0.6)',
        boxShadow: '0 4px 24px rgba(196,30,30,0.08)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 28, color: '#e8dcc8',
            letterSpacing: 6, textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}>三国志</span>

          <div style={{ display: 'flex', gap: 2 }}>
            {navItems.map((item, i) => (
              <a key={item} href="#" style={{
                padding: '6px 18px', fontSize: 13, fontWeight: 700,
                color: i === 0 ? '#e63929' : 'rgba(212,197,160,0.5)', textDecoration: 'none',
                letterSpacing: 3, transition: 'all 0.2s',
                borderBottom: i === 0 ? '2px solid #e63929' : '2px solid transparent',
              }}>{item}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px',
              background: 'rgba(196,30,30,0.06)', borderRadius: 2,
              border: '1px solid rgba(196,30,30,0.2)', color: '#d4c5a0', fontWeight: 700, fontSize: 14,
            }}>● 2,000</div>
            <div style={{
              padding: '5px 14px', borderRadius: 2, fontSize: 13, cursor: 'pointer',
              background: 'rgba(196,30,30,0.04)', border: '1px solid rgba(196,30,30,0.15)',
              color: 'rgba(212,197,160,0.6)', letterSpacing: 2,
            }}>暗</div>
          </div>
        </div>
      </nav>

      {/* ══════════ 英雄横幅 — 朱砂红强调 ══════════ */}
      <section style={{ position: 'relative', padding: '80px 24px 70px', textAlign: 'center', zIndex: 1 }}>
        {/* 战旗装饰 */}
        <div style={{
          position: 'absolute', top: 40, right: '10%', opacity: 0.03, pointerEvents: 'none',
          fontSize: 200, fontFamily: '"Ma Shan Zheng","KaiTi",cursive', color: '#c41e1e',
        }}>戰</div>

        <p style={{ fontSize: 12, letterSpacing: 10, color: '#c41e1e', marginBottom: 16, fontWeight: 700 }}>
          · WAR OF THE THREE KINGDOMS ·
        </p>

        <h1 style={{
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 76, color: '#e8dcc8',
          letterSpacing: 18, marginBottom: 12, lineHeight: 1.1,
          textShadow: '4px 4px 0 rgba(196,30,30,0.15), 0 4px 24px rgba(0,0,0,0.5)',
        }}>三国志</h1>

        <div style={{
          width: 120, height: 3, margin: '0 auto 20px',
          background: 'linear-gradient(90deg, transparent, #c41e1e, transparent)',
        }} />

        <p style={{ fontSize: 18, color: '#c41e1e', letterSpacing: 8, marginBottom: 40, fontWeight: 600 }}>
          战 略 决 胜 · 问 鼎 天 下
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <button style={{
            padding: '14px 44px', fontSize: 17, fontWeight: 800, letterSpacing: 6, cursor: 'pointer',
            background: '#c41e1e', color: '#fff', border: 'none',
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 12px)',
            boxShadow: '0 8px 24px rgba(196,30,30,0.3), 0 0 16px rgba(196,30,30,0.1)',
            transition: 'all 0.25s',
          }}>开 始 新 战 斗</button>

          <button style={{
            padding: '14px 44px', fontSize: 17, fontWeight: 700, letterSpacing: 6, cursor: 'pointer',
            background: 'transparent', color: '#c41e1e',
            border: '2px solid rgba(196,30,30,0.3)',
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 8px)',
            transition: 'all 0.25s',
          }}>招 贤 纳 士</button>
        </div>
      </section>

      {/* ══════════ 功能卡片 — 微倾斜 + 战纹 ══════════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 56px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 32,
        }}>
          <div style={{ flex: 1, maxWidth: 60, height: 2, background: 'linear-gradient(90deg, transparent, rgba(196,30,30,0.4))' }} />
          <span style={{
            fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 24, color: '#e8dcc8', letterSpacing: 10,
          }}>游 戏 特 色</span>
          <div style={{ flex: 1, maxWidth: 60, height: 2, background: 'linear-gradient(90deg, rgba(196,30,30,0.4), transparent)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { icon: '⚔', t: '编队配将', d: '组建你的三国阵容\n武将战法自由搭配', rot: '0.4deg' },
            { icon: '♟', t: '匹配对战', d: '真实玩家实时对决\n五局三胜智勇双全', rot: '-0.3deg' },
            { icon: '★', t: '招贤纳士', d: '抽取三国名将战法\n扩充你的不世战力', rot: '0.5deg' },
            { icon: '☷', t: '武将图鉴', d: '浏览全部武将属性\n研究战术克制关系', rot: '-0.4deg' },
          ].map(c => (
            <div key={c.t} style={{
              padding: '28px 22px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
              background: 'rgba(26,26,26,0.7)', borderRadius: 0,
              border: '1px solid rgba(196,30,30,0.12)',
              boxShadow: '6px 6px 0 rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.4)',
              transform: `rotate(${c.rot})`, position: 'relative',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'rotate(0deg) translateY(-6px)';
                e.currentTarget.style.borderColor = 'rgba(196,30,30,0.35)';
                e.currentTarget.style.boxShadow = '8px 8px 0 rgba(0,0,0,0.4), 0 16px 48px rgba(0,0,0,0.5), 0 0 28px rgba(196,30,30,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = `rotate(${c.rot})`;
                e.currentTarget.style.borderColor = 'rgba(196,30,30,0.12)';
                e.currentTarget.style.boxShadow = '6px 6px 0 rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.4)';
              }}
            >
              {/* 红角标 */}
              <div style={{
                position: 'absolute', bottom: 10, right: 14, width: 18, height: 3,
                background: 'rgba(196,30,30,0.5)',
              }} />

              <div style={{
                width: 52, height: 52, margin: '0 auto 12px',
                background: 'rgba(196,30,30,0.06)', border: '1.5px solid rgba(196,30,30,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#c41e1e',
              }}>{c.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#e8dcc8', marginBottom: 8, letterSpacing: 4 }}>{c.t}</h3>
              <p style={{ fontSize: 13, color: 'rgba(212,197,160,0.5)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ 武将展示 ══════════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 48px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 28,
        }}>
          <div style={{ flex: 1, maxWidth: 60, height: 2, background: 'linear-gradient(90deg, transparent, rgba(196,30,30,0.4))' }} />
          <span style={{
            fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 24, color: '#e8dcc8', letterSpacing: 10,
          }}>名 将 录</span>
          <div style={{ flex: 1, maxWidth: 60, height: 2, background: 'linear-gradient(90deg, rgba(196,30,30,0.4), transparent)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
          {['曹操', '关羽', '周瑜', '吕布'].map(name => (
            <div key={name} style={{
              width: 120, textAlign: 'center', cursor: 'pointer', transition: 'all 0.25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              <div style={{
                width: 120, height: 140, margin: '0 auto 8px',
                background: 'linear-gradient(135deg, rgba(196,30,30,0.06), rgba(0,0,0,0.2))',
                border: '2px solid rgba(196,30,30,0.15)',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, fontFamily: '"Ma Shan Zheng","KaiTi",cursive', color: '#c41e1e', opacity: 0.6,
              }}>{name[0]}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e8dcc8', letterSpacing: 2 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#c41e1e', marginTop: 2 }}>★★★★★</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ 底部 ══════════ */}
      <footer style={{
        background: 'linear-gradient(180deg, rgba(10,10,10,0.6), rgba(10,10,10,0.9))',
        borderTop: '2px solid rgba(196,30,30,0.2)', textAlign: 'center',
        padding: '36px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 140, height: 2, margin: '0 auto 20px',
          background: 'linear-gradient(90deg, transparent, #c41e1e, transparent)',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px 20px', border: '2px solid #c41e1e', color: '#c41e1e',
          fontFamily: '"Ma Shan Zheng","KaiTi",cursive', fontSize: 14, letterSpacing: 8,
          clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 6px)',
          marginBottom: 18,
        }}>三 國 志 略</div>

        <p style={{ fontSize: 11, color: 'rgba(196,30,30,0.35)', letterSpacing: 4 }}>
          &copy; 2026 三国志 · 水墨战意 · 策略对战
        </p>
      </footer>
    </div>
  );
}
