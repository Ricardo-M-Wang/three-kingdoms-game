import type { BattleGeneral } from '../../../game/types';
import GeneralPortrait from '../shared/GeneralPortrait';
import { getSkillById } from '../../../game/skills';

interface Props {
  general: BattleGeneral;
  onClose: () => void;
}

export default function GeneralInspectPanel({ general, onClose }: Props) {
  const attr = general.effectiveAttributes;
  const innateSkill = getSkillById(general.innateSkillId);
  const equipped0 = general.equippedSkillIds[0] ? getSkillById(general.equippedSkillIds[0]) : null;
  const equipped1 = general.equippedSkillIds[1] ? getSkillById(general.equippedSkillIds[1]) : null;
  const isEnemy = general.side === 'enemy';

  return (
    <div className="bg-transparent border border-white/10 rounded-lg p-6 max-h-[80vh] overflow-y-auto" style={{ width: '420px' }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <GeneralPortrait generalId={general.generalId} name={general.name} size="lg" />
          <div>
            <h3 className={`text-xl font-bold ${isEnemy ? 'text-[#d46b6b]' : 'text-[#6bc96b]'}`}>
              {general.name}
            </h3>
            <span className="text-sm text-[#8b7355]">
              {isEnemy ? '敌方' : '我方'} · {general.isAlive ? '存活' : '阵亡'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-[#8b7355] hover:text-[#c9a84c] text-2xl cursor-pointer">✕</button>
      </div>

      {/* 生命 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-[#8b7355] mb-1">
          <span>生命</span>
          <span>{general.currentHp} / {general.maxHp}</span>
        </div>
        <div className="w-full bg-transparent rounded-full h-3 border border-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(0, general.currentHp / general.maxHp * 100)}%`,
              backgroundColor: general.currentHp / general.maxHp > 0.5 ? '#22c55e' : general.currentHp / general.maxHp > 0.25 ? '#eab308' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* 四大属性 */}
      <div className="mb-4">
        <h4 className="text-[#c9a84c] text-base font-bold mb-2 border-b border-white/10 pb-1">当前属性</h4>
        <div className="grid grid-cols-2 gap-2 text-base">
          <AttrRow label="武力" value={attr.atk} base={general.baseAttributes.atk + general.freePoints.atk} />
          <AttrRow label="智力" value={attr.int} base={general.baseAttributes.int + general.freePoints.int} />
          <AttrRow label="统帅" value={attr.def} base={general.baseAttributes.def + general.freePoints.def} />
          <AttrRow label="速度" value={attr.spd} base={general.baseAttributes.spd + general.freePoints.spd} />
        </div>
        <div className="text-sm text-[#8b7355] mt-2">
          暴击率: {general.critRate}% | 暴击伤害: {general.critDamage}% | 规避率: {general.dodgeRate}%
        </div>
        <div className="text-sm text-[#8b7355]">
          增伤: {general.damageBonus}% | 减伤: {general.damageReduction}% | 受伤提升: {general.takenBonus}% | 受伤降低: {general.takenReduction}%
        </div>
        <div className="text-sm text-[#8b7355]">
          吸血(武): {general.lifestealPhysical}% | 吸血(智): {general.lifestealMagical}% | 反击: {general.counterDamageBonus}%
        </div>
      </div>

      {/* 装备技能 */}
      <div className="mb-4">
        <h4 className="text-[#c9a84c] text-base font-bold mb-2 border-b border-white/10 pb-1">战法</h4>
        <SkillRow label="自带" skill={innateSkill} />
        <SkillRow label="装备1" skill={equipped0} />
        <SkillRow label="装备2" skill={equipped1} />
      </div>

      {/* Buffs */}
      {general.buffs.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[#22c55e] text-sm font-bold mb-1">增益 Buff</h4>
          <div className="flex flex-wrap gap-1">
            {general.buffs.map((b, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[#0a2a0a] text-[#22c55e] border border-[#2a4a2a]"
                title={`${b.name} 剩余${b.remainingRounds}回合${b.stacks > 1 ? ` (${b.stacks}层)` : ''}`}
              >
                {b.name}{b.stacks > 1 ? ` ${b.stacks}` : ''} ({b.remainingRounds}回合)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 功能性增益 */}
      {(general.hasArmorBreak || general.hasFormationBreak || general.hasInsight ||
        general.hasDoubleStrike || general.hasClarity || general.hasPenetrate) && (
        <div className="mb-3">
          <h4 className="text-[#c9a84c] text-sm font-bold mb-1">功能性增益</h4>
          <div className="flex flex-wrap gap-1">
            {general.hasArmorBreak && <Tag label="破甲" color="#c9a84c" />}
            {general.hasFormationBreak && <Tag label="破阵" color="#f59e0b" />}
            {general.hasInsight && <Tag label="会心" color="#eab308" />}
            {general.hasDoubleStrike && <Tag label="连击" color="#22c55e" />}
            {general.hasClarity && <Tag label="清醒" color="#06b6d4" />}
            {general.hasPenetrate && <Tag label="穿透" color="#a78bfa" />}
          </div>
        </div>
      )}

      {/* Debuffs */}
      {(general.floodStacks > 0 || general.fearStacks > 0 || general.statuses.length > 0) && (
        <div className="mb-3">
          <h4 className="text-[#ef4444] text-sm font-bold mb-1">减益 / 控制</h4>
          <div className="flex flex-wrap gap-1">
            {general.floodStacks > 0 && <Tag label={`洪水 x${general.floodStacks}`} color="#3b82f6" />}
            {general.fearStacks > 0 && <Tag label={`畏惧 x${general.fearStacks}`} color="#8b5cf6" />}
            {general.isStunned && <Tag label="震慑" color="#ef4444" />}
            {general.isSilenced && <Tag label="技穷" color="#a855f7" />}
            {general.isDisarmed && <Tag label="缴械" color="#f97316" />}
            {general.statuses.map((s, i) => (
              <Tag key={i} label={`${s.name}(${s.remainingRounds}回合)`} color="#ef4444" />
            ))}
          </div>
        </div>
      )}

      {/* 特殊标记 */}
      {Object.keys(general.customState).filter(k => general.customState[k] > 0).length > 0 && (
        <div>
          <h4 className="text-[#c9a84c] text-sm font-bold mb-1">特殊状态</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(general.customState).filter(([, v]) => v > 0).map(([k, v]) => (
              <Tag key={k} label={`${k}: ${v}`} color="#8b7355" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AttrRow({ label, value, base }: { label: string; value: number; base: number }) {
  const diff = value - base;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[#8b7355] w-10">{label}</span>
      <span className="text-[#d4c5a0] font-mono font-bold">{value}</span>
      {diff !== 0 && (
        <span className={`text-xs ${diff > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          ({diff > 0 ? '+' : ''}{diff})
        </span>
      )}
    </div>
  );
}

function SkillRow({ label, skill }: { label: string; skill: any }) {
  if (!skill) return null;
  const typeLabel = skill.type === 'active' ? '主动' : skill.type === 'pursuit' ? '追击' : skill.type === 'command' ? '指挥' : '被动';
  return (
    <div className="text-sm mb-3">
      <div>
        <span className="text-[#8b7355]">{label}: </span>
        <span className="text-[#c9a84c]">[{typeLabel}]</span>
        <span className="text-[#d4c5a0]"> {skill.name}</span>
        {skill.activationRate > 0 && <span className="text-[#8b7355] ml-1">({skill.activationRate}%)</span>}
      </div>
      <div className="text-[#8b7355] mt-1 leading-relaxed">{skill.description}</div>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}
