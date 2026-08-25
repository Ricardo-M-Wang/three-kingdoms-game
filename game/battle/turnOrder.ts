import type { BattleGeneral, BattleState } from '../types';
import { eventBus } from './eventBus';

// 按速度降序排列所有存活武将
export function computeTurnOrder(state: BattleState): BattleGeneral[] {
  const allAlive: BattleGeneral[] = [
    ...state.playerTeam.generals.filter(g => g.isAlive),
    ...state.enemyTeam.generals.filter(g => g.isAlive),
  ];

  allAlive.sort((a, b) => {
    const spdA = a.effectiveAttributes.spd;
    const spdB = b.effectiveAttributes.spd;
    if (spdB !== spdA) return spdB - spdA;
    // 武力高者优先
    const atkA = a.effectiveAttributes.atk;
    const atkB = b.effectiveAttributes.atk;
    if (atkB !== atkA) return atkB - atkA;
    // 最终按ID字典序
    return a.generalId.localeCompare(b.generalId);
  });

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'system',
    message: `第${state.roundNumber}回合行动顺序: ${allAlive.map(g => g.name).join(' → ')}`,
  });

  return allAlive;
}
