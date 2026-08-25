// 属性等级
export type AttributeRank = 'S' | 'A' | 'B' | 'C' | 'D';

// 五项基础属性
export interface Attributes {
  atk: number;  // 武力
  int: number;  // 智力
  def: number;  // 防御/统帅
  spd: number;  // 速度
  hp: number;   // 生命 (固定10000)
}

// 属性等级配置
export interface GeneralRanks {
  atk: AttributeRank;
  int: AttributeRank;
  def: AttributeRank;
  spd: AttributeRank;
}

// 武将静态定义 (从数据文件加载)
export interface GeneralDef {
  id: string;
  name: string;
  ranks: GeneralRanks;
  innateSkillId: string;
  portrait: string;
  skillType: 'active' | 'pursuit' | 'command' | 'passive'; // 自带战法类型
}

// 自由属性点分配
export const MAX_ADVANCEMENT = 5;
export const ADVANCEMENT_POINTS = 10;
export const BASE_FREE_POINTS = 50;

export interface FreePoints {
  atk: number;
  int: number;
  def: number;
  spd: number;
}

// 战斗中buff/debuff/状态实例
export interface BuffInstance {
  id: string;
  name: string;
  remainingRounds: number;
  stacks: number;
  sourceId?: string; // 来源武将ID
}

export interface StatusInstance {
  id: string;
  name: string;
  remainingRounds: number;
  sourceId?: string;
}

// 战斗中的武将实例
export interface BattleGeneral {
  generalId: string;
  name: string;
  portrait: string;
  side: 'player' | 'enemy';

  // 基础属性 (从等级计算)
  baseAttributes: Attributes;

  // 玩家分配的自由属性点
  freePoints: FreePoints;
  maxFreePoints: number;
  advancement: number;

  // 装备的战法
  innateSkillId: string;
  equippedSkillIds: [string, string];

  // 战斗中可变状态
  currentHp: number;
  maxHp: number;
  isAlive: boolean;

  // 控制状态
  isStunned: boolean;      // 震慑 - 无法行动
  isSilenced: boolean;     // 技穷 - 无法释放主动战法
  isDisarmed: boolean;     // 缴械 - 无法普攻

  // 功能性增益
  hasArmorBreak: boolean;       // 破甲 - 无视防御
  hasFormationBreak: boolean;   // 破阵 - 无视减伤
  hasInsight: boolean;          // 会心 - 必定暴击
  hasDoubleStrike: boolean;     // 连击 - 每回合普攻两次
  hasClarity: boolean;          // 清醒 - 免疫控制
  hasPenetrate: boolean;        // 穿透 - 无视护盾

  // 增益列表
  buffs: BuffInstance[];
  // 状态列表
  statuses: StatusInstance[];

  // 特殊状态层数
  floodStacks: number;    // 洪水: 每层统帅-10, 上限3
  fearStacks: number;     // 畏惧: 每层受到伤害+10%

  // 属性修正 (百分比)
  atkBonusPercent: number;
  intBonusPercent: number;
  defBonusPercent: number;
  spdBonusPercent: number;

  // 增伤/减伤
  damageBonus: number;        // 增伤百分比
  damageReduction: number;    // 减伤百分比
  takenBonus: number;         // 受到伤害提升
  takenReduction: number;     // 受到伤害降低

  // 暴击
  critRate: number;       // 暴击率
  critDamage: number;     // 暴击伤害 (默认150%)

  // 吸血
  lifestealPhysical: number;  // 倒戈
  lifestealMagical: number;   // 攻心

  // 规避率
  dodgeRate: number;

  // 反击相关
  counterDamageBonus: number;

  // 主动战法发动率加成
  activeSkillRateBonus: number;

  // 计算后的有效属性
  effectiveAttributes: Attributes;

  // 其他武将特定状态追踪
  customState: Record<string, number>;
  // 原存于 customState 的字符串字段（customState 为数值字典）
  burnSourceId?: string;
  burnSourceName?: string;
  preparingSkillId?: string;
}

// 队伍
export interface Team {
  owner: 'player' | 'enemy';
  generals: BattleGeneral[];
}

// 战斗阶段
export type BattlePhase =
  | 'not_started'
  | 'battle_start'
  | 'round_start'
  | 'turn_processing'
  | 'round_end'
  | 'finished';

// 技能统计
export interface SkillStats {
  normalAttack: { damage: number; count: number };
  skills: Record<string, { damage: number; heal: number; count: number; name: string; type: string }>;
}

// 战斗日志条目
export interface BattleLogEntry {
  roundNumber: number;
  type: 'damage' | 'heal' | 'skill' | 'buff' | 'debuff' | 'status' | 'death' | 'dodge' | 'system' | 'normal_attack' | 'crit';
  message: string;
  sourceGeneralId?: string;
  targetGeneralId?: string;
}

// 战斗状态
export interface RoundSnapshot {
  round: number;
  generals: {
    generalId: string;
    name: string;
    side: 'player' | 'enemy';
    hp: number;
    maxHp: number;
    accumulatedDamage: number;
  }[];
}

export interface BattleState {
  phase: BattlePhase;
  roundNumber: number;
  maxRounds: number;
  playerTeam: Team;
  enemyTeam: Team;
  turnOrder: BattleGeneral[];
  currentTurnIndex: number;
  battleLog: BattleLogEntry[];
  winner: 'player' | 'enemy' | 'draw' | null;
  playerTotalDamage: Record<string, number>;
  enemyTotalDamage: Record<string, number>;
  playerSkillStats: Record<string, SkillStats>;
  enemySkillStats: Record<string, SkillStats>;
  currentSkillId?: string;
  currentSkillName?: string;
  currentSkillType?: string;
  _inAllySkillChain?: boolean;  // 防递归标记
  stepCount: number;
  roundSnapshots: RoundSnapshot[];
}
