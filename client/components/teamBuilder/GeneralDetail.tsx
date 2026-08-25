import type { BattleGeneral } from '../../../game/types';
import type { SkillDef } from '../../../game/types/skill';
import { getSkillById } from '../../../game/skills';
import GeneralPortrait from '../shared/GeneralPortrait';
import AttributeAllocator from './AttributeAllocator';
import SkillSelector from './SkillSelector';

interface Props {
  general: BattleGeneral;
  index: number;
  side: 'player' | 'enemy';
  onAllocatePoint: (index: number, attr: 'atk' | 'int' | 'def' | 'spd', delta: number, side?: 'player' | 'enemy') => void;
  onAllocateAll: (index: number, attr: 'atk' | 'int' | 'def' | 'spd', side?: 'player' | 'enemy') => void;
  onResetAll: (index: number, side?: 'player' | 'enemy') => void;
  onEquipSkill: (index: number, slot: 0 | 1, skillId: string, side?: 'player' | 'enemy') => void;
  onUnequipSkill: (index: number, slot: 0 | 1, side?: 'player' | 'enemy') => void;
  availableSkills: SkillDef[];
}

export default function GeneralDetail({
  general, index, side,
  onAllocatePoint, onAllocateAll, onResetAll, onEquipSkill, onUnequipSkill,
  availableSkills,
}: Props) {
  const innateSkill = getSkillById(general.innateSkillId);
  const remainingPoints = general.maxFreePoints
    - general.freePoints.atk - general.freePoints.int
    - general.freePoints.def - general.freePoints.spd;

  const equippedSkill0 = general.equippedSkillIds[0] ? getSkillById(general.equippedSkillIds[0]) : null;
  const equippedSkill1 = general.equippedSkillIds[1] ? getSkillById(general.equippedSkillIds[1]) : null;

  const attr = general.effectiveAttributes;
  const isEnemy = side === 'enemy';
  const borderColor = isEnemy ? '#5c1a1a' : '#3d2b1a';
  const titleColor = isEnemy ? '#ef4444' : '#c9a84c';

  return (
    <div className="bg-transparent border rounded-lg p-2 h-full overflow-y-auto" style={{ borderColor }}>
      {/* 头像 + 属性点 (左) | 名字/属性 + 战法 (右) */}
      <div className="flex gap-3">
        {/* 左: 立绘 + 属性分配 */}
        <div className="flex flex-col items-center gap-1">
          <GeneralPortrait generalId={general.generalId} name={general.name} size="lg" />
          <AttributeAllocator
            freePoints={general.freePoints}
            remaining={remainingPoints}
            baseAtk={general.baseAttributes.atk}
            baseInt={general.baseAttributes.int}
            baseDef={general.baseAttributes.def}
            baseSpd={general.baseAttributes.spd}
            onChange={(attr, delta) => onAllocatePoint(index, attr, delta, side)}
            onAllocateAll={(attr) => onAllocateAll(index, attr, side)}
            onResetAll={() => onResetAll(index, side)}
          />
        </div>

        {/* 右: 名字/属性 + 战法 */}
        <div className="flex-1 min-w-0 flex gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold leading-tight" style={{ color: titleColor }}>{general.name}
              {isEnemy && <span className="text-base ml-1 opacity-70">敌方</span>}
              {!isEnemy && general.advancement > 0 && (
                <span className="text-base text-[#c9a84c] ml-1">{'★'.repeat(general.advancement)}{'☆'.repeat(5 - general.advancement)}</span>
              )}
            </h3>
            <div className="flex gap-3 text-lg mt-0.5">
              <span className="text-[#8b7355]">武<span className="text-[#d4c5a0] ml-0.5 font-bold">{attr.atk}</span></span>
              <span className="text-[#8b7355]">智<span className="text-[#d4c5a0] ml-0.5 font-bold">{attr.int}</span></span>
              <span className="text-[#8b7355]">统<span className="text-[#d4c5a0] ml-0.5 font-bold">{attr.def}</span></span>
              <span className="text-[#8b7355]">速<span className="text-[#d4c5a0] ml-0.5 font-bold">{attr.spd}</span></span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div>
              <h4 className="text-base font-bold" style={{ color: titleColor }}>
                自带: {innateSkill?.name}
                <span className="text-[#8b7355] text-sm ml-1">
                  [{innateSkill?.type === 'active' ? '主动' : innateSkill?.type === 'pursuit' ? '追击' : innateSkill?.type === 'command' ? '指挥' : '被动'}
                  {innateSkill?.activationRate ? ` ${innateSkill.activationRate}%` : ''}]
                </span>
              </h4>
              {innateSkill && (
                <div className="text-[#8b7355] text-base leading-snug">{innateSkill.description}</div>
              )}
            </div>
            <div>
              <h4 className="text-base font-bold" style={{ color: titleColor }}>装备战法</h4>
              <SkillSelector
                slot={0}
                selectedSkill={equippedSkill0}
                availableSkills={availableSkills.filter(s => s.id !== general.equippedSkillIds[1])}
                onEquip={(skillId) => onEquipSkill(index, 0, skillId, side)}
                onUnequip={() => onUnequipSkill(index, 0, side)}
              />
              <SkillSelector
                slot={1}
                selectedSkill={equippedSkill1}
                availableSkills={availableSkills.filter(s => s.id !== general.equippedSkillIds[0])}
                onEquip={(skillId) => onEquipSkill(index, 1, skillId, side)}
                onUnequip={() => onUnequipSkill(index, 1, side)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
