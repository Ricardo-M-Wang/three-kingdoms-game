export type SkillType = 'active' | 'pursuit' | 'command' | 'passive';
export type DamageType = 'physical' | 'magical' | 'dot' | 'additional';
export type SkillTarget =
  | 'enemy_single'
  | 'enemy_all'
  | 'enemy_two'
  | 'enemy_random'
  | 'ally_single'
  | 'ally_all'
  | 'ally_lowest_hp'
  | 'self'
  | 'enemy_lowest_def'
  | 'enemy_lowest_spd'
  | 'ally_highest_atk'
  | 'ally_highest_int'
  | 'ally_highest_spd'
  | 'ally_lowest_hp_single';

export type SkillTriggerCondition =
  | { type: 'battle_start' }
  | { type: 'round_start' }
  | { type: 'round_end' }
  | { type: 'on_turn' }
  | { type: 'after_normal_attack' }
  | { type: 'on_hit' }
  | { type: 'on_dodge' }
  | { type: 'on_ally_skill' }
  | { type: 'on_enemy_skill' }
  | { type: 'on_ally_gain_buff' }
  | { type: 'on_enemy_about_to_act' }
  | { type: 'on_ally_prepare_skill' }
  | { type: 'on_damage_taken' };

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status' | 'dot' | 'shield' | 'counter' | 'custom';
  damageType?: DamageType;
  multiplier?: number;
  target: SkillTarget;
  buffId?: string;
  debuffId?: string;
  statusId?: string;
  duration?: number;
  value?: number;
  extraMultiplier?: number;
  condition?: string;
}

export interface SkillDef {
  id: string;
  name: string;
  type: SkillType;
  description: string;
  activationRate: number;     // 0 表示必定触发(指挥/被动)
  effects: SkillEffect[];
  triggerCondition?: SkillTriggerCondition;
  cooldown?: number;
  maxTriggersPerRound?: number;
  needsPreparation?: boolean;  // 是否需要准备一回合
}
