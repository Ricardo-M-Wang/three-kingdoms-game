import type { BattleGeneral } from './general';

export type DamageType = 'physical' | 'magical' | 'dot' | 'additional';

export interface DamageContext {
  attacker: BattleGeneral;
  defender: BattleGeneral;
  baseMultiplier: number;
  damageType: DamageType;
  isCrit: boolean;
  critMultiplier: number;
  dmgBonus: number;
  dmgReduction: number;
  takenBonus: number;
  takenReduction: number;
  ignoreDefense: boolean;
  ignoreDmgReduction: boolean;
  fixedValue?: number;
  bonusMultiplier?: number;
}

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  isDodged: boolean;
  lifestealAmount: number;
  damageType: DamageType;
  description: string;
  sourceId: string;
  targetId: string;
}
