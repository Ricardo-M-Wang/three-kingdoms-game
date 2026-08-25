import type { BattleGeneral, BattleState } from '../types';
import type { DamageContext, DamageResult } from '../types/damage';
import { rollChance } from '../utils/random';
import { eventBus } from './eventBus';
import { processGuixin, resolveSkill } from './skillResolver';
import { refreshEffectiveAttributes } from './attributeCalculator';
import { getSkillById } from '../skills';

// 治疗上限: 最多回复已损失生命的75%
export function clampHealing(target: BattleGeneral, amount: number): { effectiveHeal: number; wasted: number } {
  const lostHp = target.maxHp - target.currentHp;
  const maxHeal = Math.round(lostHp * 0.75);
  const effectiveHeal = Math.min(amount, maxHeal);
  return { effectiveHeal, wasted: amount - effectiveHeal };
}

// 判断暴击
function checkCrit(attacker: BattleGeneral, ctx: DamageContext): boolean {
  if (ctx.damageType === 'dot' || ctx.damageType === 'additional') return false;
  // 会心: 必定暴击
  if (attacker.hasInsight) return true;
  // 奇袭标记: 来自邓艾的伤害必定暴击 (由外部设置 isCrit)
  if (ctx.isCrit) return true;
  // 根据暴击率判定
  if (attacker.critRate > 0) {
    return rollChance(attacker.critRate);
  }
  return false;
}

// 判断规避
function checkDodge(defender: BattleGeneral, damageType: string): boolean {
  if (damageType === 'dot' || damageType === 'additional') return false;
  if (defender.dodgeRate > 0) {
    return rollChance(defender.dodgeRate);
  }
  return false;
}

export function calculateDamage(ctx: DamageContext, state: BattleState): DamageResult {
  const { attacker, defender } = ctx;

  // 规避判定
  if (checkDodge(defender, ctx.damageType)) {
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'dodge',
      message: `${defender.name} 闪避了来自 ${attacker.name} 的攻击！`,
      sourceGeneralId: attacker.generalId,
      targetGeneralId: defender.generalId,
    });
    eventBus.emit('dodge:triggered', defender, attacker, state);

    // 赵云七进七出: 成功规避后反击
    if (defender.innateSkillId === 'qijinqichu') {
      const dodgeCount = defender.customState['qijin_dodge_count'] ?? 0;
      if (dodgeCount < 7 && attacker.isAlive) {
        defender.customState['qijin_dodge_count'] = dodgeCount + 1;
        const enemies = (defender.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals)
          .filter(e => e.isAlive).slice(0, 2);
        for (const enemy of enemies) {
          const dmgCtx: DamageContext = {
            attacker: defender, defender: enemy,
            baseMultiplier: 0.8, damageType: 'physical',
            isCrit: defender.hasInsight, critMultiplier: defender.critDamage / 100,
            dmgBonus: defender.damageBonus, dmgReduction: enemy.damageReduction,
            takenBonus: enemy.takenBonus, takenReduction: enemy.takenReduction,
            ignoreDefense: defender.hasArmorBreak, ignoreDmgReduction: defender.hasFormationBreak,
          };
          const dmgResult = calculateDamage(dmgCtx, state);
          // 使用applyDamage处理死亡/归心等
          applyDamage(dmgResult, enemy, defender, state);
          // 记录到技能统计
          const statsMap = defender.side === 'player' ? state.playerSkillStats : state.enemySkillStats;
          if (!statsMap[defender.generalId]) {
            statsMap[defender.generalId] = { normalAttack: { damage: 0, count: 0 }, skills: {} };
          }
          if (!statsMap[defender.generalId].skills['qijinqichu']) {
            statsMap[defender.generalId].skills['qijinqichu'] = { damage: 0, heal: 0, count: 0, name: '七进七出', type: 'passive' };
          }
          statsMap[defender.generalId].skills['qijinqichu'].damage += dmgResult.finalDamage;
          statsMap[defender.generalId].skills['qijinqichu'].count++;

          // 触发姜维北伐之志
          const allies = defender.side === 'player' ? state.playerTeam.generals : state.enemyTeam.generals;
          const jiangwei = allies.find(g => g.generalId === 'jiangwei' && g.isAlive);
          if (jiangwei) {
            const jwCount = jiangwei.customState['on_ally_skill_count'] ?? 0;
            const jwSkill = getSkillById('beifazhizhi');
            if (jwSkill && jwCount < (jwSkill.maxTriggersPerRound ?? 3)) {
              jiangwei.customState['on_ally_skill_count'] = jwCount + 1;
              // 直接触发姜维伤害
              const jwTargets = (jiangwei.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals)
                .filter(e => e.isAlive);
              if (jwTargets.length > 0) {
                const jwTarget = jwTargets[Math.floor(Math.random() * jwTargets.length)];
                // 武力伤害
                const physCtx: DamageContext = {
                  attacker: jiangwei, defender: jwTarget, baseMultiplier: 1.0, damageType: 'physical',
                  isCrit: jiangwei.hasInsight, critMultiplier: jiangwei.critDamage / 100,
                  dmgBonus: jiangwei.damageBonus, dmgReduction: jwTarget.damageReduction,
                  takenBonus: jwTarget.takenBonus, takenReduction: jwTarget.takenReduction,
                  ignoreDefense: jiangwei.hasArmorBreak, ignoreDmgReduction: jiangwei.hasFormationBreak,
                };
                const physResult = calculateDamage(physCtx, state);
                applyDamage(physResult, jwTarget, jiangwei, state);
                let magDmg = 0;
                // 智力伤害
                if (jwTarget.isAlive) {
                  const magCtx: DamageContext = {
                    attacker: jiangwei, defender: jwTarget, baseMultiplier: 1.0, damageType: 'magical',
                    isCrit: jiangwei.hasInsight, critMultiplier: jiangwei.critDamage / 100,
                    dmgBonus: jiangwei.damageBonus, dmgReduction: jwTarget.damageReduction,
                    takenBonus: jwTarget.takenBonus, takenReduction: jwTarget.takenReduction,
                    ignoreDefense: jiangwei.hasArmorBreak, ignoreDmgReduction: jiangwei.hasFormationBreak,
                  };
                  const magResult = calculateDamage(magCtx, state);
                  applyDamage(magResult, jwTarget, jiangwei, state);
                  magDmg = magResult.finalDamage;
                }
                // 记录姜维技能统计
                const jwTotalDmg = physResult.finalDamage + magDmg;
                const jwStatsMap = jiangwei.side === 'player' ? state.playerSkillStats : state.enemySkillStats;
                if (!jwStatsMap[jiangwei.generalId]) {
                  jwStatsMap[jiangwei.generalId] = { normalAttack: { damage: 0, count: 0 }, skills: {} };
                }
                if (!jwStatsMap[jiangwei.generalId].skills['beifazhizhi']) {
                  jwStatsMap[jiangwei.generalId].skills['beifazhizhi'] = { damage: 0, heal: 0, count: 0, name: '北伐之志', type: 'command' };
                }
                jwStatsMap[jiangwei.generalId].skills['beifazhizhi'].count++;
                jwStatsMap[jiangwei.generalId].skills['beifazhizhi'].damage += jwTotalDmg;
                // 总伤害
                const jwTotals = jiangwei.side === 'player' ? state.playerTotalDamage : state.enemyTotalDamage;
                jwTotals[jiangwei.generalId] = (jwTotals[jiangwei.generalId] ?? 0) + jwTotalDmg;
                eventBus.addLog({
                  roundNumber: state.roundNumber, type: 'skill',
                  message: `北伐之志: ${jiangwei.name} 对 ${jwTarget.name} 追加伤害`,
                  sourceGeneralId: jiangwei.generalId, targetGeneralId: jwTarget.generalId,
                });
              }
            }
          }
        }
      }
    }

    return {
      rawDamage: 0, finalDamage: 0, isCrit: false, isDodged: true,
      lifestealAmount: 0, damageType: ctx.damageType,
      description: `${defender.name} 闪避了攻击`,
      sourceId: attacker.generalId, targetId: defender.generalId,
    };
  }

  // 附加伤害: 固定数值
  if (ctx.damageType === 'additional') {
    const dmg = ctx.fixedValue ?? 0;
    return {
      rawDamage: dmg, finalDamage: Math.max(1, Math.round(dmg)),
      isCrit: false, isDodged: false, lifestealAmount: 0,
      damageType: 'additional',
      description: `${attacker.name} 对 ${defender.name} 造成 ${Math.round(dmg)} 点附加伤害`,
      sourceId: attacker.generalId, targetId: defender.generalId,
    };
  }

  // 持续伤害: ATK × 倍率, 不可暴击, 无视防御
  if (ctx.damageType === 'dot') {
    const raw = Math.max(1, attacker.effectiveAttributes.atk * ctx.baseMultiplier);
    return {
      rawDamage: raw, finalDamage: Math.round(raw),
      isCrit: false, isDodged: false, lifestealAmount: 0,
      damageType: 'dot',
      description: `${attacker.name} 对 ${defender.name} 造成 ${Math.round(raw)} 点持续伤害`,
      sourceId: attacker.generalId, targetId: defender.generalId,
    };
  }

  // 暴击判定
  const isCrit = checkCrit(attacker, ctx);
  const critMult = isCrit ? (attacker.critDamage / 100) : 1.0;

  // 伏兵: 受到智力伤害提升(每层+10%)
  const fubingStacks = defender.customState['fubing_stacks'] ?? 0;
  if (fubingStacks > 0 && ctx.damageType === 'magical') {
    ctx.takenBonus += fubingStacks * 10;
  }

  // 物理/智力伤害公式
  let baseDamage: number;
  const atk = attacker.effectiveAttributes.atk;
  const def = defender.effectiveAttributes.def;
  const intAtk = attacker.effectiveAttributes.int;
  const intDef = defender.effectiveAttributes.int;

  if (ctx.damageType === 'physical') {
    const effectiveDef = ctx.ignoreDefense ? 0 : def;
    baseDamage = ctx.baseMultiplier * (atk - effectiveDef);
  } else {
    // 智力伤害
    const effectiveDef = ctx.ignoreDefense ? 0 : (0.6 * def + 0.4 * intDef);
    baseDamage = ctx.baseMultiplier * (intAtk - effectiveDef);
  }

  // 未破防: 伤害=1
  if (baseDamage <= 0) {
    baseDamage = 1;
  }

  // 增伤/减伤修正
  let bonusDmg = ctx.dmgBonus;
  let reductionDmg = ctx.ignoreDmgReduction ? 0 : ctx.dmgReduction;
  const dmgMod = Math.max(0, 1 + bonusDmg / 100 - reductionDmg / 100);

  // 受到伤害修正
  const takenMod = Math.max(0, 1 + ctx.takenBonus / 100 - ctx.takenReduction / 100);

  let finalDamage = baseDamage * dmgMod * takenMod;

  // 暴击
  if (isCrit) {
    finalDamage *= critMult;
  }

  // 额外倍率
  if (ctx.bonusMultiplier) {
    finalDamage *= ctx.bonusMultiplier;
  }

  // 马超神威天将军: 追击伤害根据双方速度差额外提升(上限100%)
  if (attacker.generalId === 'machao' && attacker.customState['_pursuit_phase']) {
    const spdDiff = Math.max(0, attacker.effectiveAttributes.spd - defender.effectiveAttributes.spd)
      / Math.max(1, defender.effectiveAttributes.spd);
    finalDamage *= (1 + Math.min(1, spdDiff));
  }

  finalDamage = Math.max(1, Math.round(finalDamage));

  // 倒戈/攻心 吸血计算
  let lifestealAmount = 0;
  if (ctx.damageType === 'physical' && attacker.lifestealPhysical > 0) {
    lifestealAmount = Math.round(finalDamage * attacker.lifestealPhysical / 100);
  } else if (ctx.damageType === 'magical' && attacker.lifestealMagical > 0) {
    lifestealAmount = Math.round(finalDamage * attacker.lifestealMagical / 100);
  }

  const critText = isCrit ? '(暴击!)' : '';
  const typeText = ctx.damageType === 'physical' ? '武力' : '智力';
  const description = `${attacker.name} 对 ${defender.name} 造成 ${finalDamage} 点${typeText}伤害 ${critText}`;

  return {
    rawDamage: baseDamage,
    finalDamage,
    isCrit,
    isDodged: false,
    lifestealAmount,
    damageType: ctx.damageType,
    description,
    sourceId: attacker.generalId,
    targetId: defender.generalId,
  };
}

// 应用伤害到目标
export function applyDamage(result: DamageResult, defender: BattleGeneral, attacker: BattleGeneral, state: BattleState): void {
  if (result.isDodged || result.finalDamage <= 0) return;

  // 归心: 受到高于当前生命10%的伤害时消耗1层并降低70%
  let finalDmg = result.finalDamage;
  const guixinTriggered = processGuixin(defender, finalDmg, state);
  if (guixinTriggered) {
    finalDmg = Math.round(finalDmg * 0.3);
  }

  defender.currentHp = Math.max(0, defender.currentHp - finalDmg);

  const dmgDesc = guixinTriggered
    ? `${result.description.replace(/造成 \d+ 点/, `造成 ${finalDmg} 点`)} (归心减免${result.finalDamage - finalDmg})`
    : result.description;

  eventBus.addLog({
    roundNumber: state.roundNumber,
    type: result.isCrit ? 'crit' : 'damage',
    message: dmgDesc,
    sourceGeneralId: attacker.generalId,
    targetGeneralId: defender.generalId,
  });

  eventBus.emit('damage:dealt', result, state);

  // 吸血 (最多恢复已损失生命的75%)
  if (result.lifestealAmount > 0) {
    const { effectiveHeal, wasted } = clampHealing(attacker, result.lifestealAmount);
    attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + effectiveHeal);
    const wastedText = wasted > 0 ? ` (已损失生命75%上限，溢${wasted})` : '';
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'heal',
      message: `${attacker.name} 吸取 ${effectiveHeal} 点生命${wastedText}`,
      sourceGeneralId: attacker.generalId,
      targetGeneralId: attacker.generalId,
    });
  }

  // 触发受击反击 (典韦古之恶来、夏侯惇刚烈)
  if (defender.isAlive && finalDmg > 0) {
    const isNormalAttack = !state.currentSkillId;

    // 典韦古之恶来: 受到普攻时获得恶来+反击 (每回合上限5次)
    if (isNormalAttack && defender.innateSkillId === 'guzhielai') {
      const count = defender.customState['elai_counter_count'] ?? 0;
      if (count < 5) {
        defender.customState['elai_counter_count'] = count + 1;
        const stacks = Math.min(5, (defender.customState['elai_stacks'] ?? 0) + 1);
        defender.customState['elai_stacks'] = stacks;
        defender.atkBonusPercent += 5;
        defender.counterDamageBonus += 10;
        refreshEffectiveAttributes(defender);

        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'skill',
          message: `古之恶来: ${defender.name} 获得恶来(${stacks}层)，武力+5，反击伤害+10%`,
          sourceGeneralId: defender.generalId,
        });

        // 反击 (100%武力伤害 + 反击增伤)
        if (attacker.isAlive) {
          const counterMult = 1.0 + (defender.counterDamageBonus / 100);
          const ctx: DamageContext = {
            attacker: defender, defender: attacker,
            baseMultiplier: counterMult, damageType: 'physical',
            isCrit: defender.hasInsight, critMultiplier: defender.critDamage / 100,
            dmgBonus: defender.damageBonus, dmgReduction: attacker.damageReduction,
            takenBonus: attacker.takenBonus, takenReduction: attacker.takenReduction,
            ignoreDefense: defender.hasArmorBreak, ignoreDmgReduction: defender.hasFormationBreak,
          };
          const counterResult = calculateDamage(ctx, state);
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'skill',
            message: `古之恶来反击: ${defender.name} 对 ${attacker.name} 造成 ${counterResult.finalDamage} 点伤害`,
            sourceGeneralId: defender.generalId,
            targetGeneralId: attacker.generalId,
          });
          attacker.currentHp = Math.max(0, attacker.currentHp - counterResult.finalDamage);
          // 记录反击伤害到典韦
          const dmgStats = defender.side === 'player' ? state.playerTotalDamage : state.enemyTotalDamage;
          dmgStats[defender.generalId] = (dmgStats[defender.generalId] ?? 0) + counterResult.finalDamage;
          if (attacker.currentHp <= 0) {
            attacker.isAlive = false;
            eventBus.addLog({
              roundNumber: state.roundNumber, type: 'death',
              message: `${attacker.name} 被反击击杀！`,
              targetGeneralId: attacker.generalId,
            });
            eventBus.emit('general:died', attacker, state);
          }
        }
      }
    }

    // 夏侯惇刚烈: 受到伤害时反击+降增伤 (每回合上限4次)
    if (defender.innateSkillId === 'ganglie') {
      const count = defender.customState['ganglie_count'] ?? 0;
      if (count < 4) {
        defender.customState['ganglie_count'] = count + 1;
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'skill',
          message: `刚烈: ${defender.name} 受到伤害，对 ${attacker.name} 发动反击！`,
          sourceGeneralId: defender.generalId,
          targetGeneralId: attacker.generalId,
        });

        // 反击 100%武力 + 100%防御
        const counterDmg = defender.effectiveAttributes.atk + defender.effectiveAttributes.def;
        attacker.currentHp = Math.max(0, attacker.currentHp - counterDmg);
        // 记录反击伤害
        const dmgStats = defender.side === 'player' ? state.playerTotalDamage : state.enemyTotalDamage;
        dmgStats[defender.generalId] = (dmgStats[defender.generalId] ?? 0) + counterDmg;
        // 目标增伤降低10% (上限4层)
        const ganglieStacks = attacker.customState['ganglie_debuff_stacks'] ?? 0;
        if (ganglieStacks < 4) {
          attacker.customState['ganglie_debuff_stacks'] = ganglieStacks + 1;
          attacker.damageBonus -= 10;
          eventBus.addLog({
            roundNumber: state.roundNumber,
            type: 'debuff',
            message: `${attacker.name} 增伤降低10% (刚烈${attacker.customState['ganglie_debuff_stacks']}/4层，当前增伤${attacker.damageBonus}%)`,
            targetGeneralId: attacker.generalId,
          });
        }
        if (attacker.currentHp <= 0) {
          attacker.isAlive = false;
          eventBus.addLog({
            roundNumber: state.roundNumber, type: 'death',
            message: `${attacker.name} 被刚烈反击击杀！`,
            targetGeneralId: attacker.generalId,
          });
          eventBus.emit('general:died', attacker, state);
        }
      }
    }

    // 反戈(装备被动): 反击伤害+40%，反击后额外50%武力伤害
    if (defender.equippedSkillIds.includes('fange') && isNormalAttack) {
      const fangeCount = defender.customState['fange_count'] ?? 0;
      if (fangeCount < 5) {
        defender.customState['fange_count'] = fangeCount + 1;
        defender.counterDamageBonus += 40;
        const extraDmg = Math.round(defender.effectiveAttributes.atk * 0.5);
        attacker.currentHp = Math.max(0, attacker.currentHp - extraDmg);
        eventBus.addLog({
          roundNumber: state.roundNumber,
          type: 'skill',
          message: `反戈: ${defender.name} 反击并额外造成 ${extraDmg} 点伤害`,
          sourceGeneralId: defender.generalId,
          targetGeneralId: attacker.generalId,
        });
      }
    }
  }

  // 文武双全: 技能造成伤害后触发属性提升
  if (attacker.customState['wenwu_enabled'] && state.currentSkillId && finalDmg > 0) {
    if (result.damageType === 'physical') {
      const stacks = attacker.customState['wenwu_int_stacks'] ?? 0;
      if (stacks < 14) {
        attacker.customState['wenwu_int_stacks'] = stacks + 1;
        attacker.intBonusPercent += (5 / Math.max(1, attacker.baseAttributes.int)) * 100;
        refreshEffectiveAttributes(attacker);
      }
    } else if (result.damageType === 'magical') {
      const stacks = attacker.customState['wenwu_atk_stacks'] ?? 0;
      if (stacks < 14) {
        attacker.customState['wenwu_atk_stacks'] = stacks + 1;
        attacker.atkBonusPercent += (5 / Math.max(1, attacker.baseAttributes.atk)) * 100;
        refreshEffectiveAttributes(attacker);
      }
    }
  }

  // 伏兵: 受到暴击伤害消耗一层
  const fubingStacks = defender.customState['fubing_stacks'] ?? 0;
  if (result.isCrit && fubingStacks > 0) {
    defender.customState['fubing_stacks'] = fubingStacks - 1;
  }

  // 贲育: 暴击时触发(每回合限3次施加伏兵)
  if (result.isCrit && finalDmg > 0) {
    // 我方暴击→程昱回复
    const attackerSide = attacker.side;
    const benyuAlly = (attackerSide === 'player' ? state.playerTeam.generals : state.enemyTeam.generals)
      .find(g => g.generalId === 'chengyu' && g.isAlive);
    if (benyuAlly) {
      const benyuSkill = getSkillById('benyu');
      if (benyuSkill) resolveSkill(benyuSkill, benyuAlly, state, { triggerType: 'ally_crit' });
    }
    // 敌方受暴击→程昱施加伏兵
    const benyuEnemy = (defender.side === 'player' ? state.enemyTeam.generals : state.playerTeam.generals)
      .find(g => g.generalId === 'chengyu' && g.isAlive);
    if (benyuEnemy) {
      const count = (benyuEnemy.customState['benyu_fubing_count'] ?? 0);
      if (count < 3) {
        benyuEnemy.customState['benyu_fubing_count'] = count + 1;
        const benyuSkill2 = getSkillById('benyu');
        if (benyuSkill2) resolveSkill(benyuSkill2, benyuEnemy, state, { triggerType: 'enemy_crit', targetId: defender.generalId });
      }
    }
  }

  // 吕蒙白衣渡江: 受到伤害获得谋断
  if (defender.innateSkillId === 'baiyidujiang' && defender.isAlive && finalDmg > 0) {
    const skill = getSkillById('baiyidujiang');
    if (skill) resolveSkill(skill, defender, state, { triggerType: 'on_damage_taken' });
  }

  // 检查死亡
  if (defender.currentHp <= 0) {
    defender.isAlive = false;
    eventBus.addLog({
      roundNumber: state.roundNumber,
      type: 'death',
      message: `${defender.name} 阵亡！`,
      sourceGeneralId: attacker.generalId,
      targetGeneralId: defender.generalId,
    });
    eventBus.emit('general:died', defender, state);
  }
}
