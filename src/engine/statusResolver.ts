import type { BattleGeneral, BattleState } from '../types';
import { eventBus } from './eventBus';

// 回合开始时检查状态
export function checkRoundStartStatus(g: BattleGeneral, state: BattleState): void {
  // 清醒: 清除所有控制状态
  if (g.hasClarity) {
    if (g.isStunned || g.isSilenced || g.isDisarmed) {
      g.isStunned = false;
      g.isSilenced = false;
      g.isDisarmed = false;
      g.statuses = g.statuses.filter(s =>
        s.id !== 'stun' && s.id !== 'silence' && s.id !== 'disarm'
      );
    }
  }
}

// 回合结束时清理持续1回合的控制状态
export function checkRoundEndStatus(g: BattleGeneral, state: BattleState): void {
  // 清除仅持续到自身回合结束的状态
  // (震慑在跳过回合后清除，在battleEngine中处理)
}

// 检查武将是否可以行动
export function canAct(g: BattleGeneral): boolean {
  return g.isAlive && !g.isStunned;
}

// 检查是否可以释放主动战法
export function canUseActiveSkill(g: BattleGeneral): boolean {
  return !g.isSilenced;
}

// 检查是否可以普攻
export function canNormalAttack(g: BattleGeneral): boolean {
  return !g.isDisarmed;
}

// 检查是否可以触发追击
export function canTriggerPursuit(g: BattleGeneral): boolean {
  return g.isAlive;
}
