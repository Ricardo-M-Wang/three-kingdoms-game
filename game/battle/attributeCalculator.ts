import type { BattleGeneral, Attributes, GeneralRanks } from '../types';
import { ATK_INT_VALUES, DEF_VALUES, SPD_VALUES, BASE_HP } from '../generals';

// 从等级计算基础属性
export function computeBaseAttributes(ranks: GeneralRanks): Attributes {
  return {
    atk: ATK_INT_VALUES[ranks.atk],
    int: ATK_INT_VALUES[ranks.int],
    def: DEF_VALUES[ranks.def],
    spd: SPD_VALUES[ranks.spd],
    hp: BASE_HP,
  };
}

// 计算有效属性 (基础 + 自由点 + buff修正)
export function computeEffectiveAttributes(g: BattleGeneral): Attributes {
  let atk = g.baseAttributes.atk + g.freePoints.atk;
  let int = g.baseAttributes.int + g.freePoints.int;
  let def = g.baseAttributes.def + g.freePoints.def;
  let spd = g.baseAttributes.spd + g.freePoints.spd;

  // 洪水debuff: 每层统帅-10
  def = Math.max(0, def - g.floodStacks * 10);

  // 百分比修正
  atk = Math.round(atk * (1 + g.atkBonusPercent / 100));
  int = Math.round(int * (1 + g.intBonusPercent / 100));
  def = Math.round(def * (1 + g.defBonusPercent / 100));
  spd = Math.round(spd * (1 + g.spdBonusPercent / 100));

  return { atk, int, def, spd, hp: g.maxHp };
}

// 刷新武将的有效属性
export function refreshEffectiveAttributes(g: BattleGeneral): void {
  g.effectiveAttributes = computeEffectiveAttributes(g);
}
