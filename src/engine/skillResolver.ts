import type { BattleGeneral, BattleState, Team } from '../types';
import type { SkillDef, SkillEffect } from '../types/skill';
import type { DamageContext } from '../types/damage';
import { calculateDamage, applyDamage, clampHealing } from './damageCalculator';
import { applyBuff, applyDebuff, applyStatus, applyFunctionalBuff, getRandomFunctionalBuff, getOwnedFunctionalBuffs } from './buffManager';
import { refreshEffectiveAttributes } from './attributeCalculator';
import { eventBus } from './eventBus';
import { rollChance, randomPick } from '../utils/random';
import { getSkillById } from '../data';

// 应用功能性增益并触发 on_ally_gain_buff 技能（如张郃巧变）
function applyFunctionalBuffWithTrigger(
  target: BattleGeneral,
  buffId: string,
  state: BattleState,
  sourceId?: string,
  duration: number = 1,
): void {
  applyFunctionalBuff(target, buffId, state, sourceId, duration);

  // 触发友方 on_ally_gain_buff 技能
  const allies = target.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
  for (const ally of allies) {
    if (!ally.isAlive) continue;
    // 自带战法 trigger
    const innate = getSkillById(ally.innateSkillId);
    if (innate && innate.triggerCondition?.type === 'on_ally_gain_buff') {
      const countKey = 'on_ally_gain_buff_count';
      const count = (ally.customState[countKey] ?? 0);
      const limit = innate.maxTriggersPerRound ?? 99;
      if (count < limit) {
        ally.customState[countKey] = count + 1;
        state.currentSkillId = innate.id;
        state.currentSkillName = innate.name;
        state.currentSkillType = innate.type;
        resolveSkill(innate, ally, state, { targetId: target.generalId });
      }
    }
    // 装备战法 trigger
    for (const skillId of ally.equippedSkillIds) {
      const eqSkill = getSkillById(skillId);
      if (eqSkill && eqSkill.triggerCondition?.type === 'on_ally_gain_buff') {
        const key = `on_ally_gain_${skillId}`;
        const cnt = (ally.customState[key] ?? 0);
        const lim = eqSkill.maxTriggersPerRound ?? 99;
        if (cnt < lim) {
          ally.customState[key] = cnt + 1;
          state.currentSkillId = eqSkill.id;
          state.currentSkillName = eqSkill.name;
          state.currentSkillType = eqSkill.type;
          resolveSkill(eqSkill, ally, state, { targetId: target.generalId });
        }
      }
    }
  }
}


// 获取队伍中所有存活武将
function getAliveGenerals(team: Team): BattleGeneral[] {
  return team.generals.filter(g => g.isAlive);
}

// 获取敌方存活武将
function getEnemyAlive(state: BattleState, side: 'player' | 'enemy'): BattleGeneral[] {
  return side === 'player' ? getAliveGenerals(state.enemyTeam) : getAliveGenerals(state.playerTeam);
}

// 获取友方存活武将
function getAllyAlive(state: BattleState, side: 'player' | 'enemy'): BattleGeneral[] {
  return side === 'player' ? getAliveGenerals(state.playerTeam) : getAliveGenerals(state.enemyTeam);
}

// 执行一个战法的效果
export function resolveSkill(
  skill: SkillDef,
  source: BattleGeneral,
  state: BattleState,
  extraArgs?: Record<string, any>,
): void {
  // 设置技能上下文用于统计
  const prevSkillId = state.currentSkillId;
  const prevSkillName = state.currentSkillName;
  const prevSkillType = state.currentSkillType;
  state.currentSkillId = skill.id;
  state.currentSkillName = skill.name;
  state.currentSkillType = skill.type;

  // 记录技能发动次数
  const skillStatsMap = source.side === 'player' ? state.playerSkillStats : state.enemySkillStats;
  if (!skillStatsMap[source.generalId]) {
    skillStatsMap[source.generalId] = { normalAttack: { damage: 0, count: 0 }, skills: {} };
  }
  if (!skillStatsMap[source.generalId].skills[skill.id]) {
    skillStatsMap[source.generalId].skills[skill.id] = { damage: 0, heal: 0, count: 0, name: skill.name, type: skill.type };
  }
  skillStatsMap[source.generalId].skills[skill.id].count++;

  const customResult = runCustomSkillHandler(skill.id, source, state, extraArgs);
  if (!customResult) {
    // 通用效果处理
    for (const effect of skill.effects) {
      resolveGenericEffect(effect, source, state);
    }
  }

  // 触发友方 on_ally_skill 条件的战法 (仅技能造成伤害时触发，排除非伤害技)
  if (!state._inAllySkillChain && skill.effects.some(e => e.type === 'damage')) {
    const allies = source.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
    state._inAllySkillChain = true; // 防递归
    for (const ally of allies) {
      if (!ally.isAlive || ally.generalId === source.generalId) continue;
      // 自带战法
      const allyInnate = getSkillById(ally.innateSkillId);
      // 孙权、周瑜的 on_ally_skill 在 battleEngine 中单独处理，此处跳过
      if (allyInnate && allyInnate.triggerCondition?.type === 'on_ally_skill'
        && allyInnate.id !== 'quanyujiangdong' && allyInnate.id !== 'huoshaochibi') {
        const count = (ally.customState['on_ally_skill_count'] ?? 0);
        const limit = allyInnate.maxTriggersPerRound ?? 99;
        if (count < limit) {
          ally.customState['on_ally_skill_count'] = count + 1;
          resolveSkill(allyInnate, ally, state);
        }
      }
      // 装备战法
      for (const skillId of ally.equippedSkillIds) {
        const eqSkill = getSkillById(skillId);
        if (eqSkill && eqSkill.triggerCondition?.type === 'on_ally_skill') {
          const countKey = `on_ally_${skillId}`;
          const count = (ally.customState[countKey] ?? 0);
          const limit = eqSkill.maxTriggersPerRound ?? 99;
          if (count < limit) {
            ally.customState[countKey] = count + 1;
            resolveSkill(eqSkill, ally, state);
          }
        }
      }
    }
    state._inAllySkillChain = false;
  }

  // 恢复技能上下文
  state.currentSkillId = prevSkillId;
  state.currentSkillName = prevSkillName;
  state.currentSkillType = prevSkillType;
}

// 解析通用效果
function resolveGenericEffect(effect: SkillEffect, source: BattleGeneral, state: BattleState): void {
  const targets = resolveTargets(effect.target, source, state);

  for (const target of targets) {
    if (!target.isAlive) continue;

    switch (effect.type) {
      case 'damage': {
        const dmgType = effect.damageType ?? 'physical';
        const mult = effect.multiplier ?? 1.0;
        const ctx: DamageContext = {
          attacker: source,
          defender: target,
          baseMultiplier: mult,
          damageType: dmgType,
          isCrit: source.hasInsight,
          critMultiplier: source.critDamage / 100,
          dmgBonus: source.damageBonus,
          dmgReduction: target.damageReduction,
          takenBonus: target.takenBonus,
          takenReduction: target.takenReduction,
          ignoreDefense: source.hasArmorBreak,
          ignoreDmgReduction: source.hasFormationBreak,
        };
        const result = calculateDamage(ctx, state);
        applyDamage(result, target, source, state);
        recordDamage(source, target, result.finalDamage, state);
        break;
      }
      case 'heal': {
        const healMult = effect.multiplier ?? 1.0;
        const rawHealAmount = Math.round(source.effectiveAttributes.int * healMult);
        const { effectiveHeal, wasted } = clampHealing(target, rawHealAmount);
        target.currentHp = Math.min(target.maxHp, target.currentHp + effectiveHeal);
        const wastedText = wasted > 0 ? ` (已损失生命75%上限，溢${wasted})` : '';
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'heal',
          message: `${source.name} 为 ${target.name} 回复 ${effectiveHeal} 点生命${wastedText}`,
          sourceGeneralId: source.generalId,
          targetGeneralId: target.generalId,
        });
        eventBus.emit('heal:applied', target, effectiveHeal, source.name, state);
        recordHeal(source, effectiveHeal, state);
        break;
      }
      case 'buff': {
        if (effect.buffId) {
          applyBuff(target, effect.buffId, effect.buffId, effect.duration ?? 1, 1, state, source.generalId);
        }
        break;
      }
      case 'debuff': {
        if (effect.debuffId) {
          applyDebuff(target, effect.debuffId, effect.debuffId, effect.duration ?? 1, 1, state, source.generalId);
        }
        break;
      }
      case 'status': {
        if (effect.statusId) {
          applyStatus(target, effect.statusId, effect.statusId, effect.duration ?? 1, state, source.generalId);
        }
        break;
      }
      case 'dot': {
        // DoT: 存储灼烧等效果
        const dotMult = effect.multiplier ?? 0.6;
        applyDotEffect(target, source, dotMult, effect.duration ?? 2, state);
        break;
      }
    }
  }
}

// DoT效果 (灼烧)
function applyDotEffect(target: BattleGeneral, source: BattleGeneral, multiplier: number, duration: number, state: BattleState): void {
  // 灼烧上限5层
  const currentStacks = target.buffs.filter(b => b.id === 'burn').reduce((s, b) => s + b.stacks, 0);
  if (currentStacks >= 5) {
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'debuff',
      message: `${target.name} 灼烧已达上限(5层)，无法继续叠加`,
      targetGeneralId: target.generalId,
    });
    return;
  }
  const dotDmg = Math.round(source.effectiveAttributes.atk * multiplier);
  applyBuff(target, 'burn', '灼烧', duration, 1, state, source.generalId);
  // 存储灼烧伤害值及施加者
  target.customState['burn_damage'] = dotDmg;
  target.burnSourceId = source.generalId;
  target.burnSourceName = source.name;
}

// 解析目标
function resolveTargets(targetType: string, source: BattleGeneral, state: BattleState): BattleGeneral[] {
  const enemies = getEnemyAlive(state, source.side);
  const allies = getAllyAlive(state, source.side);

  switch (targetType) {
    case 'enemy_single': {
      if (enemies.length === 0) return [];
      return [enemies[Math.floor(Math.random() * enemies.length)]];
    }
    case 'enemy_all': return enemies;
    case 'enemy_two': {
      // 随机选择两名不同敌人
      const shuffled = [...enemies].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 2);
    }
    case 'enemy_random': {
      const picked = randomPick(enemies);
      return picked ? [picked] : [];
    }
    case 'enemy_lowest_def': {
      if (enemies.length === 0) return [];
      const lowest = enemies.reduce((a, b) =>
        a.effectiveAttributes.def < b.effectiveAttributes.def ? a : b
      );
      return [lowest];
    }
    case 'enemy_lowest_spd': {
      if (enemies.length === 0) return [];
      const lowest = enemies.reduce((a, b) =>
        a.effectiveAttributes.spd < b.effectiveAttributes.spd ? a : b
      );
      return [lowest];
    }
    case 'ally_single': return allies.length > 0 ? [allies[0]] : [];
    case 'ally_all': return allies;
    case 'ally_lowest_hp': case 'ally_lowest_hp_single': {
      if (allies.length === 0) return [];
      const lowest = allies.reduce((a, b) =>
        (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
      );
      return [lowest];
    }
    case 'ally_highest_atk': {
      if (allies.length === 0) return [];
      const highest = allies.reduce((a, b) =>
        a.effectiveAttributes.atk > b.effectiveAttributes.atk ? a : b
      );
      return [highest];
    }
    case 'ally_highest_int': {
      if (allies.length === 0) return [];
      const highest = allies.reduce((a, b) =>
        a.effectiveAttributes.int > b.effectiveAttributes.int ? a : b
      );
      return [highest];
    }
    case 'ally_highest_spd': {
      if (allies.length === 0) return [];
      const highest = allies.reduce((a, b) =>
        a.effectiveAttributes.spd > b.effectiveAttributes.spd ? a : b
      );
      return [highest];
    }
    case 'self': return [source];
    default: return [];
  }
}

// 记录伤害 (从state读取技能上下文)
function recordDamage(source: BattleGeneral, _target: BattleGeneral, damage: number, state: BattleState): void {
  const sideStats = source.side === 'player' ? state.playerTotalDamage : state.enemyTotalDamage;
  sideStats[source.generalId] = (sideStats[source.generalId] ?? 0) + damage;

  const skillStatsMap = source.side === 'player' ? state.playerSkillStats : state.enemySkillStats;
  if (!skillStatsMap[source.generalId]) {
    skillStatsMap[source.generalId] = { normalAttack: { damage: 0, count: 0 }, skills: {} };
  }
  const stats = skillStatsMap[source.generalId];
  const skillId = state.currentSkillId;

  if (skillId) {
    if (!stats.skills[skillId]) {
      stats.skills[skillId] = { damage: 0, heal: 0, count: 0, name: state.currentSkillName ?? skillId, type: state.currentSkillType ?? '' };
    }
    stats.skills[skillId].damage += damage;
    // count 在 resolveSkill 中递增，表示发动次数
  } else {
    stats.normalAttack.damage += damage;
    // count 在 performNormalAttack 中递增
  }
}

// 记录治疗
export function recordHeal(source: BattleGeneral, amount: number, state: BattleState): void {
  const skillId = state.currentSkillId;
  if (!skillId) return;
  const skillStatsMap = source.side === 'player' ? state.playerSkillStats : state.enemySkillStats;
  if (!skillStatsMap[source.generalId]) {
    skillStatsMap[source.generalId] = { normalAttack: { damage: 0, count: 0 }, skills: {} };
  }
  const stats = skillStatsMap[source.generalId];
  if (!stats.skills[skillId]) {
    stats.skills[skillId] = { damage: 0, heal: 0, count: 0, name: state.currentSkillName ?? skillId, type: state.currentSkillType ?? '' };
  }
  stats.skills[skillId].heal += amount;
}

// 获取武将的追击战法
function getPursuitSkills(general: BattleGeneral): SkillDef[] {
  const skills: SkillDef[] = [];
  const innate = getSkillById(general.innateSkillId);
  if (innate && innate.type === 'pursuit') skills.push(innate);
  for (const skillId of general.equippedSkillIds) {
    const skill = getSkillById(skillId);
    if (skill && skill.type === 'pursuit') skills.push(skill);
  }
  return skills;
}

// 普攻（可选指定目标）
export function performNormalAttack(attacker: BattleGeneral, state: BattleState, specificTarget?: BattleGeneral): void {
  // 清除技能上下文（普攻）
  const prevSkillId = state.currentSkillId;
  state.currentSkillId = undefined;
  state.currentSkillName = undefined;
  state.currentSkillType = undefined;

  const enemies = getEnemyAlive(state, attacker.side);
  if (enemies.length === 0) {
    state.currentSkillId = prevSkillId;
    return;
  }

  // 嘲讽: 优先攻击被嘲讽的目标
  const tauntedEnemies = enemies.filter(e => e.customState['taunt']);
  const targetPool = tauntedEnemies.length > 0 ? tauntedEnemies : enemies;
  const target = specificTarget && specificTarget.isAlive
    ? specificTarget
    : targetPool[Math.floor(Math.random() * targetPool.length)];

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'normal_attack',
    message: `${attacker.name} 普通攻击 ${target.name}`,
    sourceGeneralId: attacker.generalId,
    targetGeneralId: target.generalId,
  });

  const ctx: DamageContext = {
    attacker,
    defender: target,
    baseMultiplier: 1.0,
    damageType: 'physical',
    isCrit: attacker.hasInsight,
    critMultiplier: attacker.critDamage / 100,
    dmgBonus: attacker.damageBonus,
    dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus,
    takenReduction: target.takenReduction,
    ignoreDefense: attacker.hasArmorBreak,
    ignoreDmgReduction: attacker.hasFormationBreak,
  };

  const result = calculateDamage(ctx, state);
  applyDamage(result, target, attacker, state);
  recordDamage(attacker, target, result.finalDamage, state);

  // 记录普攻次数
  const skillStatsMap = attacker.side === 'player' ? state.playerSkillStats : state.enemySkillStats;
  if (!skillStatsMap[attacker.generalId]) {
    skillStatsMap[attacker.generalId] = { normalAttack: { damage: 0, count: 0 }, skills: {} };
  }
  skillStatsMap[attacker.generalId].normalAttack.count++;

  // 恢复技能上下文
  state.currentSkillId = prevSkillId;
}

// ======================== 自定义技能处理 ========================

function runCustomSkillHandler(
  skillId: string,
  source: BattleGeneral,
  state: BattleState,
  extraArgs?: Record<string, any>,
): boolean {
  switch (skillId) {
    // ---- 指挥战法 ----
    case 'qiaobian': handleQiaobian(source, state, extraArgs); return true;
    case 'hubaoxiongqi': handleHubaoxiongqi(source, state); return true;
    case 'beifazhizhi': handleBeifazhizhi(source, state, extraArgs); return true;
    case 'haolingqunxiong': handleHaolingqunxiong(source, state); return true;
    case 'qixi': handleQixi(source, state); return true;
    case 'yacibibao': handleYacibibao(source, state, extraArgs); return true;
    case 'taoyuanjieyi': handleTaoyuanjieyi(source, state); return true;
    case 'xiandeng': handleXiandeng(source, state); return true;
    case 'guruojintang': handleGuruojintang(source, state); return true;
    case 'xianzhenzhizhi': handleXianzhenzhizhi(source, state); return true;
    case 'biyue': handleBiyue(source, state); return true;
    case 'quanyujiangdong': handleQuanyujiangdong(source, state, extraArgs); return true;
    case 'huoshaochibi': handleHuoshaochibi(source, state, extraArgs); return true;

    // ---- 被动战法 ----
    case 'shenweitainjiangjun': handleShenweitainjiangjun(source, state, extraArgs); return true;
    case 'shensu': handleShensu(source, state); return true;
    case 'guzhielai': handleGuzhielai(source, state, extraArgs); return true;
    case 'weizhenxiaoyao': handleWeizhenxiaoyao(source, state); return true;
    case 'kanpo': handleKanpo(source, state, extraArgs); return true;
    case 'qijinqichu': handleQijinqichu(source, state, extraArgs); return true;
    case 'wangzuo': handleWangzuo(source, state); return true;
    case 'luanshixiaoxiong': handleLuanshixiaoxiong(source, state); return true;
    case 'ganglie': handleGanglie(source, state, extraArgs); return true;
    case 'wuqian': handleWuqian(source, state, extraArgs); return true;

    // ---- 主动战法 ----
    case 'yingshilanggu': handleYingshilanggu(source, state); return true;
    case 'shuiyanqijun': handleShuiyanqijun(source, state); return true;
    case 'fuhaipingshan': handleFuhaipingshan(source, state); return true;
    case 'jushuiduanqiao': handleJushuiduanqiao(source, state); return true;
    case 'wuleihongding': handleWuleihongding(source, state); return true;
    case 'huoshaolianying': handleHuoshaolianying(source, state); return true;
    case 'shishengshibai': handleShishengshibai(source, state); return true;

    // ---- 追击战法 ----
    case 'ziqilvli': handleZiqilvli(source, state, extraArgs); return true;
    case 'baibuchuanyang': handleBaibuchuanyang(source, state, extraArgs); return true;
    case 'zhengqing': handleZhengqing(source, state, extraArgs); return true;
    case 'jieying': handleJieying(source, state, extraArgs); return true;

    // ---- 通用被动 ----
    case 'huixin': handleHuixin(source, state); return true;
    case 'fange': handleFange(source, state, extraArgs); return true;
    case 'lianpo': handleLianpo(source, state); return true;
    case 'ruibukedang': handleRuibukedang(source, state); return true;
    case 'taoguangyanghui': handleTaoguangyanghui(source, state); return true;
    case 'bingguishensu': handleBingguishensu(source, state); return true;

    // ---- 通用指挥 ----
    case 'sheshengquyi': handleSheshengquyi(source, state); return true;
    case 'duangeduofeng': handleDuangeduofeng(source, state); return true;
    case 'xushidaifa': handleXushidaifa(source, state); return true;
    case 'quanjunchuji': handleQuanjunchuji(source, state); return true;

    // ---- 新增通用战法 ----
    case 'yuanmensheji': handleYuanmenSheji(source, state, extraArgs); return true;
    case 'wenwushuangquan': handleWenwuShuangquan(source, state); return true;
    case 'keji': handleKeji(source, state); return true;
    case 'mingqixushi': handleMingQiXuShi(source, state); return true;
    case 'cuifengpodi': handleCuifengpodi(source, state); return true;
    case 'baiyidujiang': handleBaiyidujiang(source, state, extraArgs); return true;
    case 'jianbiqingye': handleJianbiqingye(source, state); return true;
    case 'benyu': handleBenyu(source, state, extraArgs); return true;
    case 'tianrenzhiyong': handleTianrenzhiyong(source, state, extraArgs); return true;

    default: return false; // 使用通用效果处理
  }
}

// ========== 指挥战法实现 ==========

function handleQiaobian(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 巧变: 我方武将获得功能性增益时，额外获得一种
  if (!extraArgs?.targetId) return;
  const target = getAllyAlive(state, source.side).find(g => g.generalId === extraArgs.targetId);
  if (!target) return;

  const owned = getOwnedFunctionalBuffs(target);
  const newBuff = getRandomFunctionalBuff(owned);
  applyFunctionalBuffWithTrigger(target, newBuff, state, source.generalId);
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `巧变: ${target.name} 额外获得功能性增益`,
    sourceGeneralId: source.generalId,
    targetGeneralId: target.generalId,
  });
}

function handleHubaoxiongqi(source: BattleGeneral, state: BattleState): void {
  // 虎豹骑: 前三回合全体武力+20、速度+20、增伤+30%
  const allies = getAllyAlive(state, source.side);
  for (const ally of allies) {
    ally.atkBonusPercent += 20;
    ally.spdBonusPercent += 20;
    ally.damageBonus += 30;
    refreshEffectiveAttributes(ally);
  }
  // 存储虎豹骑状态以便第四回合清除
  source.customState['hubao_active'] = 1;
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `虎豹骑: 我方全体武力+20、速度+20、增伤+30%(前三回合)`,
    sourceGeneralId: source.generalId,
  });
}

function handleBeifazhizhi(source: BattleGeneral, state: BattleState, _extraArgs?: Record<string, any>): void {
  // 北伐之志: 我方全体造成非普攻伤害后，姜维对随机敌方目标造成100%武力+100%智力伤害
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  if (!target || !target.isAlive) return;

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `北伐之志: ${source.name} 对 ${target.name} 追加伤害`,
    sourceGeneralId: source.generalId,
    targetGeneralId: target.generalId,
  });

  const physCtx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: 1.0, damageType: 'physical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const physResult = calculateDamage(physCtx, state);
  applyDamage(physResult, target, source, state);
  recordDamage(source, target, physResult.finalDamage, state);

  if (!target.isAlive) return;

  const magCtx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: 1.0, damageType: 'magical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const magResult = calculateDamage(magCtx, state);
  applyDamage(magResult, target, source, state);
  recordDamage(source, target, magResult.finalDamage, state);
}

function handleHaolingqunxiong(source: BattleGeneral, state: BattleState): void {
  // 号令群雄: 自身行动时，智力最高单体对敌方全体造成90%智力伤害，武力最高单体对敌方全体造成90%武力伤害
  const allies = getAllyAlive(state, source.side);
  const enemies = getEnemyAlive(state, source.side);
  if (allies.length === 0 || enemies.length === 0) return;

  const highestInt = allies.reduce((a, b) => a.effectiveAttributes.int > b.effectiveAttributes.int ? a : b);
  const highestAtk = allies.reduce((a, b) => a.effectiveAttributes.atk > b.effectiveAttributes.atk ? a : b);

  eventBus.emit('skill:trigger', highestInt, 'haolingqunxiong_int', '号令群雄(智)', state);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const ctx: DamageContext = {
      attacker: highestInt, defender: enemy, baseMultiplier: 0.9, damageType: 'magical',
      isCrit: highestInt.hasInsight, critMultiplier: highestInt.critDamage / 100,
      dmgBonus: highestInt.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: highestInt.hasArmorBreak, ignoreDmgReduction: highestInt.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, highestInt, state);
    recordDamage(highestInt, enemy, result.finalDamage, state);
    // 每个目标命中触发姜维北伐之志
    triggerJiangweiAfterDelegatedDamage(source, state);
  }

  eventBus.emit('skill:trigger', highestAtk, 'haolingqunxiong_atk', '号令群雄(武)', state);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const ctx: DamageContext = {
      attacker: highestAtk, defender: enemy, baseMultiplier: 0.9, damageType: 'physical',
      isCrit: highestAtk.hasInsight, critMultiplier: highestAtk.critDamage / 100,
      dmgBonus: highestAtk.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: highestAtk.hasArmorBreak, ignoreDmgReduction: highestAtk.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, highestAtk, state);
    recordDamage(highestAtk, enemy, result.finalDamage, state);
    // 每个目标命中触发姜维北伐之志
    triggerJiangweiAfterDelegatedDamage(source, state);
  }
}

function triggerJiangweiAfterDelegatedDamage(source: BattleGeneral, state: BattleState): void {
  const jiangwei = (source.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals)
    .find(g => g.generalId === 'jiangwei' && g.isAlive);
  if (!jiangwei) return;
  const count = (jiangwei.customState['on_ally_skill_count'] ?? 0);
  const jwSkill = getSkillById('beifazhizhi');
  if (jwSkill && count < (jwSkill.maxTriggersPerRound ?? 3)) {
    jiangwei.customState['on_ally_skill_count'] = count + 1;
    resolveSkill(jwSkill, jiangwei, state);
  }
}

function handleQixi(source: BattleGeneral, state: BattleState): void {
  // 奇袭: 战斗开始时对敌方全体施加4层奇袭
  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    enemy.customState['qixi_stacks'] = 4;
  }
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `奇袭: 对敌方全体施加4层奇袭标记`,
    sourceGeneralId: source.generalId,
  });

  // 每回合开始时对敌方两人造成180%武力伤害 (在round_start时调用)
  if (state.phase === 'round_start') {
    const targets = [...enemies].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const target of targets) {
      if (!target.isAlive) continue;
      const qixiStacks = target.customState['qixi_stacks'] ?? 0;
      const ctx: DamageContext = {
        attacker: source, defender: target, baseMultiplier: 2.0, damageType: 'physical',
        isCrit: qixiStacks > 0, // 奇袭: 必定暴击
        critMultiplier: source.critDamage / 100,
        dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
        takenBonus: target.takenBonus, takenReduction: target.takenReduction,
        ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
      };
      const result = calculateDamage(ctx, state);
      applyDamage(result, target, source, state);
      recordDamage(source, target, result.finalDamage, state);
      // 消耗1层奇袭
      if (qixiStacks > 0) {
        target.customState['qixi_stacks'] = qixiStacks - 1;
      }
    }
  }
}

function handleYacibibao(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 睚眦必报: 我方释放准备战法时40%概率跳过准备
  if (!extraArgs?.targetId) return;
  if (rollChance(50)) {
    const target = getAllyAlive(state, source.side).find(g => g.generalId === extraArgs.targetId);
    if (!target) return;
    target.customState['skip_preparation'] = 1;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `睚眦必报: ${target.name} 跳过准备回合！`,
      sourceGeneralId: source.generalId,
      targetGeneralId: target.generalId,
    });
  }
}

function handleTaoyuanjieyi(source: BattleGeneral, state: BattleState): void {
  // 桃园结义: 战斗开始我方全体统帅+20
  const allies = getAllyAlive(state, source.side);
  for (const ally of allies) {
    ally.defBonusPercent += (20 / ally.baseAttributes.def) * 100;
    refreshEffectiveAttributes(ally);
  }
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `桃园结义: 我方全体统帅+20`,
    sourceGeneralId: source.generalId,
  });

  // 每回合结束时回复全体 + 生命最低额外回复
  if (state.phase === 'round_end') {
    for (const ally of allies) {
      if (!ally.isAlive) continue;
      const rawHeal = Math.round(source.effectiveAttributes.int * 1.0);
      const { effectiveHeal } = clampHealing(ally, rawHeal);
      ally.currentHp = Math.min(ally.maxHp, ally.currentHp + effectiveHeal);
      eventBus.emit('heal:applied', ally, effectiveHeal, source.name, state);
      recordHeal(source, effectiveHeal, state);
    }
    const lowest = allies.filter(g => g.isAlive).reduce((a, b) =>
      (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
    );
    if (lowest) {
      const rawExtraHeal = Math.round(source.effectiveAttributes.int * 0.5);
      const { effectiveHeal: effExtra } = clampHealing(lowest, rawExtraHeal);
      lowest.currentHp = Math.min(lowest.maxHp, lowest.currentHp + effExtra);
      recordHeal(source, effExtra, state);
    }
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'heal',
      message: `桃园结义: 回复我方全体生命`,
      sourceGeneralId: source.generalId,
    });
  }
}

function handleXiandeng(source: BattleGeneral, state: BattleState): void {
  // 先登: 战斗开始时提升我方全体40速度，速度最高武将增伤+20%、减伤+20%
  const allies = getAllyAlive(state, source.side);
  for (const ally of allies) {
    ally.spdBonusPercent += (40 / ally.baseAttributes.spd) * 100;
    refreshEffectiveAttributes(ally);
  }
  const fastest = allies.reduce((a, b) => a.effectiveAttributes.spd > b.effectiveAttributes.spd ? a : b);
  fastest.damageBonus += 20;
  fastest.damageReduction += 20;
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `先登: 我方全体速度+40，${fastest.name}增伤+20%、减伤+20%`,
    sourceGeneralId: source.generalId,
  });
}

function handleGuruojintang(source: BattleGeneral, state: BattleState): void {
  // 固若金汤: 前三回合敌方造成伤害-40%，第四回合开始我方最高属性+10%、增伤+15%
  if (state.roundNumber <= 3 && !source.customState['guruo_active']) {
    const enemies = getEnemyAlive(state, source.side);
    for (const enemy of enemies) {
      enemy.damageBonus = Math.max(-100, enemy.damageBonus - 40);
    }
    source.customState['guruo_active'] = 1;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `固若金汤: 敌方全体增伤-40%(前三回合)`,
      sourceGeneralId: source.generalId,
    });
  } else if (state.roundNumber >= 4 && source.customState['guruo_active'] === 1) {
    // 第四回合：恢复敌方增伤
    const enemies = getEnemyAlive(state, source.side);
    for (const enemy of enemies) {
      enemy.damageBonus += 40;
    }
    source.customState['guruo_active'] = 0;
    // 第四回合开始：我方buff
    const allies = getAllyAlive(state, source.side);
    for (const ally of allies) {
      ally.atkBonusPercent += 10;
      ally.intBonusPercent += 10;
      ally.defBonusPercent += 10;
      ally.spdBonusPercent += 10;
      ally.damageBonus += 15;
      refreshEffectiveAttributes(ally);
    }
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `固若金汤: 第四回合开始，敌方增伤恢复，我方全体最高属性+10%、增伤+15%`,
      sourceGeneralId: source.generalId,
    });
  }
}

function handleXianzhenzhizhi(source: BattleGeneral, state: BattleState): void {
  // 陷阵之志: 敌方全体施加弱点(每人10层，共用池)，我方减伤+60%
  const enemies = getEnemyAlive(state, source.side);
  const totalStacks = enemies.length * 10;
  source.customState['weakness_pool'] = totalStacks;
  source.customState['weakness_total'] = totalStacks;
  const allies = getAllyAlive(state, source.side);
  for (const ally of allies) {
    ally.damageReduction += 60;
  }
  source.customState['xianzhen_active'] = 1;
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `陷阵之志: 敌方全体施加${totalStacks}层弱点(${enemies.length}人×10)，我方全体减伤+60%`,
    sourceGeneralId: source.generalId,
  });
}

function handleBiyue(source: BattleGeneral, state: BattleState): void {
  // 闭月: 每回合开始，我方武力最高单体获得连击+骁勇
  const allies = getAllyAlive(state, source.side);
  if (allies.length === 0) return;
  const highestAtk = allies.reduce((a, b) => a.effectiveAttributes.atk > b.effectiveAttributes.atk ? a : b);
  applyFunctionalBuffWithTrigger(highestAtk, 'double_strike', state, source.generalId);
  // 骁勇: 每次普攻后提升5武力(上限20层)
  highestAtk.customState['xiaoyong_stacks'] = 0;
  applyBuff(highestAtk, 'xiaoyong', '骁勇', 1, 1, state, source.generalId);
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `闭月: ${highestAtk.name} 获得连击+骁勇`,
    sourceGeneralId: source.generalId,
  });
}

function handleQuanyujiangdong(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 权御江东: 我方每回合首次释放主动战法时触发
  if (!extraArgs?.skillId) return;
  if (state.roundNumber % 2 === 1) {
    // 奇数回合: 回复全体120%智力生命
    const allies = getAllyAlive(state, source.side);
    for (const ally of allies) {
      const rawHeal = Math.round(source.effectiveAttributes.int * 1.2);
      const { effectiveHeal } = clampHealing(ally, rawHeal);
      ally.currentHp = Math.min(ally.maxHp, ally.currentHp + effectiveHeal);
      eventBus.emit('heal:applied', ally, effectiveHeal, source.name, state);
      recordHeal(source, effectiveHeal, state);
    }
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `权御江东(奇数): 回复我方全体生命`,
      sourceGeneralId: source.generalId,
    });
  } else {
    // 偶数回合: 令其额外释放一次
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `权御江东(偶数): 额外释放一次主动战法`,
      sourceGeneralId: source.generalId,
    });
  }
}

function handleHuoshaochibi(source: BattleGeneral, state: BattleState, _extraArgs?: Record<string, any>): void {
  // 火烧赤壁: 每次触发后概率递减10%，从60%开始
  const triggeredCount = source.customState['chibi_triggered'] ?? 0;
  const currentRate = Math.max(10, 60 - triggeredCount * 10);
  if (!rollChance(currentRate)) {
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'skill',
      message: `火烧赤壁: 概率判定失败 (当前${currentRate}%)`,
      sourceGeneralId: source.generalId,
    });
    return;
  }
  source.customState['chibi_triggered'] = triggeredCount + 1;
  eventBus.addLog({
    roundNumber: state.roundNumber, type: 'skill',
    message: `火烧赤壁触发! (当前概率${currentRate}%，已触发${source.customState['chibi_triggered']}次)`,
    sourceGeneralId: source.generalId,
  });
  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const ctx: DamageContext = {
      attacker: source, defender: enemy, baseMultiplier: 0.8, damageType: 'magical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);
    applyDotEffect(enemy, source, 0.6, 2, state);
  }
}

// ========== 被动战法实现 ==========

function handleShenweitainjiangjun(source: BattleGeneral, _state: BattleState, extraArgs?: Record<string, any>): void {
  // 神威天将军: 普攻后速度+5%
  if (extraArgs?.triggerType === 'after_attack') {
    source.spdBonusPercent += 5;
    refreshEffectiveAttributes(source);
  }
}

function handleShensu(source: BattleGeneral, state: BattleState): void {
  // 神速: 每回合开始武力提升当前速度的25%
  const spdBonus = Math.round(source.effectiveAttributes.spd * 0.25);
  source.atkBonusPercent += 25; // Approximate: boost atk
  refreshEffectiveAttributes(source);
  source.customState['shensu_atk_bonus'] = spdBonus;

  // 对敌方全体造成120%武力伤害
  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const spdDiff = source.effectiveAttributes.spd - enemy.effectiveAttributes.spd;
    const bonusMult = spdDiff > 0 ? 1.3 : 1.0;
    const ctx: DamageContext = {
      attacker: source, defender: enemy, baseMultiplier: 1.2, damageType: 'physical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
      bonusMultiplier: bonusMult,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);
  }
}

function handleGuzhielai(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 古之恶来: 战斗开始时统帅+40
  if (state.phase === 'battle_start' || state.phase === 'not_started') {
    source.defBonusPercent += (40 / source.baseAttributes.def) * 100;
    refreshEffectiveAttributes(source);
    source.customState['elai_stacks'] = 0;
    source.customState['elai_counter_count'] = 0;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `古之恶来: ${source.name} 统帅+40`,
      sourceGeneralId: source.generalId,
    });
    return;
  }

  // 受到普攻时获得恶来并反击
  if (extraArgs?.triggerType === 'on_hit_by_normal') {
    const count = source.customState['elai_counter_count'] ?? 0;
    if (count >= 5) return; // 每回合上限5次

    const stacks = Math.min(5, (source.customState['elai_stacks'] ?? 0) + 1);
    source.customState['elai_stacks'] = stacks;
    source.customState['elai_counter_count'] = count + 1;
    source.atkBonusPercent += 5;
    source.counterDamageBonus += 10;
    refreshEffectiveAttributes(source);

    // 反击 (视为普攻，100%武力伤害)
    const attacker = extraArgs?.attacker as BattleGeneral | undefined;
    if (attacker && attacker.isAlive) {
      const ctx: DamageContext = {
        attacker: source, defender: attacker, baseMultiplier: 1.0 * (1 + source.counterDamageBonus / 100),
        damageType: 'physical', isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
        dmgBonus: source.damageBonus, dmgReduction: attacker.damageReduction,
        takenBonus: attacker.takenBonus, takenReduction: attacker.takenReduction,
        ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
      };
      const result = calculateDamage(ctx, state);
      applyDamage(result, attacker, source, state);
      recordDamage(source, attacker, result.finalDamage, state);
    }
  }
}

function handleWeizhenxiaoyao(source: BattleGeneral, state: BattleState): void {
  // 威震逍遥: 回合开始降低敌方全体5%统帅
  if (state.phase === 'round_start') {
    const enemies = getEnemyAlive(state, source.side);
    for (const enemy of enemies) {
      enemy.defBonusPercent -= 5;
      refreshEffectiveAttributes(enemy);
    }
  }

  // 自身行动时对敌方防御最低单体造成260%武力伤害
  if (state.phase === 'turn_processing') {
    const enemies = getEnemyAlive(state, source.side);
    if (enemies.length === 0) return;
    const lowestDef = enemies.reduce((a, b) =>
      a.effectiveAttributes.def < b.effectiveAttributes.def ? a : b
    );
    const ctx: DamageContext = {
      attacker: source, defender: lowestDef, baseMultiplier: 2.6, damageType: 'physical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: lowestDef.damageReduction,
      takenBonus: lowestDef.takenBonus, takenReduction: lowestDef.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, lowestDef, source, state);
    recordDamage(source, lowestDef, result.finalDamage, state);
  }
}

function handleKanpo(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 看破: 敌方释放主动战法时造成200%智力伤害+50%技穷
  if (!extraArgs?.targetId) return;
  const enemies = getEnemyAlive(state, source.side);
  const target = enemies.find(g => g.generalId === extraArgs.targetId);
  if (!target || !target.isAlive) return;

  const ctx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: 2.0, damageType: 'magical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);

  if (rollChance(50)) {
    applyStatus(target, 'silence', '技穷', 1, state, source.generalId);
  }
}

function handleQijinqichu(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 七进七出: 战斗开始时规避率+40%
  if (!source.customState['qijin_dodge_set']) {
    source.dodgeRate = 40;
    source.customState['qijin_dodge_set'] = 1;
    source.customState['qijin_dodge_count'] = 0;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'buff',
      message: `七进七出: ${source.name} 规避率提升至40%，每回合规避上限7次`,
      sourceGeneralId: source.generalId,
    });
  }

  // 成功规避后对敌方两名武将造成80%武力伤害
  if (extraArgs?.triggerType === 'after_dodge') {
    const dodgeCount = source.customState['qijin_dodge_count'] ?? 0;
    if (dodgeCount >= 7) return;
    source.customState['qijin_dodge_count'] = dodgeCount + 1;

    const enemies = [...getEnemyAlive(state, source.side)].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      const ctx: DamageContext = {
        attacker: source, defender: enemy, baseMultiplier: 0.8, damageType: 'physical',
        isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
        dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
        takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
        ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
      };
      const result = calculateDamage(ctx, state);
      applyDamage(result, enemy, source, state);
      recordDamage(source, enemy, result.finalDamage, state);
    }
  }
}

function handleWangzuo(source: BattleGeneral, state: BattleState): void {
  // 王佐: 战斗开始我方智力最高武将暴击率+40%、暴击伤害+40%
  const allies = getAllyAlive(state, source.side);
  if (allies.length === 0) return;
  const highestInt = allies.reduce((a, b) => a.effectiveAttributes.int > b.effectiveAttributes.int ? a : b);
  highestInt.critRate += 40;
  highestInt.critDamage += 40;
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `王佐: ${highestInt.name} 暴击率+40%、暴击伤害+40%`,
    sourceGeneralId: source.generalId,
    targetGeneralId: highestInt.generalId,
  });
}

function handleLuanshixiaoxiong(source: BattleGeneral, state: BattleState): void {
  // 乱世枭雄: 仅战斗开始时我方全体减伤+15%
  const allies = getAllyAlive(state, source.side);
  for (const ally of allies) {
    ally.customState['guixin_stacks'] = ally.customState['guixin_stacks'] ?? 0;
  }

  if (state.phase === 'battle_start') {
    // 减伤仅首次生效
    for (const ally of allies) {
      ally.damageReduction += 15;
    }
    // 首回合为我方全体施加1层归心
    for (const ally of allies) {
      ally.customState['guixin_stacks'] = Math.min(2, (ally.customState['guixin_stacks'] ?? 0) + 1);
    }
  } else if (state.phase === 'round_end') {
    // 每回合结束为生命最低武将施加1层归心
    const lowest = allies.filter(g => g.isAlive).reduce((a, b) =>
      (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
    );
    if (lowest) {
      lowest.customState['guixin_stacks'] = Math.min(2, (lowest.customState['guixin_stacks'] ?? 0) + 1);
    }
  }
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'buff',
    message: `乱世枭雄: 我方全体减伤+15%`,
    sourceGeneralId: source.generalId,
  });
}

function handleGanglie(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 刚烈: 受到伤害时反击(100%武力+100%防御)
  if (!extraArgs?.attackerId) return;
  if ((source.customState['ganglie_count'] ?? 0) >= 4) return;

  const enemies = getEnemyAlive(state, source.side);
  const attacker = enemies.find(g => g.generalId === extraArgs.attackerId);
  if (!attacker || !attacker.isAlive) return;

  source.customState['ganglie_count'] = (source.customState['ganglie_count'] ?? 0) + 1;

  const counterMult = 1.0 + source.effectiveAttributes.def / source.effectiveAttributes.atk;
  const ctx: DamageContext = {
    attacker: source, defender: attacker,
    baseMultiplier: counterMult, damageType: 'physical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: attacker.damageReduction,
    takenBonus: attacker.takenBonus, takenReduction: attacker.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, attacker, source, state);
  recordDamage(source, attacker, result.finalDamage, state);

  // 目标增伤降低10%
  attacker.damageBonus -= 10;
}

function handleWuqian(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  // 无前: 敌方即将行动时若吕布武力高于对方则立即普攻一次
  if (!extraArgs?.targetId) return;
  if ((source.customState['wuqian_count'] ?? 0) >= 3) return;

  const enemies = getEnemyAlive(state, source.side);
  const target = enemies.find(g => g.generalId === extraArgs.targetId);
  if (!target || !target.isAlive) return;

  if (source.effectiveAttributes.atk > target.effectiveAttributes.atk) {
    source.customState['wuqian_count'] = (source.customState['wuqian_count'] ?? 0) + 1;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `无前: ${source.name} 对 ${target.name} 先制攻击！`,
      sourceGeneralId: source.generalId,
      targetGeneralId: target.generalId,
    });

    // 执行普攻(指定目标，非随机)
    const ctx: DamageContext = {
      attacker: source, defender: target, baseMultiplier: 1.0, damageType: 'physical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
      takenBonus: target.takenBonus, takenReduction: target.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, target, source, state);
    recordDamage(source, target, result.finalDamage, state);
    // 记录普攻次数
    const statsMap = source.side === 'player' ? state.playerSkillStats : state.enemySkillStats;
    if (!statsMap[source.generalId]) {
      statsMap[source.generalId] = { normalAttack: { damage: 0, count: 0 }, skills: {} };
    }
    statsMap[source.generalId].normalAttack.count++;

    // 处理弱点消耗 (普攻触发)
    if (target.isAlive) {
      processWeakness(target, state);
    }

    // 触发追击战法
    const pursuitSkills = getPursuitSkills(source);
    for (const pSkill of pursuitSkills) {
      const effectiveRate = pSkill.activationRate + source.activeSkillRateBonus;
      if (rollChance(effectiveRate)) {
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'skill',
          message: `${source.name} 触发追击: ${pSkill.name}`,
          sourceGeneralId: source.generalId,
        });
        eventBus.emit('skill:trigger', source, pSkill.id, pSkill.name, state);
        resolveSkill(pSkill, source, state, { triggerType: 'after_attack' });
      } else {
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'skill',
          message: `${source.name} 的 ${pSkill.name} 因概率发动失败 (发动率${effectiveRate}%)`,
          sourceGeneralId: source.generalId,
        });
      }
    }

    // 马超神威天将军: 普攻后速度+5%
    if (source.generalId === 'machao' && source.isAlive) {
      const machaoSkill = getSkillById('shenweitainjiangjun');
      if (machaoSkill) resolveSkill(machaoSkill, source, state, { triggerType: 'after_attack' });
    }
  }
}

// ========== 主动战法实现 ==========

function handleYingshilanggu(source: BattleGeneral, state: BattleState): void {
  // 鹰视狼顾: 对敌方两人造成10%+回合数×40%智力伤害
  const enemies = [...getEnemyAlive(state, source.side)].sort(() => Math.random() - 0.5).slice(0, 2);
  const multiplier = 0.1 + state.roundNumber * 0.4;
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const ctx: DamageContext = {
      attacker: source, defender: enemy, baseMultiplier: multiplier, damageType: 'magical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);
  }
  // 每回合结束提升智力+攻心 (在round_end时额外调用)
}

function handleShuiyanqijun(source: BattleGeneral, state: BattleState): void {
  // 水淹七军: 对敌方全体施加洪水+造成360%武力伤害
  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    applyDebuff(enemy, 'flood', '洪水', 2, 1, state, source.generalId);
    // 若已有洪水则额外造成150%附加伤害
    if (enemy.floodStacks > 1) {
      const ctx: DamageContext = {
        attacker: source, defender: enemy, baseMultiplier: 3.6, damageType: 'physical',
        isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
        dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
        takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
        ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
      };
      const result = calculateDamage(ctx, state);
      applyDamage(result, enemy, source, state);
      recordDamage(source, enemy, result.finalDamage, state);
      // 额外附加伤害
      const addDmg = Math.round(source.effectiveAttributes.atk * 2.0);
      enemy.currentHp = Math.max(0, enemy.currentHp - addDmg);
      if (enemy.currentHp <= 0) enemy.isAlive = false;
    } else {
      const ctx: DamageContext = {
        attacker: source, defender: enemy, baseMultiplier: 3.6, damageType: 'physical',
        isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
        dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
        takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
        ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
      };
      const result = calculateDamage(ctx, state);
      applyDamage(result, enemy, source, state);
      recordDamage(source, enemy, result.finalDamage, state);
    }
  }
}

function handleFuhaipingshan(source: BattleGeneral, state: BattleState): void {
  // 覆海平山: 对敌方全体造成140%武力伤害，随释放次数增强
  const castCount = (source.customState['fuhaipingshan_count'] ?? 0) + 1;
  source.customState['fuhaipingshan_count'] = castCount;
  let multiplier = 1.4;
  if (castCount >= 3) multiplier += 0.4;
  if (castCount >= 5) source.hasArmorBreak = true;

  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    if (castCount >= 4) enemy.takenBonus += 30; // 受到武力伤害+30%
    const ctx: DamageContext = {
      attacker: source, defender: enemy, baseMultiplier: multiplier, damageType: 'physical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);
  }
}

function handleJushuiduanqiao(source: BattleGeneral, state: BattleState): void {
  // 据水断桥: 对敌方全体施加畏惧+造成180%武力伤害
  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    applyDebuff(enemy, 'fear', '畏惧', 1, 1, state, source.generalId);
    // 若目标有洪水则无视40%防御
    const ignoreDef = enemy.floodStacks > 0 ? true : source.hasArmorBreak;
    const ctx: DamageContext = {
      attacker: source, defender: enemy, baseMultiplier: 2.0, damageType: 'physical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: ignoreDef, ignoreDmgReduction: source.hasFormationBreak,
    };
    if (enemy.floodStacks > 0) {
      ctx.bonusMultiplier = 1.4; // 无视40%防御 ≈ 1.4倍伤害
    }
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);
  }
}

function handleWuleihongding(source: BattleGeneral, state: BattleState): void {
  // 五雷轰顶: 对随机目标造成5次180%智力伤害
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  for (let i = 0; i < 5; i++) {
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    if (!target.isAlive) continue;
    const multiplier = target.floodStacks > 0 ? 2.7 : 1.8; // 洪水时+50%
    const ctx: DamageContext = {
      attacker: source, defender: target, baseMultiplier: multiplier, damageType: 'magical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
      takenBonus: target.takenBonus, takenReduction: target.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, target, source, state);
    recordDamage(source, target, result.finalDamage, state);
  }
}

function handleHuoshaolianying(source: BattleGeneral, state: BattleState): void {
  // 火烧连营: 对敌方全体造成280%智力伤害+结算灼烧
  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const ctx: DamageContext = {
      attacker: source, defender: enemy, baseMultiplier: 2.8, damageType: 'magical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);

    // 结算灼烧伤害(不清除层数)
    const burnStacks = enemy.buffs.filter(b => b.id === 'burn').reduce((sum, b) => sum + b.stacks, 0);
    if (burnStacks > 0) {
      const burnDmgPerStack = (enemy.customState['burn_damage']) ?? 0;
      const burnSourceId = enemy.burnSourceId ?? '';
      const burnSourceName = enemy.burnSourceName ?? '未知';
      const totalDmg = Math.round(burnDmgPerStack * burnStacks);
      if (totalDmg > 0) {
        // 伤害归属灼烧施加者
        if (burnSourceId) {
          const burnSource = (enemy.side === 'player'
            ? state.enemyTeam.generals
            : state.playerTeam.generals).find(g => g.generalId === burnSourceId);
          if (burnSource) {
            recordDamage(burnSource, enemy, totalDmg, state);
          }
        }
        enemy.currentHp = Math.max(0, enemy.currentHp - totalDmg);
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'damage',
          message: `火烧连营结算: ${enemy.name} 受到 ${totalDmg} 点灼烧伤害 (${burnStacks}层，源自${burnSourceName})`,
          targetGeneralId: enemy.generalId,
          sourceGeneralId: burnSourceId || undefined,
        });
        if (enemy.currentHp <= 0) {
          enemy.isAlive = false;
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'death',
            message: `${enemy.name} 被灼烧吞噬！`,
            targetGeneralId: enemy.generalId,
          });
          eventBus.emit('general:died', enemy, state);
        }
      }
    }
  }
}

// ========== 主动战法特殊处理 ==========

function handleShishengshibai(source: BattleGeneral, state: BattleState): void {
  // 十胜十败: 对敌方单体造成400%智力伤害，若暴击则再次发动(每回合限3次)
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  if (!target || !target.isAlive) return;

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'skill',
    message: `十胜十败: ${source.name} 对 ${target.name} 造成400%智力伤害`,
    sourceGeneralId: source.generalId,
    targetGeneralId: target.generalId,
  });
  eventBus.emit('skill:trigger', source, 'shishengshibai', '十胜十败', state);

  const ctx: DamageContext = {
    attacker: source, defender: target,
    baseMultiplier: 4.0, damageType: 'magical',
    isCrit: source.hasInsight,
    critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus,
    dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus,
    takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak,
    ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);

  // 暴击时再次发动
  const count = (source.customState['shishengshibai_count'] ?? 0);
  if (result.isCrit && count < 3 && target.isAlive && source.isAlive) {
    source.customState['shishengshibai_count'] = count + 1;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `十胜十败暴击! 再次发动(${count + 1}/3)`,
      sourceGeneralId: source.generalId,
    });
    const skill = getSkillById('shishengshibai');
    if (skill) resolveSkill(skill, source, state);
  }
}

// ========== 追击战法实现 ==========

function handleZiqilvli(source: BattleGeneral, state: BattleState, _extraArgs?: Record<string, any>): void {
  // 姿器膂力: 普攻后随机获得功能性增益，对目标造成380%武力伤害
  const owned = getOwnedFunctionalBuffs(source);
  const newBuff = getRandomFunctionalBuff(owned);
  applyFunctionalBuffWithTrigger(source, newBuff, state, source.generalId, 99); // 永久增益

  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  if (!target.isAlive) return;
  const ctx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: 3.8, damageType: 'physical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);
}

function handleBaibuchuanyang(source: BattleGeneral, state: BattleState, _extraArgs?: Record<string, any>): void {
  // 百步穿杨: 提升20%暴击率(可叠加，上限100%)，对目标造成360%武力伤害
  const baibuStacks = Math.min((source.customState['baibu_crit_stacks'] ?? 0) + 1, 5);
  source.customState['baibu_crit_stacks'] = baibuStacks;
  source.critRate = (source.critRate - (baibuStacks - 1) * 20) + baibuStacks * 20;
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  if (!target.isAlive) return;
  const ctx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: 3.6, damageType: 'physical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);
}

function handleZhengqing(source: BattleGeneral, state: BattleState, _extraArgs?: Record<string, any>): void {
  // 争擎: 目标和自身防御各降20，造成240%武力伤害
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  if (!target.isAlive) return;
  target.defBonusPercent -= (20 / target.baseAttributes.def) * 100;
  source.defBonusPercent -= (20 / source.baseAttributes.def) * 100;
  refreshEffectiveAttributes(target);
  refreshEffectiveAttributes(source);

  const ctx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: 2.4, damageType: 'physical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);
}

function handleJieying(source: BattleGeneral, state: BattleState, _extraArgs?: Record<string, any>): void {
  // 劫营: 造成400%武力伤害+断粮(降低回复70%)
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  if (!target.isAlive) return;
  target.customState['duanliang'] = 1; // 断粮标记
  const ctx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: 4.0, damageType: 'physical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);
}

// ========== 通用被动战法实现 ==========

function handleHuixin(source: BattleGeneral, _state: BattleState): void {
  source.critRate += 20;
  source.customState['huixin_round_bonus'] = 0;
}

function handleFange(source: BattleGeneral, _state: BattleState, _extraArgs?: Record<string, any>): void {
  source.counterDamageBonus += 40;
}

function handleLianpo(source: BattleGeneral, state: BattleState): void {
  if (rollChance(70)) {
    applyFunctionalBuffWithTrigger(source, 'double_strike', state, source.generalId);
  }
}

function handleRuibukedang(source: BattleGeneral, _state: BattleState): void {
  source.damageBonus += 40;
}

function handleTaoguangyanghui(source: BattleGeneral, _state: BattleState): void {
  source.activeSkillRateBonus += 15;
  source.damageBonus += 20; // 主动战法增伤
}

function handleBingguishensu(source: BattleGeneral, _state: BattleState): void {
  source.spdBonusPercent += (20 / source.baseAttributes.spd) * 100;
  refreshEffectiveAttributes(source);
}

function handleSheshengquyi(source: BattleGeneral, state: BattleState): void {
  // 舍生取义: 自身增伤-40%，我方武力最高增伤+30%
  source.damageBonus -= 40;
  const allies = getAllyAlive(state, source.side).filter(g => g.generalId !== source.generalId);
  if (allies.length === 0) return;
  const highestAtk = allies.reduce((a, b) => a.effectiveAttributes.atk > b.effectiveAttributes.atk ? a : b);
  highestAtk.damageBonus += 30;
}

// ======================== 回合处理 ========================

// 处理灼烧等DoT效果 (目标回合开始时触发)
export function processDotEffects(general: BattleGeneral, state: BattleState): void {
  const burnBuffs = general.buffs.filter(b => b.id === 'burn');
  if (burnBuffs.length > 0) {
    const burnDmgPerStack = (general.customState['burn_damage']) ?? Math.round(general.effectiveAttributes.atk * 0.6);
    const sourceId = general.burnSourceId ?? '';
    const sourceName = general.burnSourceName ?? '未知';
    const totalDmg = burnDmgPerStack * burnBuffs.length;

    general.currentHp = Math.max(0, general.currentHp - totalDmg);

    // 灼烧伤害归属施加者
    if (sourceId) {
      const source = (general.side === 'player'
        ? state.enemyTeam.generals
        : state.playerTeam.generals).find(g => g.generalId === sourceId);
      if (source) {
        recordDamage(source, general, totalDmg, state);
      }
    }

    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'damage',
      message: `${general.name} 受到 ${totalDmg} 点灼烧伤害 (${burnBuffs.length}层，源自${sourceName})`,
      targetGeneralId: general.generalId,
      sourceGeneralId: sourceId || undefined,
    });
    if (general.currentHp <= 0) {
      general.isAlive = false;
      eventBus.emit('general:died', general, state);
    }
  }
}

// 处理弱点机制 (受到普攻时)
export function processWeakness(target: BattleGeneral, state: BattleState): void {
  // 找到施加弱点的高顺
  const gaoshunSide = target.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals;
  const gaoshun = gaoshunSide.find(a => a.generalId === 'gaoshun' && a.customState['xianzhen_active']);
  if (!gaoshun) return;

  const pool = gaoshun.customState['weakness_pool'] ?? 0;
  if (pool <= 0) return;
  gaoshun.customState['weakness_pool'] = pool - 1;
  const consumedSoFar = (gaoshun.customState['weakness_total'] ?? 30) - pool;

  const prevAtk = target.effectiveAttributes.atk;
  const prevInt = target.effectiveAttributes.int;
  const prevDef = target.effectiveAttributes.def;
  const prevSpd = target.effectiveAttributes.spd;

  // 降低当前属性的3%
  target.atkBonusPercent -= (target.effectiveAttributes.atk * 0.03 / Math.max(1, target.baseAttributes.atk)) * 100;
  target.intBonusPercent -= (target.effectiveAttributes.int * 0.03 / Math.max(1, target.baseAttributes.int)) * 100;
  target.defBonusPercent -= (target.effectiveAttributes.def * 0.03 / Math.max(1, target.baseAttributes.def)) * 100;
  target.spdBonusPercent -= (target.effectiveAttributes.spd * 0.03 / Math.max(1, target.baseAttributes.spd)) * 100;
  refreshEffectiveAttributes(target);

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'debuff',
    message: `弱点触发(${consumedSoFar + 1}/30): ${target.name} 全属性降低3% (武力${prevAtk}→${target.effectiveAttributes.atk} 智力${prevInt}→${target.effectiveAttributes.int} 统帅${prevDef}→${target.effectiveAttributes.def} 速度${prevSpd}→${target.effectiveAttributes.spd}) [剩余${gaoshun.customState['weakness_pool']}层]`,
    targetGeneralId: target.generalId,
  });

  // 每消耗5层陷入震慑
  if ((consumedSoFar + 1) % 5 === 0) {
    applyStatus(target, 'stun', '震慑', 1, state);
  }

  // 陷阵之志: 每消耗1层弱点我方全体减伤降低2%
  const allies = gaoshun.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
  for (const ally of allies) {
    if (!ally.isAlive) continue;
    ally.damageReduction = Math.max(0, ally.damageReduction - 2);
  }
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'debuff',
    message: `陷阵之志: 我方全体减伤降低2% (当前${gaoshun.damageReduction}%)`,
  });
}

// 处理归心机制 (受到高于当前生命10%的伤害时)
// ========== 新增通用战法实现 ==========

// 断戈夺锋: 前三回合敌方全体增伤-35%
function handleDuangeduofeng(source: BattleGeneral, state: BattleState): void {
  if (state.roundNumber <= 3 && !source.customState['duangef_active']) {
    const enemies = getEnemyAlive(state, source.side);
    for (const enemy of enemies) {
      enemy.damageBonus = Math.max(-100, enemy.damageBonus - 35);
    }
    source.customState['duangef_active'] = 1;
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'skill',
      message: `断戈夺锋: 敌方全体增伤-35%(前三回合)`,
      sourceGeneralId: source.generalId,
    });
  } else if (state.roundNumber >= 4 && source.customState['duangef_active'] === 1) {
    const enemies = getEnemyAlive(state, source.side);
    for (const enemy of enemies) {
      enemy.damageBonus += 35;
    }
    source.customState['duangef_active'] = 0;
  }
}

// 蓄势待发: 每回合我方全体增伤+8%
function handleXushidaifa(source: BattleGeneral, state: BattleState): void {
  const allies = getAllyAlive(state, source.side);
  for (const ally of allies) {
    ally.damageBonus += 8;
  }
  eventBus.addLog({
    roundNumber: state.roundNumber, type: 'skill',
    message: `蓄势待发: 我方全体增伤+8%`,
    sourceGeneralId: source.generalId,
  });
}

// 全军出击: 前三回合我方全体增伤+30%
function handleQuanjunchuji(source: BattleGeneral, state: BattleState): void {
  if (state.roundNumber <= 3 && !source.customState['quanjun_active']) {
    const allies = getAllyAlive(state, source.side);
    for (const ally of allies) {
      ally.damageBonus += 30;
    }
    source.customState['quanjun_active'] = 1;
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'skill',
      message: `全军出击: 我方全体增伤+30%(前三回合)`,
      sourceGeneralId: source.generalId,
    });
  } else if (state.roundNumber >= 4 && source.customState['quanjun_active'] === 1) {
    const allies = getAllyAlive(state, source.side);
    for (const ally of allies) {
      ally.damageBonus -= 30;
    }
    source.customState['quanjun_active'] = 0;
  }
}

function handleYuanmenSheji(source: BattleGeneral, state: BattleState, _extraArgs?: Record<string, any>): void {
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  if (!target.isAlive) return;

  let mult = 2.6;
  if (source.effectiveAttributes.atk > target.effectiveAttributes.atk) {
    mult *= 1.4;
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'skill',
      message: `辕门射戟: ${source.name} 武力高于 ${target.name}，伤害提升40%`,
      sourceGeneralId: source.generalId, targetGeneralId: target.generalId,
    });
  }
  const ctx: DamageContext = {
    attacker: source, defender: target, baseMultiplier: mult, damageType: 'physical',
    isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus, dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus, takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);
}

function handleWenwuShuangquan(source: BattleGeneral, _state: BattleState): void {
  // 文武双全: battle_start 设置标记，实际效果在 recordDamage 中触发
  source.customState['wenwu_enabled'] = 1;
  source.customState['wenwu_atk_stacks'] = 0;
  source.customState['wenwu_int_stacks'] = 0;
}

function handleKeji(source: BattleGeneral, state: BattleState): void {
  // 克己: 无法普攻
  source.customState['keji_no_attack'] = 1;
  // 自身最高属性+50
  const attrs = [
    { key: 'atk' as const, val: source.effectiveAttributes.atk },
    { key: 'int' as const, val: source.effectiveAttributes.int },
    { key: 'def' as const, val: source.effectiveAttributes.def },
    { key: 'spd' as const, val: source.effectiveAttributes.spd },
  ];
  attrs.sort((a, b) => b.val - a.val);
  const highest = attrs[0].key;
  switch (highest) {
    case 'atk': source.atkBonusPercent += (50 / source.baseAttributes.atk) * 100; break;
    case 'int': source.intBonusPercent += (50 / source.baseAttributes.int) * 100; break;
    case 'def': source.defBonusPercent += (50 / source.baseAttributes.def) * 100; break;
    case 'spd': source.spdBonusPercent += (50 / source.baseAttributes.spd) * 100; break;
  }
  source.damageBonus += 10;
  source.damageReduction += 10;
  refreshEffectiveAttributes(source);
  eventBus.addLog({
    roundNumber: state.roundNumber, type: 'skill',
    message: `克己: ${source.name} 无法普攻，${highest === 'atk' ? '武力' : highest === 'int' ? '智力' : highest === 'def' ? '统帅' : '速度'}+50，增伤+10%，减伤+10%`,
    sourceGeneralId: source.generalId,
  });
}

function handleMingQiXuShi(source: BattleGeneral, state: BattleState): void {
  const enemies = [...getEnemyAlive(state, source.side)].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    // 偷取30智力 (不可叠加，刷新持续)
    const stolen = enemy.customState['mingqi_stolen'] ?? 0;
    if (stolen === 0) {
      enemy.intBonusPercent -= (30 / enemy.baseAttributes.int) * 100;
      source.intBonusPercent += (30 / source.baseAttributes.int) * 100;
      enemy.customState['mingqi_stolen'] = 30;
      enemy.customState['mingqi_duration'] = 2;
    } else {
      enemy.customState['mingqi_duration'] = 2; // 刷新持续
    }
    refreshEffectiveAttributes(enemy);
    refreshEffectiveAttributes(source);
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'skill',
      message: `明其虚实: ${source.name} 偷取 ${enemy.name} 30智力${stolen > 0 ? '(刷新持续)' : ''}`,
      sourceGeneralId: source.generalId, targetGeneralId: enemy.generalId,
    });
    // 造成260%智力伤害
    const ctx: DamageContext = {
      attacker: source, defender: enemy, baseMultiplier: 2.0, damageType: 'magical',
      isCrit: source.hasInsight, critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus, dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
      ignoreDefense: source.hasArmorBreak, ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);
  }
}

// 文武双全效果触发 (在 recordDamage 之后调用)
export function triggerWenwuShuangquan(source: BattleGeneral, state: BattleState): void {
  if (!source.customState['wenwu_enabled']) return;
  const skillId = state.currentSkillId;
  if (!skillId) return; // 普攻不触发

  const skill = getSkillById(skillId);
  if (!skill) return;

  const hasPhysical = skill.effects?.some(e => e.type === 'damage' && e.damageType === 'physical');
  const hasMagical = skill.effects?.some(e => e.type === 'damage' && e.damageType === 'magical');
  // 自定义技能也检查
  const isPhysicalSkill = hasPhysical || ['zhengqing', 'zhuikan', 'tuci', 'jieying', 'ziqilvli', 'baibuchuanyang', 'yuanmensheji', 'shuiyanqijun', 'fuhaipingshan', 'jushuiduanqiao', 'podi', 'luanwu', 'chuji', 'diukuiqijia', 'qijinqichu', 'shensu', 'guzhielai', 'weizhenxiaoyao'].includes(skillId);
  const isMagicalSkill = hasMagical || ['yingshilanggu', 'wuleihongding', 'huoshaolianying', 'kanpo', 'huxiao', 'kuangfengdazuo', 'dianhuo', 'liaoshirushen', 'mingqixushi'].includes(skillId);

  if (isPhysicalSkill && !isMagicalSkill) {
    const stacks = source.customState['wenwu_int_stacks'] ?? 0;
    if (stacks < 14) {
      source.customState['wenwu_int_stacks'] = stacks + 1;
      source.intBonusPercent += (5 / source.baseAttributes.int) * 100;
      refreshEffectiveAttributes(source);
    }
  } else if (isMagicalSkill && !isPhysicalSkill) {
    const stacks = source.customState['wenwu_atk_stacks'] ?? 0;
    if (stacks < 14) {
      source.customState['wenwu_atk_stacks'] = stacks + 1;
      source.atkBonusPercent += (5 / source.baseAttributes.atk) * 100;
      refreshEffectiveAttributes(source);
    }
  }
}

// 摧锋破敌: 提升敌方统帅最低单体10%受到伤害，随后380%武力伤害
function handleCuifengpodi(source: BattleGeneral, state: BattleState): void {
  const enemies = getEnemyAlive(state, source.side);
  if (enemies.length === 0) return;
  const target = enemies.reduce((a, b) =>
    a.effectiveAttributes.def < b.effectiveAttributes.def ? a : b
  );
  if (!target || !target.isAlive) return;

  // 提升10%受到伤害
  target.takenBonus += 10;
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'debuff',
    message: `摧锋破敌: ${target.name} 受到伤害提升10%(当前${target.takenBonus}%)`,
    sourceGeneralId: source.generalId,
    targetGeneralId: target.generalId,
  });

  // 造成380%武力伤害
  const ctx: DamageContext = {
    attacker: source, defender: target,
    baseMultiplier: 3.8, damageType: 'physical',
    isCrit: source.hasInsight,
    critMultiplier: source.critDamage / 100,
    dmgBonus: source.damageBonus,
    dmgReduction: target.damageReduction,
    takenBonus: target.takenBonus,
    takenReduction: target.takenReduction,
    ignoreDefense: source.hasArmorBreak,
    ignoreDmgReduction: source.hasFormationBreak,
  };
  const result = calculateDamage(ctx, state);
  applyDamage(result, target, source, state);
  recordDamage(source, target, result.finalDamage, state);
}

// 白衣渡江: 获得谋断或消耗谋断
function handleBaiyidujiang(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  if (extraArgs?.triggerType === 'on_damage_taken') {
    // 受到伤害获得谋断
    const stacks = source.customState['moudan_stacks'] ?? 0;
    if (stacks >= 10) return;
    source.customState['moudan_stacks'] = stacks + 1;
    source.intBonusPercent += (10 / source.baseAttributes.int) * 100;
    source.defBonusPercent += (5 / source.baseAttributes.def) * 100;
    refreshEffectiveAttributes(source);
  } else if (extraArgs?.triggerType === 'after_attack') {
    // 普攻后消耗谋断造成伤害
    const stacks = source.customState['moudan_stacks'] ?? 0;
    if (stacks <= 0) return;
    const chainCount = source.customState['moudan_chain'] ?? 0;
    const rate = Math.max(0, 100 - chainCount * 20);
    if (!rollChance(rate)) {
      source.customState['moudan_chain'] = 0;
      return;
    }
    // 消耗一层谋断
    source.customState['moudan_stacks'] = stacks - 1;
    source.intBonusPercent -= (10 / source.baseAttributes.int) * 100;
    source.defBonusPercent -= (5 / source.baseAttributes.def) * 100;
    refreshEffectiveAttributes(source);
    source.customState['moudan_chain'] = chainCount + 1;

    const enemies = getEnemyAlive(state, source.side);
    if (enemies.length === 0) return;
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    if (!target || !target.isAlive) return;

    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'skill',
      message: `白衣渡江: ${source.name} 消耗谋断对 ${target.name} 造成200%智力伤害(概率${rate}%，剩余${source.customState['moudan_stacks']}层)`,
      sourceGeneralId: source.generalId,
      targetGeneralId: target.generalId,
    });

    const ctx: DamageContext = {
      attacker: source, defender: target,
      baseMultiplier: 2.1, damageType: 'magical',
      isCrit: source.hasInsight,
      critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus,
      dmgReduction: target.damageReduction,
      takenBonus: target.takenBonus,
      takenReduction: target.takenReduction,
      ignoreDefense: source.hasArmorBreak,
      ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, target, source, state);
    recordDamage(source, target, result.finalDamage, state);

    // 链式触发
    if (source.customState['moudan_stacks'] > 0 && source.isAlive) {
      const skill = getSkillById('baiyidujiang');
      if (skill) resolveSkill(skill, source, state, { triggerType: 'after_attack' });
    } else {
      source.customState['moudan_chain'] = 0;
    }
  }
}

// 坚壁清野: 统帅+30，每回合60%嘲讽
function handleJianbiqingye(source: BattleGeneral, state: BattleState): void {
  if (state.phase === 'battle_start' && !source.customState['jianbi_active']) {
    source.defBonusPercent += (30 / source.baseAttributes.def) * 100;
    source.customState['jianbi_active'] = 1;
    refreshEffectiveAttributes(source);
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'buff',
      message: `坚壁清野: ${source.name} 统帅+30`,
      sourceGeneralId: source.generalId,
    });
  }
  if (state.phase === 'round_start') {
    if (rollChance(60)) {
      const enemies = getEnemyAlive(state, source.side);
      for (const enemy of enemies) {
        enemy.customState['taunt'] = 1;
      }
      eventBus.addLog({
        roundNumber: state.roundNumber,
        type: 'debuff',
        message: `坚壁清野: 嘲讽敌方全体!`,
        sourceGeneralId: source.generalId,
      });
    }
  }
}

// 贲育: 暴击时回复+施加伏兵
function handleBenyu(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  if (extraArgs?.triggerType === 'ally_crit') {
    // 我方暴击时，回复全体生命
    const allies = getAllyAlive(state, source.side);
    const healAmount = Math.round(source.effectiveAttributes.int * 0.4);
    for (const ally of allies) {
      if (!ally.isAlive) continue;
      const { effectiveHeal } = clampHealing(ally, healAmount);
      ally.currentHp = Math.min(ally.maxHp, ally.currentHp + effectiveHeal);
    }
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'heal',
      message: `贲育: ${source.name} 回复我方全体${Math.round(source.effectiveAttributes.int * 0.4)}点生命`,
      sourceGeneralId: source.generalId,
    });
  } else if (extraArgs?.triggerType === 'enemy_crit') {
    // 敌方受到暴击时，施加1层伏兵
    if (!extraArgs?.targetId) return;
    const enemies = getEnemyAlive(state, source.side);
    const target = enemies.find(g => g.generalId === extraArgs.targetId);
    if (!target || !target.isAlive) return;
    const stacks = Math.min((target.customState['fubing_stacks'] ?? 0) + 1, 99);
    target.customState['fubing_stacks'] = stacks;
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'debuff',
      message: `贲育: ${target.name} 获得1层伏兵(当前${stacks}层)`,
      sourceGeneralId: source.generalId, targetGeneralId: target.generalId,
    });
  }
}

// 天人之勇: 敌方主动战法/普攻时触发
function handleTianrenzhiyong(source: BattleGeneral, state: BattleState, extraArgs?: Record<string, any>): void {
  const triggerType = extraArgs?.triggerType as string | undefined;
  if (!triggerType) return;

  const allies = getAllyAlive(state, source.side);

  // 应用增益效果 (持续至回合结束)
  if (triggerType === 'enemy_skill') {
    for (const ally of allies) {
      ally.damageReduction += 10;
    }
    source.customState['tianren_dr_added'] = (source.customState['tianren_dr_added'] ?? 0) + 10;
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'buff',
      message: `天人之勇: 敌方释放主动战法，我方全体减伤+10%(当前额外+${source.customState['tianren_dr_added']}%)`,
      sourceGeneralId: source.generalId,
    });
  } else if (triggerType === 'enemy_normal') {
    for (const ally of allies) {
      ally.damageBonus += 10;
    }
    source.customState['tianren_db_added'] = (source.customState['tianren_db_added'] ?? 0) + 10;
    eventBus.addLog({
      roundNumber: state.roundNumber, type: 'buff',
      message: `天人之勇: 敌方普攻，我方全体增伤+10%(当前额外+${source.customState['tianren_db_added']}%)`,
      sourceGeneralId: source.generalId,
    });
  }

  // 60%概率对敌方全体造成250%统帅伤害(每回合限4次)
  const damageCount = source.customState['tianren_damage_count'] ?? 0;
  if (damageCount >= 4) return;
  if (!rollChance(60)) return;
  source.customState['tianren_damage_count'] = damageCount + 1;

  // 统帅伤害: 使用def替代atk作为攻击力
  const originalAtk = source.effectiveAttributes.atk;
  source.effectiveAttributes.atk = source.effectiveAttributes.def;

  const enemies = getEnemyAlive(state, source.side);
  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const ctx: DamageContext = {
      attacker: source, defender: enemy,
      baseMultiplier: 2.5, damageType: 'physical',
      isCrit: source.hasInsight,
      critMultiplier: source.critDamage / 100,
      dmgBonus: source.damageBonus,
      dmgReduction: enemy.damageReduction,
      takenBonus: enemy.takenBonus,
      takenReduction: enemy.takenReduction,
      ignoreDefense: source.hasArmorBreak,
      ignoreDmgReduction: source.hasFormationBreak,
    };
    const result = calculateDamage(ctx, state);
    applyDamage(result, enemy, source, state);
    recordDamage(source, enemy, result.finalDamage, state);
  }

  // 恢复atk
  source.effectiveAttributes.atk = originalAtk;

  eventBus.addLog({
    roundNumber: state.roundNumber, type: 'skill',
    message: `天人之勇: 对敌方全体造成250%统帅伤害(${source.customState['tianren_damage_count']}/4)`,
    sourceGeneralId: source.generalId,
  });
}

// 明其虚实偷取持续回合处理
export function tickMingQiXuShi(generals: BattleGeneral[]): void {
  for (const g of generals) {
    if (!g.isAlive) continue;
    const dur = g.customState['mingqi_duration'];
    if (dur !== undefined && dur > 0) {
      g.customState['mingqi_duration'] = dur - 1;
      if (dur - 1 <= 0) {
        // 返还智力
        g.intBonusPercent += (30 / g.baseAttributes.int) * 100;
        g.customState['mingqi_stolen'] = 0;
        refreshEffectiveAttributes(g);
      }
    }
  }
}

export function processGuixin(target: BattleGeneral, damage: number, state: BattleState): boolean {
  const guixinStacks = target.customState['guixin_stacks'] ?? 0;
  if (guixinStacks <= 0) return false;
  if (damage > target.currentHp * 0.1) {
    target.customState['guixin_stacks'] = guixinStacks - 1;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'buff',
      message: `${target.name} 消耗1层归心，本次伤害降低70%`,
      targetGeneralId: target.generalId,
    });
    return true; // 返回true表示伤害应该降低70%
  }
  return false;
}
