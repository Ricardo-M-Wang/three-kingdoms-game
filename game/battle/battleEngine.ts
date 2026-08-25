import type { BattleState, BattleGeneral, Team } from '../types';
import type { SkillDef } from '../types/skill';
import { computeTurnOrder } from './turnOrder';
import { performNormalAttack, resolveSkill, processDotEffects, processWeakness, tickMingQiXuShi } from './skillResolver';
import { tickAllBuffs, resetRoundDebuffs } from './buffManager';
import { refreshEffectiveAttributes } from './attributeCalculator';
import { eventBus } from './eventBus';
import { rollChance } from '../utils/random';
import { getSkillById } from '../skills';
import { canUseActiveSkill, canNormalAttack } from './statusResolver';
import { MAX_ROUNDS } from '../generals';
import { GENERAL_FACTION } from '../generals/factions';

// 记录回合快照
function snapshotRound(state: BattleState): void {
  const allGenerals = [...state.playerTeam.generals, ...state.enemyTeam.generals];
  const dmgMap = { ...state.playerTotalDamage, ...state.enemyTotalDamage };
  state.roundSnapshots.push({
    round: state.roundNumber,
    generals: allGenerals.map(g => ({
      generalId: g.generalId,
      name: g.name,
      side: g.side,
      hp: Math.max(0, g.currentHp),
      maxHp: g.maxHp,
      accumulatedDamage: dmgMap[g.generalId] ?? 0,
    })),
  });
}

// 初始化战斗状态
export function createBattleState(playerTeam: Team, enemyTeam: Team): BattleState {
  const state: BattleState = {
    phase: 'not_started',
    roundNumber: 0,
    maxRounds: MAX_ROUNDS,
    playerTeam,
    enemyTeam,
    turnOrder: [],
    currentTurnIndex: 0,
    battleLog: [],
    winner: null,
    playerTotalDamage: {},
    enemyTotalDamage: {},
    playerSkillStats: {},
    enemySkillStats: {},
    stepCount: 0,
    roundSnapshots: [],
  };

  // 计算所有武将的有效属性
  for (const g of [...playerTeam.generals, ...enemyTeam.generals]) {
    refreshEffectiveAttributes(g);
  }

  return state;
}

// 执行一步战斗 (核心)
export function processBattleStep(state: BattleState): BattleState {
  state.stepCount++;

  switch (state.phase) {
    case 'not_started':
      return initializeBattle(state);

    case 'battle_start':
      return processBattleStart(state);

    case 'round_start':
      return processRoundStart(state);

    case 'turn_processing':
      return processTurn(state);

    case 'round_end':
      return processRoundEnd(state);

    case 'finished':
      return state;
  }
}

// 运行完整战斗 (一步到位)
export function runFullBattle(state: BattleState): BattleState {
  let maxSteps = 10000; // 安全上限
  while (state.phase !== 'finished' && maxSteps > 0) {
    state = processBattleStep(state);
    maxSteps--;
  }
  return state;
}

// 初始化
function initializeBattle(state: BattleState): BattleState {
  state.phase = 'battle_start';
  eventBus.addLog({
    roundNumber: 0,
    type: 'system',
    message: '========== 战斗开始 ==========',
  });
  eventBus.emit('battle:start', state);
  return state;
}

// 战斗开始阶段 - 触发所有 battle_start 条件的指挥/被动战法
function processBattleStart(state: BattleState): BattleState {
  // 触发战斗开始技能
  const allGenerals = [...state.playerTeam.generals, ...state.enemyTeam.generals];

  // 赵云七进七出: 战斗开始时设置规避率 (triggerCondition为on_dodge，需单独处理)
  for (const zhaoyun of allGenerals) {
    if (zhaoyun.generalId !== 'zhaoyun' || !zhaoyun.isAlive) continue;
    const qijinSkill = getSkillById('qijinqichu');
    if (qijinSkill) {
      eventBus.emit('skill:trigger', zhaoyun, qijinSkill.id, qijinSkill.name, state);
      resolveSkill(qijinSkill, zhaoyun, state);
    }
  }

  for (const g of allGenerals) {
    if (!g.isAlive) continue;
    // 自带战法
    const innateSkill = getSkillById(g.innateSkillId);
    if (innateSkill && innateSkill.triggerCondition?.type === 'battle_start') {
      eventBus.emit('skill:trigger', g, innateSkill.id, innateSkill.name, state);
      resolveSkill(innateSkill, g, state);
    }
    // 装备战法
    for (const skillId of g.equippedSkillIds) {
      const skill = getSkillById(skillId);
      if (skill && skill.triggerCondition?.type === 'battle_start') {
        eventBus.emit('skill:trigger', g, skill.id, skill.name, state);
        resolveSkill(skill, g, state);
      }
    }
  }

  // 阵营共鸣: 同阵营武将数量加成
  for (const team of [state.playerTeam, state.enemyTeam]) {
    const alive = team.generals.filter(g => g.isAlive);
    if (alive.length < 2) continue;
    // 统计各阵营人数
    const factionCount: Record<string, number> = {};
    for (const g of alive) {
      const faction = GENERAL_FACTION[g.generalId] ?? 'qun';
      factionCount[faction] = (factionCount[faction] ?? 0) + 1;
    }
    // 找最大同阵营人数
    const maxSame = Math.max(...Object.values(factionCount));
    if (maxSame >= 2) {
      const bonus = maxSame === 3 ? 10 : 5;
      const factionNames: Record<string, string> = { wei: '魏', shu: '蜀', wu: '吴', qun: '群' };
      const sameFaction = Object.entries(factionCount).find(([, c]) => c === maxSame)?.[0] ?? '';
      const factionName = factionNames[sameFaction] ?? sameFaction;
      for (const g of alive) {
        g.atkBonusPercent += bonus;
        g.intBonusPercent += bonus;
        g.defBonusPercent += bonus;
        g.spdBonusPercent += bonus;
      }
      eventBus.addLog({
        roundNumber: state.roundNumber,
        type: 'buff',
        message: `阵营共鸣: ${team.owner === 'player' ? '我方' : '敌方'}${maxSame}名${factionName}武将，全体全属性+${bonus}%`,
      });
    }
  }

  // 更新所有属性
  for (const g of allGenerals) {
    refreshEffectiveAttributes(g);
  }

  snapshotRound(state); // 记录第0回合初始状态
  state.phase = 'round_start';
  return state;
}

// 回合开始阶段
function processRoundStart(state: BattleState): BattleState {
  state.roundNumber++;
  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'system',
    message: `---------- 第 ${state.roundNumber} 回合 ----------`,
  });
  eventBus.emit('round:start', state.roundNumber, state);

  // 清除每回合的追踪状态
  resetRoundDebuffs([...state.playerTeam.generals, ...state.enemyTeam.generals]);
  for (const g of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
    if (!g.isAlive) continue;
    g.customState['elai_counter_count'] = 0;
    g.customState['ganglie_count'] = 0;
    g.customState['wuqian_count'] = 0;
    g.customState['shishengshibai_count'] = 0;
    g.customState['taunt'] = 0;
    g.customState['moudan_chain'] = 0;
    g.customState['benyu_fubing_count'] = 0;
    // 夏侯渊神速重置 (回合结束时重置)
    if (g.generalId === 'xiahouyuan') {
      g.customState['shensu_atk_bonus'] = 0;
    }
  }

  // 触发 round_start 条件的战法
  const allGenerals = [...state.playerTeam.generals, ...state.enemyTeam.generals];
  for (const g of allGenerals) {
    if (!g.isAlive) continue;
    const innateSkill = getSkillById(g.innateSkillId);
    if (innateSkill && innateSkill.triggerCondition?.type === 'round_start') {
      eventBus.emit('skill:trigger', g, innateSkill.id, innateSkill.name, state);
      resolveSkill(innateSkill, g, state);
    }
    for (const skillId of g.equippedSkillIds) {
      const skill = getSkillById(skillId);
      if (skill && skill.triggerCondition?.type === 'round_start') {
        eventBus.emit('skill:trigger', g, skill.id, skill.name, state);
        resolveSkill(skill, g, state);
      }
    }
  }

  // 诸葛亮的看破: 重新设置每回合上限
  for (const g of allGenerals) {
    if (g.generalId === 'zhugeliang') {
      g.customState['kanpo_count'] = 0;
    }
    // 指挥战法每回合触发计数重置
    const innate = getSkillById(g.innateSkillId);
    if (innate && innate.type === 'command') {
      g.customState['on_ally_skill_count'] = 0;
      g.customState['on_ally_gain_buff_count'] = 0;
    }
    // 周瑜火烧赤壁: 每回合重置触发次数和概率
    if (g.generalId === 'zhouyu') {
      g.customState['chibi_count'] = 0;
      g.customState['chibi_triggered'] = 0;
    }
    // 法正睚眦必报: 每回合重置触发次数
    if (g.generalId === 'fazheng') {
      g.customState['yaci_count'] = 0;
    }
    // SP曹仁天人之勇: 每回合重置伤害触发次数
    if (g.generalId === 'spcaoren') {
      g.customState['tianren_damage_count'] = 0;
    }
    // 装备指挥战法计数器
    for (const skillId of g.equippedSkillIds) {
      const s = getSkillById(skillId);
      if (s && s.type === 'command') {
        g.customState[`on_ally_${skillId}`] = 0;
      }
    }
    // 权御江东
    if (g.generalId === 'sunquan') {
      g.customState['quanyu_used'] = 0;
    }
    // 连破
    const lianpoSkill = g.equippedSkillIds.find(id => id === 'lianpo');
    if (lianpoSkill) {
      if (rollChance(70)) {
        const skill = getSkillById('lianpo');
        if (skill) resolveSkill(skill, g, state);
      } else {
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'skill',
          message: `${g.name} 的连破因概率发动失败 (发动率70%)`,
          sourceGeneralId: g.generalId,
        });
      }
    }
    // 兵贵神速
    const bingguiSkill = g.equippedSkillIds.find(id => id === 'bingguishensu');
    if (bingguiSkill) {
      const enemies = g.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals;
      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        if (g.effectiveAttributes.spd > enemy.effectiveAttributes.spd) {
          performNormalAttack(g, state);
          triggerSpCaorenSkill(g, state, 'enemy_normal');
        }
      }
    }
  }

  // 坚壁清野: 每回合开始60%概率嘲讽敌方全体
  for (const g of allGenerals) {
    if (!g.isAlive) continue;
    const hasJianbi = g.innateSkillId === 'jianbiqingye' || g.equippedSkillIds.includes('jianbiqingye');
    if (hasJianbi) {
      const jianbiSkill = getSkillById('jianbiqingye');
      if (jianbiSkill) resolveSkill(jianbiSkill, g, state);
    }
  }

  // 邓艾奇袭: 每回合开始时对敌方两人造成伤害（双方独立处理）
  for (const dengai of allGenerals) {
    if (dengai.generalId !== 'dengai' || !dengai.isAlive) continue;
    const qixiSkill = getSkillById('qixi');
    if (qixiSkill) {
      eventBus.emit('skill:trigger', dengai, qixiSkill.id, qixiSkill.name, state);
      resolveSkill(qixiSkill, dengai, state);
    }
  }

  // 计算回合行动顺序
  state.turnOrder = computeTurnOrder(state);
  state.currentTurnIndex = 0;
  state.phase = 'turn_processing';

  return state;
}

// 处理单个武将行动
function processTurn(state: BattleState): BattleState {
  if (state.currentTurnIndex >= state.turnOrder.length) {
    // 所有武将行动完毕，进入回合结束
    state.phase = 'round_end';
    return state;
  }

  const general = state.turnOrder[state.currentTurnIndex];

  // 如果武将已死亡，跳过
  if (!general.isAlive) {
    state.currentTurnIndex++;
    return state;
  }

  // 检查震慑
  if (general.isStunned) {
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'status',
      message: `${general.name} 被震慑，跳过行动`,
      targetGeneralId: general.generalId,
    });
    general.isStunned = false;
    general.statuses = general.statuses.filter(s => s.id !== 'stun');
    state.currentTurnIndex++;
    return state;
  }

  eventBus.emit('turn:start', general, state);

  // 吕布无前: 敌方即将行动时若武力高于对方则立即普攻
  const wuqianGenerals = (general.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals)
    .filter(g => g.generalId === 'lvbu' && g.isAlive);
  for (const lvbu of wuqianGenerals) {
    const wuqianSkill = getSkillById('wuqian');
    if (wuqianSkill && (lvbu.customState['wuqian_count'] ?? 0) < 3) {
      if (lvbu.effectiveAttributes.atk > general.effectiveAttributes.atk) {
        resolveSkill(wuqianSkill, lvbu, state, { targetId: general.generalId });
      }
    }
  }

  // 处理灼烧等DoT效果 (行动时触发)
  processDotEffects(general, state);

  if (!general.isAlive) {
    state.currentTurnIndex++;
    eventBus.emit('turn:end', general, state);
    return state;
  }

  // 0. 触发自身 on_turn 条件的指挥/被动战法
  const onTurnSkills = [getSkillById(general.innateSkillId), ...general.equippedSkillIds.map(id => getSkillById(id))]
    .filter(s => s && s.triggerCondition?.type === 'on_turn');
  for (const s of onTurnSkills) {
    if (!s) continue;
    eventBus.emit('skill:trigger', general, s.id, s.name, state);
    resolveSkill(s, general, state);
  }

  // 1. 主动战法 (遍历所有主动战法，独立判定)
  if (canUseActiveSkill(general)) {
    const activeSkills = getActiveSkills(general);
    let hasActivatedThisTurn = false;

    // 如果正在准备某个战法，只处理它
    const preparingSkillId = general.preparingSkillId;

    for (const skill of activeSkills) {
      // 有准备中的战法时：仅跳过其他准备型战法，非准备型正常判定
      if (preparingSkillId && skill.id !== preparingSkillId) {
        if (skill.needsPreparation) continue; // 其他准备型战法被阻塞
        // 非准备型战法不受影响，继续判定
      }

      // 需要准备的战法逻辑
      if (skill.needsPreparation) {
        if (preparingSkillId === skill.id) {
          // 已准备完毕（通过法正跳过或正常等待），本回合释放
          general.preparingSkillId = undefined;
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'skill',
            message: `${general.name} 释放准备战法: ${skill.name}`,
            sourceGeneralId: general.generalId,
          });
          eventBus.emit('skill:trigger', general, skill.id, skill.name, state);
          resolveSkill(skill, general, state);
          hasActivatedThisTurn = true;
        } else if (!preparingSkillId) {
          // 判定发动率
          const effectiveRate = skill.activationRate + general.activeSkillRateBonus;
          if (!rollChance(effectiveRate)) {
            eventBus.addLog({
              roundNumber: state.roundNumber,
              type: 'skill',
              message: `${general.name} 的 ${skill.name} 因概率发动失败 (发动率${effectiveRate}%)`,
              sourceGeneralId: general.generalId,
            });
            continue;
          }
          // 开始准备
          general.preparingSkillId = skill.id;
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'skill',
            message: `${general.name} 开始准备: ${skill.name}...`,
            sourceGeneralId: general.generalId,
          });
          triggerFazhengSkill(general, state);
          // 法正生效: 跳过准备，立即释放
          if (general.customState['skip_preparation']) {
            general.customState['skip_preparation'] = 0;
            general.preparingSkillId = undefined;
            eventBus.addLog({
              roundNumber: state.roundNumber,
              type: 'skill',
              message: `${general.name} 跳过准备，立即释放准备战法: ${skill.name}`,
              sourceGeneralId: general.generalId,
            });
            eventBus.emit('skill:trigger', general, skill.id, skill.name, state);
            resolveSkill(skill, general, state);
            hasActivatedThisTurn = true;
            triggerSunquanSkill(general, skill, state);
            triggerZhouyuSkill(general, state);
            triggerZhugeliangSkill(general, state);
            triggerSpCaorenSkill(general, state, 'enemy_skill');
          }
        }
      } else {
        // 不需要准备：每个主动战法独立判定发动率
        const effectiveRate = skill.activationRate + general.activeSkillRateBonus;
        if (rollChance(effectiveRate)) {
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'skill',
            message: `${general.name} 释放 ${skill.name}`,
            sourceGeneralId: general.generalId,
          });
          eventBus.emit('skill:trigger', general, skill.id, skill.name, state);
          resolveSkill(skill, general, state);
          hasActivatedThisTurn = true;

          // 联动效果（仅首次触发）
          if (!hasActivatedThisTurn || skill === activeSkills[0]) {
            triggerSunquanSkill(general, skill, state);
            triggerZhouyuSkill(general, state);
            triggerZhugeliangSkill(general, state);
            triggerSpCaorenSkill(general, state, 'enemy_skill');
          }
        } else {
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'skill',
            message: `${general.name} 的 ${skill.name} 因概率发动失败 (发动率${effectiveRate}%)`,
            sourceGeneralId: general.generalId,
          });
        }
      }
    }
  }

  // 2. 普通攻击
  if (canNormalAttack(general) && general.isAlive && !general.customState['keji_no_attack']) {
    performNormalAttack(general, state);

    // SP曹仁天人之勇: 敌方普攻时触发
    triggerSpCaorenSkill(general, state, 'enemy_normal');

    // 处理弱点消耗
    const enemies = general.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals;
    for (const enemy of enemies) {
      if (enemy.isAlive) {
        processWeakness(enemy, state);
      }
    }

    // 3. 追击战法
    if (general.isAlive) {
      const pursuitSkills = getPursuitSkills(general);
      for (const pSkill of pursuitSkills) {
        const effectiveRate = pSkill.activationRate + general.activeSkillRateBonus;
        if (rollChance(effectiveRate)) {
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'skill',
            message: `${general.name} 触发追击: ${pSkill.name}`,
            sourceGeneralId: general.generalId,
          });
          eventBus.emit('skill:trigger', general, pSkill.id, pSkill.name, state);
          if (general.generalId === 'machao') general.customState['_pursuit_phase'] = 1;
          resolveSkill(pSkill, general, state, { triggerType: 'after_attack' });
          general.customState['_pursuit_phase'] = 0;
        } else {
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'skill',
            message: `${general.name} 的 ${pSkill.name} 因概率发动失败 (发动率${effectiveRate}%)`,
            sourceGeneralId: general.generalId,
          });
        }
      }
    }

    // 马超神威天将军: 普攻后速度+5%
    if (general.generalId === 'machao' && general.isAlive) {
      const machaoSkill = getSkillById('shenweitainjiangjun');
      if (machaoSkill) resolveSkill(machaoSkill, general, state, { triggerType: 'after_attack' });
    }

    // 吕蒙白衣渡江: 普攻后消耗谋断
    if (general.generalId === 'lvmeng' && general.isAlive) {
      const baiyiSkill = getSkillById('baiyidujiang');
      if (baiyiSkill) resolveSkill(baiyiSkill, general, state, { triggerType: 'after_attack' });
    }

    // 骁勇: 每次普攻后提升5武力
    if (general.customState['xiaoyong_stacks'] !== undefined) {
      const xiaoyongStacks = general.customState['xiaoyong_stacks'] ?? 0;
      if (xiaoyongStacks < 20) {
        general.customState['xiaoyong_stacks'] = xiaoyongStacks + 1;
        general.atkBonusPercent += (5 / general.baseAttributes.atk) * 100;
        refreshEffectiveAttributes(general);
      }
    }

    // 连击: 额外普攻一次（同一目标）
    if (general.hasDoubleStrike && general.isAlive) {
      const doubleStrikeTarget = enemies.find(e => e.isAlive);
      if (doubleStrikeTarget) {
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'normal_attack',
          message: `${general.name} 连击额外普攻 ${doubleStrikeTarget.name}`,
          sourceGeneralId: general.generalId,
        });
        performNormalAttack(general, state, doubleStrikeTarget);

        // SP曹仁天人之勇: 连击普攻也触发
        triggerSpCaorenSkill(general, state, 'enemy_normal');

        // 处理弱点消耗（连击普攻同样触发）
        if (doubleStrikeTarget.isAlive) {
          processWeakness(doubleStrikeTarget, state);
        }

        // 连击后再次检查追击
        for (const pSkill of getPursuitSkills(general)) {
          const effectiveRate = pSkill.activationRate + general.activeSkillRateBonus;
          if (rollChance(effectiveRate)) {
            eventBus.addLog({
              roundNumber: state.roundNumber,
              type: 'skill',
              message: `${general.name} 连击触发追击: ${pSkill.name}`,
              sourceGeneralId: general.generalId,
            });
            eventBus.emit('skill:trigger', general, pSkill.id, pSkill.name, state);
            if (general.generalId === 'machao') general.customState['_pursuit_phase'] = 1;
            resolveSkill(pSkill, general, state, { triggerType: 'after_attack' });
            general.customState['_pursuit_phase'] = 0;
          } else {
            eventBus.addLog({
              roundNumber: state.roundNumber,
              type: 'skill',
              message: `${general.name} 连击的 ${pSkill.name} 因概率发动失败 (发动率${effectiveRate}%)`,
              sourceGeneralId: general.generalId,
            });
          }
        }

        // 马超神威天将军: 连击额外普攻后速度+5%
        if (general.generalId === 'machao' && general.isAlive) {
          const machaoSkill = getSkillById('shenweitainjiangjun');
          if (machaoSkill) resolveSkill(machaoSkill, general, state, { triggerType: 'after_attack' });
        }
      }
    }
  }

  // 清除仅持续到回合结束的控制状态
  general.isSilenced = false;
  general.isDisarmed = false;
  general.statuses = general.statuses.filter(s =>
    s.id !== 'silence' && s.id !== 'disarm'
  );

  eventBus.emit('turn:end', general, state);
  state.currentTurnIndex++;

  // 检查战斗是否结束
  if (checkBattleEnd(state)) {
    state.phase = 'finished';
    return state;
  }

  return state;
}

// 回合结束阶段
function processRoundEnd(state: BattleState): BattleState {
  eventBus.emit('round:end', state.roundNumber, state);
  snapshotRound(state); // 记录回合结束快照

  // 司马懿: 每回合结束提升10%智力+5%暴击率（双方独立处理）
  for (const simayi of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
    if (simayi.generalId !== 'simayi' || !simayi.isAlive) continue;
    const prevInt = simayi.effectiveAttributes.int;
    simayi.intBonusPercent += 5;
    simayi.critRate += 5;
    refreshEffectiveAttributes(simayi);
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'buff',
      message: `鹰视狼顾: ${simayi.name} 智力提升5% (${prevInt}→${simayi.effectiveAttributes.int})，暴击率+5% (当前${simayi.critRate}%)`,
      sourceGeneralId: simayi.generalId,
    });
  }

  // 会心: 每回合结束暴击率+10%、爆伤+5%（双方独立处理）
  for (const g of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
    if (!g.isAlive) continue;
    const hasHuixin = g.innateSkillId === 'huixin' || g.equippedSkillIds.includes('huixin');
    if (hasHuixin && g.customState['huixin_round_bonus'] !== undefined) {
      g.critRate += 10;
      g.critDamage += 5;
      refreshEffectiveAttributes(g);
    }
  }

  // 刘备桃园结义: 回合结束回复（双方独立处理）
  for (const liubei of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
    if (liubei.generalId !== 'liubei' || !liubei.isAlive) continue;
    const taoyuanSkill = getSkillById('taoyuanjieyi');
    if (taoyuanSkill) resolveSkill(taoyuanSkill, liubei, state);
  }

  // 曹操归心: 回合结束为生命最低武将施加归心（双方独立处理）
  for (const caocao of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
    if (caocao.generalId !== 'caocao' || !caocao.isAlive) continue;
    const caocaoSkill = getSkillById('luanshixiaoxiong');
    if (caocaoSkill) resolveSkill(caocaoSkill, caocao, state);
  }

  // Tick所有buff/debuff/状态 + 明其虚实
  tickAllBuffs([...state.playerTeam.generals, ...state.enemyTeam.generals], state);
  tickMingQiXuShi([...state.playerTeam.generals, ...state.enemyTeam.generals]);

  // 清除每回合的debuff重置
  for (const g of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
    if (!g.isAlive) continue;
    // 许褚争擎防御重置
    if (g.generalId === 'xuchu') {
      g.defBonusPercent = 0;
      refreshEffectiveAttributes(g);
    }
    // 夏侯渊神速回合结束重置武力
    if (g.generalId === 'xiahouyuan') {
      g.atkBonusPercent -= (g.customState['shensu_atk_bonus'] ?? 0) / g.baseAttributes.atk * 100;
      refreshEffectiveAttributes(g);
    }
    // SP曹仁天人之勇: 回合结束清除本回合附加的减伤/增伤
    if (g.generalId === 'spcaoren') {
      const drAdded = g.customState['tianren_dr_added'] ?? 0;
      const dbAdded = g.customState['tianren_db_added'] ?? 0;
      if (drAdded > 0 || dbAdded > 0) {
        const allies = g.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
        for (const ally of allies) {
          if (!ally.isAlive) continue;
          ally.damageReduction -= drAdded;
          ally.damageBonus -= dbAdded;
        }
        g.customState['tianren_dr_added'] = 0;
        g.customState['tianren_db_added'] = 0;
      }
    }
  }

  // 检查第四回合清除虎豹骑效果
  if (state.roundNumber === 4) {
    for (const caochun of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
      if (caochun.generalId !== 'caochun' || !caochun.customState['hubao_active']) continue;
      const allies = caochun.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
      for (const ally of allies) {
        ally.atkBonusPercent -= 20;
        ally.spdBonusPercent -= 20;
        ally.damageBonus -= 30;
        refreshEffectiveAttributes(ally);
      }
      caochun.customState['hubao_active'] = 0;
    }
    // 固若金汤: 第四回合开始
    for (const caoren of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
      if (caoren.generalId !== 'caoren' || !caoren.isAlive) continue;
      const guruoSkill = getSkillById('guruojintang');
      if (guruoSkill) resolveSkill(guruoSkill, caoren, state);
    }
    // 断戈夺锋: 第四回合恢复敌方增伤
    for (const g of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
      const hasDuangef = g.innateSkillId === 'duangeduofeng' || g.equippedSkillIds.includes('duangeduofeng');
      if (hasDuangef && g.customState['duangef_active']) {
        const duangefSkill = getSkillById('duangeduofeng');
        if (duangefSkill) resolveSkill(duangefSkill, g, state);
      }
    }
    // 全军出击: 第四回合移除我方增伤
    for (const g of [...state.playerTeam.generals, ...state.enemyTeam.generals]) {
      const hasQuanjun = g.innateSkillId === 'quanjunchuji' || g.equippedSkillIds.includes('quanjunchuji');
      if (hasQuanjun && g.customState['quanjun_active']) {
        const quanjunSkill = getSkillById('quanjunchuji');
        if (quanjunSkill) resolveSkill(quanjunSkill, g, state);
      }
    }
  }

  // 检查战斗是否结束 (8回合或一方全灭)
  if (state.roundNumber >= state.maxRounds) {
    state.phase = 'finished';
    determineWinner(state);
    return state;
  }

  if (checkBattleEnd(state)) {
    state.phase = 'finished';
    return state;
  }

  // 进入下一回合
  state.phase = 'round_start';
  return state;
}

// 检查战斗结束
function checkBattleEnd(state: BattleState): boolean {
  const playerAlive = state.playerTeam.generals.some(g => g.isAlive);
  const enemyAlive = state.enemyTeam.generals.some(g => g.isAlive);
  if (!playerAlive || !enemyAlive) {
    determineWinner(state);
    return true;
  }
  return false;
}

// 判定胜负
function determineWinner(state: BattleState): void {
  const playerAlive = state.playerTeam.generals.some(g => g.isAlive);
  const enemyAlive = state.enemyTeam.generals.some(g => g.isAlive);

  if (!playerAlive && !enemyAlive) {
    state.winner = 'draw';
  } else if (!enemyAlive) {
    state.winner = 'player';
  } else if (!playerAlive) {
    state.winner = 'enemy';
  } else {
    state.winner = 'draw';
  }

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: 'system',
    message: state.winner === 'player' ? '玩家胜利！' :
             state.winner === 'enemy' ? '敌方胜利！' : '平局！',
  });

  // 计算双方输出最高的武将
  computeTopDamage(state);

  eventBus.emit('battle:end', state.winner, state);
}

function computeTopDamage(state: BattleState): void {
  const playerTop = Object.entries(state.playerTotalDamage)
    .sort(([, a], [, b]) => b - a)[0];
  const enemyTop = Object.entries(state.enemyTotalDamage)
    .sort(([, a], [, b]) => b - a)[0];

  if (playerTop) {
    const g = state.playerTeam.generals.find(gen => gen.generalId === playerTop[0]);
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'system',
      message: `玩家方输出最高: ${g?.name ?? playerTop[0]} (${playerTop[1]} 伤害)`,
    });
  }
  if (enemyTop) {
    const g = state.enemyTeam.generals.find(gen => gen.generalId === enemyTop[0]);
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'system',
      message: `敌方输出最高: ${g?.name ?? enemyTop[0]} (${enemyTop[1]} 伤害)`,
    });
  }
}

// 辅助函数: 获取武将的主动战法
function getActiveSkills(general: BattleGeneral): SkillDef[] {
  const skills: SkillDef[] = [];
  const innate = getSkillById(general.innateSkillId);
  if (innate && innate.type === 'active') skills.push(innate);
  for (const skillId of general.equippedSkillIds) {
    const skill = getSkillById(skillId);
    if (skill && skill.type === 'active') skills.push(skill);
  }
  return skills;
}

// 辅助函数: 获取武将的追击战法
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

// 触发法正睚眦必报
function triggerFazhengSkill(general: BattleGeneral, state: BattleState): void {
  const allies = general.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
  const fazheng = allies.find(g => g.generalId === 'fazheng' && g.isAlive);
  if (fazheng) {
    const count = fazheng.customState['yaci_count'] ?? 0;
    if (count < 2) {
      fazheng.customState['yaci_count'] = count + 1;
      const yaciSkill = getSkillById('yacibibao');
      if (yaciSkill) resolveSkill(yaciSkill, fazheng, state, { targetId: general.generalId });
    }
  }
}

// 触发孙权权御江东
function triggerSunquanSkill(general: BattleGeneral, skill: SkillDef, state: BattleState): void {
  const allies = general.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
  const sunquan = allies.find(g => g.generalId === 'sunquan' && g.isAlive);
  if (sunquan && (sunquan.customState['quanyu_used'] ?? 0) === 0) {
    sunquan.customState['quanyu_used'] = 1;
    const quanyuSkill = getSkillById('quanyujiangdong');
    if (quanyuSkill) resolveSkill(quanyuSkill, sunquan, state, { skillId: skill.id });

    // 偶数回合: 额外释放一次
    if (state.roundNumber % 2 === 0) {
      resolveSkill(skill, general, state);
    }
  }
}

// 触发周瑜火烧赤壁
function triggerZhouyuSkill(general: BattleGeneral, state: BattleState): void {
  const allies = general.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
  const zhouyu = allies.find(g => g.generalId === 'zhouyu' && g.isAlive);
  if (zhouyu) {
    const count = zhouyu.customState['chibi_count'] ?? 0;
    if (count < 3) {
      zhouyu.customState['chibi_count'] = count + 1;
      const chibiSkill = getSkillById('huoshaochibi');
      if (chibiSkill) resolveSkill(chibiSkill, zhouyu, state);
    }
  }
}

// 触发诸葛亮看破
function triggerZhugeliangSkill(general: BattleGeneral, state: BattleState): void {
  const enemies = general.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals;
  const zhugeliang = enemies.find(g => g.generalId === 'zhugeliang' && g.isAlive);
  if (zhugeliang) {
    const count = zhugeliang.customState['kanpo_count'] ?? 0;
    if (count < 3) {
      zhugeliang.customState['kanpo_count'] = count + 1;
      const kanpoSkill = getSkillById('kanpo');
      if (kanpoSkill) resolveSkill(kanpoSkill, zhugeliang, state, { targetId: general.generalId });
    }
  }
}

// 触发SP曹仁天人之勇
function triggerSpCaorenSkill(general: BattleGeneral, state: BattleState, triggerType: 'enemy_skill' | 'enemy_normal'): void {
  const enemies = general.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals;
  const spcaoren = enemies.find(g => g.generalId === 'spcaoren' && g.isAlive);
  if (!spcaoren) return;

  const skill = getSkillById('tianrenzhiyong');
  if (skill) {
    resolveSkill(skill, spcaoren, state, { triggerType, enemyId: general.generalId });
  }
}
