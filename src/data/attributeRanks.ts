import type { AttributeRank } from '../types';

// 武力/智力等级对应数值
export const ATK_INT_VALUES: Record<AttributeRank, number> = {
  S: 200, A: 180, B: 160, C: 140, D: 100,
};

// 统帅等级对应数值
export const DEF_VALUES: Record<AttributeRank, number> = {
  S: 90, A: 80, B: 70, C: 60, D: 50,
};

// 速度等级对应数值
export const SPD_VALUES: Record<AttributeRank, number> = {
  S: 100, A: 90, B: 80, C: 70, D: 60,
};

export const BASE_HP = 10000;
export const MAX_FREE_POINTS = 50;
export const MAX_ROUNDS = 8;
