// 简单的可种子随机数生成器 (mulberry32)
export function createRNG(seed: number) {
  let state = seed | 0;
  return function (): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 默认RNG (基于当前时间种子)
let defaultRNG = createRNG(Date.now());

export function setSeed(seed: number) {
  defaultRNG = createRNG(seed);
}

export function random(): number {
  return defaultRNG();
}

// 概率判定: rate 0-100
export function rollChance(rate: number): boolean {
  if (rate >= 100) return true;
  if (rate <= 0) return false;
  return random() * 100 < rate;
}

// 随机整数 [min, max]
export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

// 随机选择数组元素
export function randomPick<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(random() * arr.length)];
}

// 随机打乱数组
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
