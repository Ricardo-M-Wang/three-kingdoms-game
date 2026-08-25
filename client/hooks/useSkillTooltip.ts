import { useMemo } from 'react';
import { getSkillById } from '../../game/skills';

export function useSkillTooltip(skillId: string) {
  return useMemo(() => {
    if (!skillId) return null;
    const skill = getSkillById(skillId);
    if (!skill) return null;
    return {
      name: skill.name,
      type: skill.type,
      typeLabel: skill.type === 'active' ? '主动' : skill.type === 'pursuit' ? '追击' : skill.type === 'command' ? '指挥' : '被动',
      activationRate: skill.activationRate,
      description: skill.description,
    };
  }, [skillId]);
}
