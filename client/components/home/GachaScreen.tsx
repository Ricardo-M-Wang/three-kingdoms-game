import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore, GACHA_COST, GACHA_5_COST } from '../../store/gameStore';
import { getGeneralById, allGenerals } from '../../../game/generals';
import { getSkillById } from '../../../game/skills';
import GeneralPortrait from '../shared/GeneralPortrait';
import SkillIcon from '../shared/SkillIcon';
import type { SkillDef } from '../../../game/types/skill';

type DrawResult = {
  type: 'general'; id: string; name: string; isDuplicate: boolean; newAdvancement: number;
} | { type: 'skill'; id: string; name: string } | null;

type AnimPhase = 'idle' | 'pressing' | 'spinning' | 'flash' | 'reveal';

// ---- Web Audio 简易音效 ----
function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [getCtx]);

  const playTone = useCallback(() => play(800, 0.1, 'square', 0.08), [play]);        // 按钮音
  const playSpinStart = useCallback(() => play(300, 0.15, 'sawtooth', 0.06), [play]);
  const playSpinTick = useCallback(() => play(600, 0.05, 'sine', 0.05), [play]);
  const playReveal = useCallback(() => {
    play(523, 0.15, 'sine', 0.12);   // C5
    setTimeout(() => play(659, 0.1, 'sine', 0.1), 80);  // E5
    setTimeout(() => play(784, 0.2, 'sine', 0.12), 160); // G5
  }, [play]);
  const playRareReveal = useCallback(() => {
    play(523, 0.2, 'sine', 0.12);
    setTimeout(() => play(659, 0.15, 'sine', 0.1), 100);
    setTimeout(() => play(784, 0.15, 'sine', 0.1), 200);
    setTimeout(() => play(1047, 0.3, 'sine', 0.15), 300);
  }, [play]);

  return { playTone, playSpinStart, playSpinTick, playReveal, playRareReveal };
}

export default function GachaScreen() {
  const gold = useGameStore(s => s.gold);
  const drawGachaLocal = useGameStore(s => s.drawGachaLocal);
  const drawGachaLocal5 = useGameStore(s => s.drawGachaLocal5);
  const sendGachaResult = useGameStore(s => s.sendGachaResult);
  const ownedGenerals = useGameStore(s => s.ownedGenerals);
  const ownedSkills = useGameStore(s => s.ownedSkills);
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle');
  const [activeButton, setActiveButton] = useState<'single' | 'five' | null>(null);
  const [result, setResult] = useState<DrawResult>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isBatch, setIsBatch] = useState(false);
  const [showGoldFlash, setShowGoldFlash] = useState(false);
  const animatingRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { playTone, playSpinStart, playSpinTick, playReveal, playRareReveal } = useSound();

  // Cleanup
  useEffect(() => {
    return () => {
      // AudioContext cleanup is automatic
    };
  }, []);

  // Auto-dismiss gold flash after 1s
  useEffect(() => {
    if (!showGoldFlash) return;
    const t = setTimeout(() => setShowGoldFlash(false), 1000);
    return () => clearTimeout(t);
  }, [showGoldFlash]);

  const runDrawAnimation = (button: 'single' | 'five', onReveal: () => void) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setActiveButton(button);
    playTone();
    setAnimPhase('pressing');

    setTimeout(() => {
      setAnimPhase('spinning');
      playSpinStart();
    }, 200);

    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      playSpinTick();
      if (tickCount >= 8) clearInterval(tickInterval);
    }, 150);

    setTimeout(() => {
      setAnimPhase('flash');
    }, 1400);

    setTimeout(() => {
      onReveal();
      setAnimPhase('reveal');
    }, 1900);
  };

  const handleDraw = () => {
    if (gold < GACHA_COST || animPhase !== 'idle') return;

    runDrawAnimation('single', () => {
      const res = drawGachaLocal();
      if (res) {
        sendGachaResult(GACHA_COST, [{ type: res.type, id: res.id, isDuplicate: res.type === 'general' ? (res as any).isDuplicate : false }]);
        // 新获得 → 金光
        if (res.type === 'general' && !(res as any).isDuplicate) setShowGoldFlash(true);
        if (res.type === 'skill') setShowGoldFlash(true);
      }
      setResult(res);
      setShowResult(true);
      setIsBatch(false);
      if (res && res.type === 'general') {
        playRareReveal();
      } else {
        playReveal();
      }
    });
  };

  const handleDraw5 = () => {
    if (gold < GACHA_5_COST || animPhase !== 'idle') return;

    runDrawAnimation('five', () => {
      const results = drawGachaLocal5();
      if (results.length > 0) {
        sendGachaResult(GACHA_5_COST, results.map(r => ({
          type: r.type, id: r.id,
          isDuplicate: r.type === 'general' ? (r as any).isDuplicate : false,
        })));
        // 有新获得 → 金光
        if (results.some(r => (r.type === 'general' && !(r as any).isDuplicate) || r.type === 'skill')) {
          setShowGoldFlash(true);
        }
      }
      setBatchResults(results);
      setIsBatch(true);
      setShowResult(true);
      const hasGeneral = results.some(r => r.type === 'general');
      if (hasGeneral) {
        playRareReveal();
      } else {
        playReveal();
      }
    });
  };

  const handleClose = () => {
    setShowResult(false);
    setResult(null);
    setBatchResults([]);
    setIsBatch(false);
    setShowGoldFlash(false);
    setAnimPhase('idle');
    setActiveButton(null);
    animatingRef.current = false;
  };

  const getButtonStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {};
    if (animPhase === 'pressing') {
      base.transform = 'scale(0.92)';
      base.boxShadow = '0 0 60px rgba(201,168,76,0.6), 0 0 120px rgba(201,168,76,0.2)';
    } else if (animPhase === 'spinning') {
      base.transform = 'scale(0.95)';
      base.boxShadow = '0 0 80px rgba(255,215,0,0.8), 0 0 160px rgba(255,215,0,0.3), 0 0 240px rgba(255,215,0,0.1)';
    } else if (animPhase === 'flash') {
      base.transform = 'scale(1.05)';
      base.boxShadow = '0 0 120px rgba(255,255,255,0.9), 0 0 240px rgba(255,215,0,0.5), 0 0 400px rgba(255,200,0,0.3)';
    } else if (gold >= GACHA_COST) {
      base.boxShadow = '0 0 40px rgba(201,168,76,0.3), 0 0 80px rgba(201,168,76,0.1)';
    }
    return base;
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 w-full relative page-bg-gacha" style={{ position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      <div className="w-full max-w-5xl flex flex-col items-center">
      {/* 新获得金光全屏闪光 */}
      {showGoldFlash && (
        <div className="fixed inset-0 pointer-events-none z-50 animate-gold-flash"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.7) 0%, rgba(255,200,0,0.4) 30%, transparent 70%)',
          }} />
      )}

      <h1 className="text-3xl text-[#c9a84c] font-bold mb-2 tracking-[0.15em] title-dynasty">招贤纳士</h1>

      {/* 金币显示 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="glass-card rounded-lg px-5 py-2 flex items-center gap-2">
          <span className="text-[#c9a84c] text-lg opacity-70">●</span>
          <span className="text-[#c9a84c] text-2xl font-bold tracking-wider">{gold}</span>
        </div>
        <span className="text-[#8b7355] text-sm tracking-wider">单抽 {GACHA_COST} 金 | 五连抽 {GACHA_5_COST} 金</span>
      </div>

      {/* 抽卡区域 */}
      <div className="relative mb-4 flex flex-col md:flex-row items-center gap-4 md:gap-8">
        {/* 单抽 */}
        <div className="relative">
          <button
            ref={btnRef}
            onClick={handleDraw}
            disabled={gold < GACHA_COST || animPhase !== 'idle'}
            className={`w-40 h-40 rounded-full text-lg font-bold transition-all duration-200 cursor-pointer tracking-widest relative overflow-hidden
              ${activeButton === 'single'
                ? 'bg-gradient-to-br from-[#fbbf24] to-[#b8860b] text-[#1a0f07] border-2 border-[#fbbf24]'
                : activeButton === 'five'
                  ? 'bg-transparent text-[#8b7355] border border-[#3d2b1a] opacity-50'
                  : gold >= GACHA_COST
                    ? 'btn-dynasty-primary'
                    : 'bg-transparent text-[#8b7355] cursor-not-allowed border border-[#3d2b1a]'
              }`}
            style={activeButton === 'single' ? getButtonStyle() : {}}
          >
          {/* 按钮文字 */}
          <div className="relative z-10 transition-opacity duration-200">
            {activeButton === 'single' ? (
              animPhase === 'spinning' ? (
                <div className="text-xl animate-pulse-glow">✦ 抽取中 ✦</div>
              ) : animPhase === 'flash' ? (
                <div className="text-2xl animate-pulse-glow" style={{ textShadow: '0 0 20px rgba(255,255,255,0.8)' }}>
                  ✦ ✦ ✦
                </div>
              ) : (
                <div className="text-2xl">...</div>
              )
            ) : (
              <>
                <div className="text-3xl mb-1 tracking-[0.3em]"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>招募</div>
                <div className="text-xs opacity-60 tracking-wider">{GACHA_COST} 金币</div>
              </>
            )}
          </div>
        </button>

        </div>

        {/* 5连抽 */}
        <div className="relative">
          <button
            onClick={handleDraw5}
            disabled={gold < GACHA_5_COST || animPhase !== 'idle'}
            className={`w-44 h-44 rounded-full text-lg font-bold transition-all duration-200 cursor-pointer tracking-widest relative overflow-hidden
              ${activeButton === 'five'
                ? 'bg-gradient-to-br from-[#fbbf24] to-[#b8860b] text-[#1a0f07] border-2 border-[#fbbf24]'
                : activeButton === 'single'
                  ? 'bg-transparent text-[#8b7355] border border-[#3d2b1a] opacity-50'
                  : gold >= GACHA_5_COST
                    ? 'bg-gradient-to-br from-[#c9a84c] to-[#9b1d1d] text-[#1a0f07] border-2 border-[#c9a84c] hover:shadow-[0_0_50px_rgba(201,168,76,0.4)]'
                    : 'bg-transparent text-[#8b7355] cursor-not-allowed border border-[#3d2b1a]'
            }`}
            style={activeButton === 'five' ? getButtonStyle() : gold >= GACHA_5_COST ? { boxShadow: '0 0 40px rgba(155,29,29,0.2)' } : {}}
          >
            <div className="relative z-10 transition-opacity duration-200">
              {activeButton === 'five' ? (
                animPhase === 'spinning' ? (
                  <div className="text-xl animate-pulse-glow">✦ 抽取中 ✦</div>
                ) : animPhase === 'flash' ? (
                  <div className="text-2xl animate-pulse-glow" style={{ textShadow: '0 0 20px rgba(255,255,255,0.8)' }}>
                    ✦ ✦ ✦
                  </div>
                ) : (
                  <div className="text-2xl">...</div>
                )
              ) : (
                <>
                  <div className="text-3xl mb-1 tracking-[0.2em]"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>五连招募</div>
                  <div className="text-xs opacity-60 tracking-wider">{GACHA_5_COST} 金币</div>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 抽卡结果弹窗 */}
      {showResult && (result || batchResults.length > 0) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in"
          onClick={handleClose}
        >
          <div className={`dynasty-panel border-2 border-[#c9a84c] rounded-xl p-6 text-center animate-fade-in overflow-y-auto ${isBatch ? 'max-w-2xl w-full max-h-[85vh]' : 'max-w-sm w-full'}`}
            style={{
              boxShadow: '0 0 60px rgba(201,168,76,0.3), 0 0 120px rgba(201,168,76,0.1)',
              animation: 'gacha-reveal 0.5s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[#c9a84c] text-xl mb-4 tracking-wider">
              {isBatch ? `✦ 五连抽结果 ✦` : (result!.type === 'general' ? (result!.type === 'general' && (result as any).isDuplicate ? '获得重复武将' : '✦ 获得新武将 ✦') : '获得战法')}
            </div>

            {isBatch ? (
              <div className="grid grid-cols-5 gap-3 mb-4">
                {batchResults.map((r, i) => (
                  <div key={i} className="bg-transparent border border-white/5 rounded-lg p-3 text-center"
                    style={{ animation: `fade-in 0.3s ease-out ${0.1 * i}s both` }}>
                    {r.type === 'general' ? (
                      <>
                        <GeneralPortrait generalId={r.id} name={r.name} size="md" />
                        <div className="text-[#d4c5a0] text-sm font-bold mt-1.5">{r.name}</div>
                        <div className={`text-xs mt-0.5 ${r.isDuplicate ? 'text-[#c9a84c]' : 'text-[#22c55e]'}`}>
                          {r.isDuplicate ? `进阶 +1` : '新获得'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-center mb-1">
                          <SkillIcon type={(getSkillById(r.id) as SkillDef)?.type ?? 'active'} size="md" />
                        </div>
                        <div className="text-[#d4c5a0] text-sm font-bold">{r.name}</div>
                        <div className="text-[#8b7355] text-xs mt-0.5 leading-snug line-clamp-2">
                          {(getSkillById(r.id) as SkillDef)?.description}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {result!.type === 'general' ? (() => {
                  const genDef = getGeneralById((result as any).id);
                  const innateSkill = genDef?.innateSkillId ? getSkillById(genDef.innateSkillId) : null;
                  return (
                  <div className="mb-4">
                    <div className="animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
                      <GeneralPortrait generalId={(result as any).id} name={(result as any).name} size="xl" />
                    </div>
                    <h3 className="text-[#d4c5a0] text-xl font-bold mt-2"
                      style={{ animation: 'fade-in 0.3s ease-out 0.2s both' }}>
                      {(result as any).name}
                    </h3>
                    {(result as any).isDuplicate ? (
                      <div className="text-[#c9a84c] text-sm mt-1" style={{ animation: 'fade-in 0.3s ease-out 0.3s both' }}>
                        重复获得 → 进阶次数 +1（当前 {(result as any).newAdvancement}/5 阶）
                        {(result as any).newAdvancement >= 5 && <span className="text-[#9b1d1d] ml-1">已满阶！多余转为 50 金币</span>}
                      </div>
                    ) : (
                      <div className="text-[#22c55e] text-sm mt-1" style={{ animation: 'fade-in 0.3s ease-out 0.3s both' }}>
                        首次获得！
                      </div>
                    )}
                    {innateSkill && (
                      <div className="text-left mt-3 bg-transparent border border-white/5 rounded p-3" style={{ animation: 'fade-in 0.3s ease-out 0.35s both' }}>
                        <div className="text-[#c9a84c] text-sm font-bold mb-1">自带战法: {innateSkill.name}</div>
                        <div className="text-[#8b7355] text-sm leading-snug">{innateSkill.description}</div>
                      </div>
                    )}
                  </div>
                ); })() : (() => {
                  const skill = getSkillById((result as any).id);
                  return (
                  <div className="mb-4">
                    <div className="flex justify-center mb-3" style={{ animation: 'fade-in 0.3s ease-out 0.15s both' }}>
                      <SkillIcon type={(skill as SkillDef)?.type ?? 'active'} size="lg" />
                    </div>
                    <h3 className="text-[#d4c5a0] text-xl font-bold" style={{ animation: 'fade-in 0.3s ease-out 0.2s both' }}>
                      {(result as any).name}
                    </h3>
                    <div className="text-left mt-3 bg-transparent border border-white/5 rounded p-3" style={{ animation: 'fade-in 0.3s ease-out 0.3s both' }}>
                      <div className="text-[#8b7355] text-sm leading-snug">{(skill as SkillDef)?.description}</div>
                      {(skill as SkillDef)?.activationRate > 0 && (
                        <div className="text-[#c9a84c] text-sm mt-1.5">发动率: {(skill as SkillDef).activationRate}%</div>
                      )}
                    </div>
                  </div>
                ); })()}
              </>
            )}

            <button
              onClick={handleClose}
              className="px-6 py-2 bg-[#c9a84c] text-[#1f1410] rounded-lg font-bold hover:bg-[#a07d1a] cursor-pointer transition-colors mt-4"
              style={{ animation: 'fade-in 0.3s ease-out 0.4s both' }}
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* 已拥有列表 */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 武将 */}
        <div className="bg-transparent border border-white/5 rounded-lg p-4">
          <h3 className="text-[#c9a84c] text-sm font-bold mb-3 border-b border-[#3d2b1a] pb-2 tracking-wider">
            已拥有武将 ({Object.keys(ownedGenerals).length}/{allGenerals.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.keys(ownedGenerals).length === 0 ? (
              <div className="text-[#5a4328] text-sm text-center py-4">暂无武将，快去抽取吧！</div>
            ) : (
              Object.entries(ownedGenerals).map(([id, adv]) => {
                const gen = getGeneralById(id);
                if (!gen) return null;
                return (
                  <div key={id} className="flex items-center gap-2 bg-transparent rounded p-2 gold-border">
                    <GeneralPortrait generalId={id} name={gen.name} size="sm" showRank={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[#d4c5a0] text-sm font-bold">{gen.name}</div>
                      <div className="text-[#8b7355] text-[10px]">
                        {adv > 0 ? `${'★'.repeat(adv)}${'☆'.repeat(5 - adv)} ${adv}阶` : '未进阶'}
                      </div>
                    </div>
                    <AdvancementStars adv={adv} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 战法 */}
        <div className="bg-transparent border border-white/5 rounded-lg p-4">
          <h3 className="text-[#c9a84c] text-sm font-bold mb-3 border-b border-[#3d2b1a] pb-2 tracking-wider">
            已拥有战法 ({ownedSkills.length})
          </h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {ownedSkills.length === 0 ? (
              <div className="text-[#5a4328] text-sm text-center py-4">暂无战法</div>
            ) : (
              ownedSkills.map(sid => {
                const skill = getSkillById(sid);
                if (!skill) return null;
                return (
                  <div key={sid} className="flex items-center gap-2 bg-transparent rounded p-2 gold-border">
                    <SkillIcon type={skill.type} size="sm" />
                    <span className="text-[#d4c5a0] text-xs">{skill.name}</span>
                    <span className="text-[#8b7355] text-[10px] ml-auto">
                      {skill.type === 'active' ? '主动' : skill.type === 'pursuit' ? '追击' : skill.type === 'command' ? '指挥' : '被动'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function AdvancementStars({ adv }: { adv: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`text-xs ${i <= adv ? 'text-[#c9a84c]' : 'text-[#3d2b1a]'}`}>
          {i <= adv ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}
