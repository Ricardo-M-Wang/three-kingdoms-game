import { useState, useEffect } from 'react';
import type { BattleGeneral } from '../../../game/types';
import GeneralPortrait from '../shared/GeneralPortrait';
import { useBattleStore } from '../../store';

const ELEMENT_GLOW: Record<string, string> = {
  fire: 'rgba(249,115,22,0.7)',
  water: 'rgba(59,130,246,0.7)',
  lightning: 'rgba(234,179,8,0.8)',
  wind: 'rgba(34,211,238,0.6)',
  physical: 'rgba(224,214,194,0.6)',
  magical: 'rgba(168,85,247,0.7)',
  heal: 'rgba(34,197,94,0.7)',
  buff: 'rgba(212,160,23,0.6)',
  debuff: 'rgba(107,33,168,0.6)',
};

interface Props {
  general: BattleGeneral;
  isActive: boolean;
  animation?: 'idle' | 'attacking' | 'hit' | 'crit' | 'killed' | 'casting' | 'healing' | 'dodge' | 'none';
  floatingText?: string;
  targetSide?: 'player' | 'enemy';
  onClick?: () => void;
}

export default function BattleGeneralSprite({ general, isActive, animation = 'none', floatingText, targetSide, onClick }: Props) {
  const hpPercent = Math.max(0, general.currentHp / general.maxHp * 100);
  const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444';
  const isEnemy = general.side === 'enemy';
  const alive = general.isAlive;
  const [animClass, setAnimClass] = useState('');
  const [floatText, setFloatText] = useState('');
  const [floatStyle, setFloatStyle] = useState<React.CSSProperties>({});
  const [rushClass, setRushClass] = useState('');
  const skillEffect = useBattleStore(s => s.currentSkillEffect);
  const isCasting = skillEffect?.casterId === general.generalId;
  const elementGlow = isCasting ? ELEMENT_GLOW[skillEffect?.element ?? 'physical'] : undefined;

  // 攻击冲锋：攻击方冲向目标方向
  useEffect(() => {
    if (animation === 'attacking' && targetSide) {
      const dir = (isEnemy && targetSide === 'player') ? 'down' :
                  (!isEnemy && targetSide === 'enemy') ? 'up' : null;
      if (dir) {
        setRushClass('animate-rush-center');
        const timer = setTimeout(() => setRushClass(''), 700);
        return () => clearTimeout(timer);
      }
    }
  }, [animation, targetSide, isEnemy]);

  useEffect(() => {
    let anim = '';
    let txt = '';
    let style: React.CSSProperties = {};

    switch (animation) {
      case 'attacking':
        // attacking animation handled by rushClass
        break;
      case 'hit':
        anim = 'animate-hit-impact';
        txt = floatingText ?? '';
        style = { color: '#ef4444', fontSize: '1.3em', fontWeight: 'bold' };
        break;
      case 'crit':
        anim = 'animate-crit-impact';
        txt = floatingText ?? '暴击!';
        style = { color: '#f59e0b', fontWeight: 'bold', fontSize: '1.5em' };
        break;
      case 'killed':
        anim = 'animate-death';
        txt = '击杀!';
        style = { color: '#ef4444', fontWeight: 'bold', fontSize: '1.5em' };
        break;
      case 'casting':
        anim = 'animate-skill-cast';
        break;
      case 'healing':
        anim = 'animate-heal';
        txt = floatingText ?? '';
        style = { color: '#22c55e', fontSize: '1.3em', fontWeight: 'bold' };
        break;
      case 'dodge':
        anim = 'animate-dodge';
        txt = '闪避!';
        style = { color: '#06b6d4', fontSize: '1.3em', fontWeight: 'bold' };
        break;
    }

    setAnimClass(anim);
    if (txt) {
      setFloatText(txt);
      setFloatStyle(style);
      const timer = setTimeout(() => { setFloatText(''); setAnimClass(''); }, 900);
      return () => clearTimeout(timer);
    } else if (anim) {
      const timer = setTimeout(() => setAnimClass(''), 700);
      return () => clearTimeout(timer);
    }
  }, [animation, floatingText]);

  // 冲锋方向
  const rushDirection = isEnemy ? 'down' : 'up';
  const rushY = rushDirection === 'down' ? '50px' : '-50px';

  return (
    <div className="relative">
      {/* 浮动数字/文字 */}
      {floatText && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 text-lg font-black z-20 damage-float whitespace-nowrap drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]"
          style={floatStyle}
        >
          {floatText}
        </div>
      )}

      {/* 施法技能名 */}
      {isCasting && skillEffect && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-bold z-30 whitespace-nowrap animate-fade-in px-2 py-0.5 rounded"
          style={{
            color: elementGlow?.replace('0.7', '1').replace('0.6', '1').replace('0.8', '1').replace('0.5', '1') || '#fff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            border: `1px solid ${elementGlow}`,
          }}
        >
          {skillEffect.skillName}
        </div>
      )}

      <div
        onClick={onClick}
        className={`relative w-36 text-center transition-all duration-300 cursor-pointer
          ${alive && !rushClass ? 'animate-idle-float' : ''}
          ${animClass}
          ${rushClass}
          ${isCasting ? 'animate-general-lunge' : ''}
          ${isActive && !isCasting && !rushClass ? 'scale-105 brightness-110' : ''}
          ${!alive ? 'opacity-30 grayscale animate-none' : ''}
        `}
        style={{
          '--lunge-y': isEnemy ? '-20px' : '20px',
          '--rush-y': rushY,
          filter: isCasting ? `drop-shadow(0 0 15px ${elementGlow}) drop-shadow(0 0 30px ${elementGlow})` : undefined,
        } as React.CSSProperties}
      >
        {/* 施法超大光环 */}
        {isCasting && (
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
            <div
              className="rounded-full animate-aura"
              style={{
                width: '140px', height: '140px',
                boxShadow: `0 0 40px ${elementGlow}, 0 0 80px ${elementGlow}, 0 0 120px ${elementGlow!.replace('0.7', '0.25').replace('0.8', '0.25').replace('0.6', '0.2').replace('0.5', '0.15')}`,
              }}
            />
          </div>
        )}

        {/* 全身体立绘 */}
        <div className="relative z-10">
          <GeneralPortrait
            generalId={general.generalId}
            name={general.name}
            size="xxl"
            showFrame={alive}
            showRank={false}
            fullBody={true}
          />
        </div>

        {/* 名字 + HP */}
        <div className="relative z-10 -mt-2">
          <div className={`text-sm font-bold ${isEnemy ? 'text-[#d46b6b]' : 'text-[#6bc96b]'}`}>
            {general.name}
            {!alive && <span className="text-[10px] ml-1 text-[#ef4444]">阵亡</span>}
          </div>

          {alive && (
            <>
              <div className="w-20 mx-auto bg-transparent rounded-full h-2 mt-0.5 border border-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
                />
              </div>
              <div className="text-[9px] text-[#8b7355]">
                {general.currentHp} / {general.maxHp}
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
            {general.isStunned && <StatusBadge label="震慑" color="#ef4444" />}
            {general.isSilenced && <StatusBadge label="技穷" color="#a855f7" />}
            {general.isDisarmed && <StatusBadge label="缴械" color="#f97316" />}
            {general.hasArmorBreak && <StatusBadge label="破甲" color="#c9a84c" />}
            {general.hasDoubleStrike && <StatusBadge label="连击" color="#22c55e" />}
            {general.hasInsight && <StatusBadge label="会心" color="#eab308" />}
            {general.hasClarity && <StatusBadge label="清醒" color="#06b6d4" />}
            {general.hasPenetrate && <StatusBadge label="穿透" color="#a78bfa" />}
            {general.hasFormationBreak && <StatusBadge label="破阵" color="#f59e0b" />}
            {general.floodStacks > 0 && <StatusBadge label={`洪水${general.floodStacks}`} color="#3b82f6" />}
            {general.fearStacks > 0 && <StatusBadge label={`畏惧${general.fearStacks}`} color="#8b5cf6" />}
            {general.buffs.some(b => b.id === 'burn') && (
              <StatusBadge label={`灼烧${general.buffs.filter(b => b.id === 'burn').reduce((s,b) => s+b.stacks, 0)}`} color="#f97316" />
            )}
          </div>
        </div>

        {/* 当前行动标记 */}
        {isActive && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#c9a84c] rounded-full animate-ping z-30" />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[9px] px-1 py-0.5 rounded"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}
