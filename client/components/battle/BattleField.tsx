import { useMemo } from 'react';
import type { BattleState } from '../../../game/types';
import { useBattleStore } from '../../store';
import type { AnimationState } from '../../store/battleStore';
import BattleGeneralSprite from './BattleGeneralSprite';

interface Props {
  state: BattleState;
  onGeneralClick: (key: string) => void;
}

export default function BattleField({ state, onGeneralClick }: Props) {
  const enemyGenerals = state.enemyTeam.generals;
  const playerGenerals = state.playerTeam.generals;
  const currentActor = state.phase === 'turn_processing' && state.turnOrder[state.currentTurnIndex];
  const animations = useBattleStore(s => s.animations);

  function getAnimation(generalId: string): AnimationState | undefined {
    return animations.find(a => a.generalId === generalId);
  }

  // 找出所有正在发生的碰撞对（用于画碰撞特效）
  const collisions = useMemo(() => {
    const pairs: { sourceId: string; targetId: string }[] = [];
    for (const a of animations) {
      if ((a.animation === 'attacking' || a.animation === 'crit') && a.targetId) {
        pairs.push({ sourceId: a.generalId, targetId: a.targetId });
      }
    }
    return pairs;
  }, [animations]);

  return (
    <div className="bg-transparent border border-white/10 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden h-full">
      {/* 碰撞冲击波 */}
      {collisions.map((c, i) => (
        <CollisionImpact key={`${c.sourceId}-${c.targetId}-${i}`} />
      ))}

      {/* 敌方区域 */}
      <div className="flex justify-center gap-5 flex-wrap items-end">
        {enemyGenerals.map(g => {
          const anim = getAnimation(g.generalId);
          return (
            <BattleGeneralSprite
              key={`${g.side}:${g.generalId}`}
              general={g}
              isActive={currentActor ? (currentActor.generalId === g.generalId && currentActor.side === g.side) : false}
              animation={anim?.animation}
              floatingText={anim?.floatingText}
              targetSide={anim?.targetId ? (playerGenerals.some(p => p.generalId === anim.targetId) ? 'player' : 'enemy') : undefined}
              onClick={() => onGeneralClick(`${g.side}:${g.generalId}`)}
            />
          );
        })}
        {enemyGenerals.length === 0 && (
          <div className="text-[#5a4328] text-sm py-8">敌方无武将</div>
        )}
      </div>

      {/* 中央战场区域 */}
      <div className="flex-1 flex items-center justify-center min-h-[80px] relative">
        <div className="border-t border-dashed border-white/10 w-full absolute top-1/2" />
        <span className="bg-transparent px-4 text-[#c9a84c] text-xl font-bold relative z-10">
          VS
        </span>
      </div>

      {/* 我方区域 */}
      <div className="flex justify-center gap-5 flex-wrap items-start">
        {playerGenerals.map(g => {
          const anim = getAnimation(g.generalId);
          return (
            <BattleGeneralSprite
              key={`${g.side}:${g.generalId}`}
              general={g}
              isActive={currentActor ? (currentActor.generalId === g.generalId && currentActor.side === g.side) : false}
              animation={anim?.animation}
              floatingText={anim?.floatingText}
              targetSide={anim?.targetId ? (enemyGenerals.some(e => e.generalId === anim.targetId) ? 'enemy' : 'player') : undefined}
              onClick={() => onGeneralClick(`${g.side}:${g.generalId}`)}
            />
          );
        })}
        {playerGenerals.length === 0 && (
          <div className="text-[#5a4328] text-sm py-8">我方无武将</div>
        )}
      </div>
    </div>
  );
}

function CollisionImpact() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-25">
      {/* 冲击波 */}
      <div
        className="rounded-full"
        style={{
          width: 0, height: 0,
          animation: 'collision-burst 0.6s ease-out forwards',
          boxShadow: '0 0 40px rgba(255,255,255,0.6), 0 0 80px rgba(255,200,100,0.3)',
        }}
      />
      {/* 火花粒子 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 6, height: 6,
            top: 0, left: 0,
            backgroundColor: i % 2 === 0 ? '#c9a84c' : '#ffffff',
            animation: `collision-spark 0.5s ${i * 0.05}s ease-out forwards`,
            '--sx': `${(i - 2.5) * 25}px`,
            '--sy': `${-20 - Math.abs(i - 2.5) * 10}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
