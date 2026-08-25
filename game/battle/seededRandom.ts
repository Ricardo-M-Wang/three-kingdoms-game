// Mulberry32 seeded PRNG — deterministic random for battle sync
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Override Math.random with seeded version during battle, restore after
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const orig = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}
