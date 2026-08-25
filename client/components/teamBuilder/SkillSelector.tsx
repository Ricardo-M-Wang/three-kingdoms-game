import type { SkillDef } from '../../../game/types/skill';
import SkillIcon from '../shared/SkillIcon';

const TYPE_LABELS: Record<string, string> = {
  active: '主动', pursuit: '追击', command: '指挥', passive: '被动',
};

const CARD_CLASSES: Record<string, string> = {
  active: 'skill-card-active', pursuit: 'skill-card-pursuit',
  command: 'skill-card-command', passive: 'skill-card-passive',
};

interface Props {
  slot: number;
  selectedSkill: SkillDef | null | undefined;
  availableSkills: SkillDef[];
  onEquip: (skillId: string) => void;
  onUnequip: () => void;
}

export default function SkillSelector({ slot, selectedSkill, availableSkills, onEquip, onUnequip }: Props) {
  return (
    <div>
      <div className="text-[#8b7355] text-xs mb-1">战法槽 {slot + 1}</div>
      {selectedSkill ? (
        <div className={`rounded p-2 border ${CARD_CLASSES[selectedSkill.type]}`}>
          <div className="flex items-center gap-2 mb-1">
            <SkillIcon type={selectedSkill.type} size="sm" />
            <span className="text-[#d4c5a0] text-sm font-bold">{selectedSkill.name}</span>
            <span className="text-xs text-[#8b7355] ml-auto">{TYPE_LABELS[selectedSkill.type]}</span>
          </div>
          <div className="text-[#8b7355] text-xs">{selectedSkill.description}</div>
          {selectedSkill.activationRate > 0 && (
            <div className="text-[#c9a84c] text-xs mt-1">发动率: {selectedSkill.activationRate}%</div>
          )}
          <button
            onClick={onUnequip}
            className="mt-1 text-xs text-[#8b4513] hover:text-red-400 cursor-pointer"
          >
            卸下
          </button>
        </div>
      ) : (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onEquip(e.target.value);
          }}
          className="w-full bg-[#1f1410] border border-[#3d2b1a] rounded p-1.5 text-sm text-[#d4c5a0]
            focus:border-[#c9a84c] outline-none cursor-pointer"
        >
          <option value="">-- 选择战法 --</option>
          {availableSkills.map(s => (
            <option key={s.id} value={s.id}>
              [{TYPE_LABELS[s.type]}] {s.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
