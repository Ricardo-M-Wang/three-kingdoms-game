import type { BattleGeneral, BattleState } from '../types';
import { eventBus } from './eventBus';
import { refreshEffectiveAttributes } from './attributeCalculator';

// 功能性增益列表
const FUNCTIONAL_BUFFS = ['armor_break', 'formation_break', 'insight', 'double_strike', 'clarity', 'penetrate'];

// 应用buff到武将
export function applyBuff(
  target: BattleGeneral,
  buffId: string,
  buffName: string,
  duration: number,
  stacks: number = 1,
  state: BattleState,
  sourceId?: string,
): void {
  const existing = target.buffs.find(b => b.id === buffId);
  if (existing) {
    existing.remainingRounds = Math.max(existing.remainingRounds, duration);
    existing.stacks = Math.min(existing.stacks + stacks, 99);
  } else {
    target.buffs.push({
      id: buffId, name: buffName,
      remainingRounds: duration, stacks,
      sourceId,
    });
  }

  // 应用buff效果
  applyBuffEffect(target, buffId, stacks, state);

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'buff',
    message: `${target.name} 获得 ${buffName}${stacks > 1 ? ` (${stacks}层)` : ''}${duration >= 99 ? '(永久)' : `，持续${duration}回合`}`,
    targetGeneralId: target.generalId,
    sourceGeneralId: sourceId,
  });
  eventBus.emit('buff:applied', target, buffName, state);

  refreshEffectiveAttributes(target);
}

// 应用debuff
export function applyDebuff(
  target: BattleGeneral,
  debuffId: string,
  debuffName: string,
  duration: number,
  stacks: number = 1,
  state: BattleState,
  sourceId?: string,
): void {
  if (debuffId === 'flood') {
    target.floodStacks = Math.min(3, target.floodStacks + stacks);
  } else if (debuffId === 'fear') {
    target.fearStacks = Math.min(99, target.fearStacks + stacks);
    target.takenBonus = target.fearStacks * 10;
  } else if (debuffId === 'wind') {
    target.spdBonusPercent -= 20;
  }

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'debuff',
    message: `${target.name} 被施加 ${debuffName}${stacks > 1 ? ` (${stacks}层)` : ''}，持续${duration}回合`,
    targetGeneralId: target.generalId,
    sourceGeneralId: sourceId,
  });
  eventBus.emit('debuff:applied', target, debuffName, stacks, state);

  refreshEffectiveAttributes(target);
}

// 应用状态(控制效果)
export function applyStatus(
  target: BattleGeneral,
  statusId: string,
  statusName: string,
  duration: number,
  state: BattleState,
  sourceId?: string,
): void {
  // 清醒: 免疫控制
  if (target.hasClarity) {
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'status',
      message: `${target.name} 免疫 ${statusName} (清醒)`,
      targetGeneralId: target.generalId,
    });
    return;
  }

  if (statusId === 'stun') {
    target.isStunned = true;
  } else if (statusId === 'silence') {
    target.isSilenced = true;
  } else if (statusId === 'disarm') {
    target.isDisarmed = true;
  }

  // 存储状态以便回合结束时过期
  const existing = target.statuses.find(s => s.id === statusId);
  if (existing) {
    existing.remainingRounds = Math.max(existing.remainingRounds, duration);
  } else {
    target.statuses.push({ id: statusId, name: statusName, remainingRounds: duration, sourceId });
  }

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'status',
    message: `${target.name} 陷入 ${statusName}，持续${duration}回合`,
    targetGeneralId: target.generalId,
    sourceGeneralId: sourceId,
  });
  eventBus.emit('status:applied', target, statusName, state);
}

// 应用功能性增益
export function applyFunctionalBuff(
  target: BattleGeneral,
  buffId: string,
  state: BattleState,
  sourceId?: string,
  duration: number = 1,
): void {
  switch (buffId) {
    case 'armor_break':
      target.hasArmorBreak = true; break;
    case 'formation_break':
      target.hasFormationBreak = true; break;
    case 'insight':
      target.hasInsight = true; break;
    case 'double_strike':
      target.hasDoubleStrike = true; break;
    case 'clarity':
      target.hasClarity = true; break;
    case 'penetrate':
      target.hasPenetrate = true; break;
  }
  applyBuff(target, buffId, getBuffName(buffId), duration, 1, state, sourceId);
}

function applyBuffEffect(target: BattleGeneral, buffId: string, _stacks: number, _state: BattleState): void {
  // 这里只处理属性类buff，功能性buff在applyFunctionalBuff中处理
  switch (buffId) {
    case 'bubu_dmg_reduction': {
      // 步步为营: 每层+5%减伤(上限30%，仅限本buff贡献)
      const bubuStacks = Math.min((target.customState['bubu_stacks'] ?? 0) + 1, 6);
      const prevContrib = (target.customState['bubu_contrib'] ?? 0);
      const newContrib = bubuStacks * 5;
      target.customState['bubu_stacks'] = bubuStacks;
      target.customState['bubu_contrib'] = newContrib;
      target.damageReduction = target.damageReduction - prevContrib + newContrib;
      break;
    }
    case 'biqi_dmg_reduction':
      // 避其锐气: 仅首次应用时+20%减伤，刷新不叠加
      if (!target.customState['biqi_applied']) {
        target.customState['biqi_applied'] = 1;
        target.damageReduction += 20;
      }
      break;
  }
}

export function getBuffName(buffId: string): string {
  const names: Record<string, string> = {
    'armor_break': '破甲', 'formation_break': '破阵', 'insight': '会心',
    'double_strike': '连击', 'clarity': '清醒', 'penetrate': '穿透',
    'bubu_dmg_reduction': '步步为营', 'biqi_dmg_reduction': '避其锐气',
    'taoyuan_dmg_reduction': '桃园减伤',
    'guixin': '归心',
  };
  return names[buffId] ?? buffId;
}

export function getStatusName(statusId: string): string {
  const names: Record<string, string> = {
    'stun': '震慑', 'silence': '技穷', 'disarm': '缴械', 'dodge': '规避',
  };
  return names[statusId] ?? statusId;
}

// 回合结束时tick所有buff/debuff/状态
export function tickAllBuffs(generals: BattleGeneral[], state: BattleState): void {
  for (const g of generals) {
    if (!g.isAlive) continue;

    // Tick buffs
    for (const buff of [...g.buffs]) {
      buff.remainingRounds--;
      if (buff.remainingRounds <= 0) {
        g.buffs = g.buffs.filter(b => b !== buff);
        removeBuffEffect(g, buff.id);
        eventBus.emit('buff:expired', g, buff.name, state);
      }
    }

    // Tick statuses
    for (const st of [...g.statuses]) {
      st.remainingRounds--;
      if (st.remainingRounds <= 0) {
        g.statuses = g.statuses.filter(s => s !== st);
        removeStatusEffect(g, st.id);
        eventBus.emit('status:expired', g, st.name, state);
      }
    }

    // 回合结束重置控制状态 (只持续当前回合的)
    // 震慑、技穷、缴械在自身回合结束后清除
    refreshEffectiveAttributes(g);
  }
}

function removeBuffEffect(g: BattleGeneral, buffId: string): void {
  switch (buffId) {
    case 'armor_break': g.hasArmorBreak = false; break;
    case 'formation_break': g.hasFormationBreak = false; break;
    case 'insight': g.hasInsight = false; break;
    case 'double_strike': g.hasDoubleStrike = false; break;
    case 'clarity': g.hasClarity = false; break;
    case 'penetrate': g.hasPenetrate = false; break;
    case 'bubu_dmg_reduction': {
      const contrib = (g.customState['bubu_contrib'] ?? 0);
      g.damageReduction = Math.max(0, g.damageReduction - contrib);
      g.customState['bubu_stacks'] = 0;
      g.customState['bubu_contrib'] = 0;
      break;
    }
    case 'biqi_dmg_reduction': {
      g.damageReduction = Math.max(0, g.damageReduction - 20);
      g.customState['biqi_applied'] = 0;
      break;
    }
  }
}

function removeStatusEffect(g: BattleGeneral, statusId: string): void {
  switch (statusId) {
    case 'stun': g.isStunned = false; break;
    case 'silence': g.isSilenced = false; break;
    case 'disarm': g.isDisarmed = false; break;
  }
}

// 回合开始时重置每回合的debuff追踪计数器
// 注意: 不重置属性修正值(defBonusPercent等)，这些由各武将自身的回合结束逻辑处理
export function resetRoundDebuffs(_generals: BattleGeneral[]): void {
  // 每回合追踪计数器由 battleEngine processRoundStart 处理
  // 此函数保留作为扩展点
}

// 随机获取一个功能性增益
export function getRandomFunctionalBuff(excludeIds: string[] = []): string {
  const available = FUNCTIONAL_BUFFS.filter(b => !excludeIds.includes(b));
  if (available.length === 0) return FUNCTIONAL_BUFFS[0];
  return available[Math.floor(Math.random() * available.length)];
}

// 获取武将当前拥有的功能性增益列表
export function getOwnedFunctionalBuffs(g: BattleGeneral): string[] {
  const owned: string[] = [];
  if (g.hasArmorBreak) owned.push('armor_break');
  if (g.hasFormationBreak) owned.push('formation_break');
  if (g.hasInsight) owned.push('insight');
  if (g.hasDoubleStrike) owned.push('double_strike');
  if (g.hasClarity) owned.push('clarity');
  if (g.hasPenetrate) owned.push('penetrate');
  return owned;
}
