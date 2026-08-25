import { create } from 'zustand';
import { allGenerals, generalSkills } from '../data';
import { apiPut, apiPost } from '../lib/api';

export type GamePhase = 'menu' | 'teamBuild' | 'battle' | 'result';

export interface SaveData {
  gold: number;
  ownedGenerals: Record<string, number>;
  ownedSkills: string[];
}

export const MAX_ADVANCEMENT = 5;
export const ADVANCEMENT_POINTS = 10;
export const GACHA_COST = 100;
export const GACHA_5_COST = 450;

const PENDING_SYNC_KEY = 'pending_gacha_syncs';

interface PendingGachaSync {
  cost: number;
  results: { type: string; id: string; isDuplicate?: boolean }[];
}

function getPendingSyncs(): PendingGachaSync[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function clearPendingSyncs() {
  localStorage.removeItem(PENDING_SYNC_KEY);
}

function addPendingSync(sync: PendingGachaSync) {
  const pending = getPendingSyncs();
  pending.push(sync);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
}

interface GameStore extends SaveData {
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;

  // 从服务器加载数据
  loadPlayerData: (data: { gold: number; generals: Record<string, number>; skills: string[] }) => void;

  // 金币
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;

  // 武将进阶
  getAdvancement: (generalId: string) => number;
  addGeneralCopy: (generalId: string) => void;

  // 战法
  hasSkill: (skillId: string) => boolean;
  addSkill: (skillId: string) => boolean;

  // 抽卡 (立即扣金币+更新进阶本地)
  drawGachaLocal: () => { type: 'general'; id: string; name: string; isDuplicate: boolean; newAdvancement: number } | { type: 'skill'; id: string; name: string } | null;

  // 5连抽 (立即扣金币+批量更新本地)
  drawGachaLocal5: () => ({ type: 'general'; id: string; name: string; isDuplicate: boolean; newAdvancement: number } | { type: 'skill'; id: string; name: string })[];

  // 向服务器同步抽卡结果
  sendGachaResult: (cost: number, results: { type: string; id: string; isDuplicate?: boolean }[]) => Promise<SaveData | null>;

  // 重试未成功的抽卡同步
  replayPendingSyncs: () => Promise<void>;

  // 重置账号
  reset: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  gold: 2000,
  ownedGenerals: {},
  ownedSkills: [],

  setPhase: (phase: GamePhase) => set({ phase }),

  loadPlayerData: (data) => {
    set({
      gold: data.gold,
      ownedGenerals: data.generals,
      ownedSkills: data.skills,
    });
    // Replay any failed gacha syncs from previous session
    const pending = getPendingSyncs();
    if (pending.length > 0) {
      // Fire and forget — will reconcile on success
      get().replayPendingSyncs();
    }
  },

  addGold: (amount: number) => set(s => ({ gold: s.gold + amount })),

  spendGold: (amount: number) => {
    const state = get();
    if (state.gold < amount) return false;
    set({ gold: state.gold - amount });
    return true;
  },

  getAdvancement: (generalId: string) => get().ownedGenerals[generalId] ?? 0,

  addGeneralCopy: (generalId: string) => {
    const state = get();
    const current = state.ownedGenerals[generalId] ?? 0;
    if (current >= MAX_ADVANCEMENT) {
      set(s => ({ gold: s.gold + 50 }));
    } else {
      set({ ownedGenerals: { ...state.ownedGenerals, [generalId]: current + 1 } });
    }
  },

  hasSkill: (skillId: string) => get().ownedSkills.includes(skillId),

  addSkill: (skillId: string) => {
    const state = get();
    if (state.ownedSkills.includes(skillId)) return false;
    set({ ownedSkills: [...state.ownedSkills, skillId] });
    return true;
  },

  // 抽卡 (本地随机 + 立即扣金币 + 立即更新进阶)
  drawGachaLocal: () => {
    const state = get();
    if (state.gold < GACHA_COST) return null;
    set({ gold: state.gold - GACHA_COST });

    const isGeneral = Math.random() < 0.5;

    if (isGeneral) {
      const pool = [...allGenerals];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const currentAdv = state.ownedGenerals[picked.id] ?? 0;
      const isDuplicate = currentAdv > 0;
      const newAdv = Math.min(currentAdv + 1, MAX_ADVANCEMENT);

      // 立即更新本地状态
      if (currentAdv >= MAX_ADVANCEMENT) {
        set(s => ({ gold: s.gold + 50 })); // 满阶退金币
      } else {
        set({ ownedGenerals: { ...state.ownedGenerals, [picked.id]: newAdv } });
      }

      return {
        type: 'general' as const,
        id: picked.id,
        name: picked.name,
        isDuplicate,
        newAdvancement: newAdv,
      };
    } else {
      const availableSkills = generalSkills.filter(s => !state.ownedSkills.includes(s.id));
      if (availableSkills.length === 0) {
        // 战法已全部拥有，改为抽武将
        const pool = [...allGenerals];
        const picked = pool[Math.floor(Math.random() * pool.length)];
        const currentAdv = state.ownedGenerals[picked.id] ?? 0;
        const newAdv = Math.min(currentAdv + 1, MAX_ADVANCEMENT);
        if (currentAdv >= MAX_ADVANCEMENT) {
          set(s => ({ gold: s.gold + 50 }));
        } else {
          set({ ownedGenerals: { ...state.ownedGenerals, [picked.id]: newAdv } });
        }
        return {
          type: 'general' as const,
          id: picked.id,
          name: picked.name,
          isDuplicate: currentAdv > 0,
          newAdvancement: newAdv,
        };
      }
      const picked = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      // 立即更新本地状态
      set({ ownedSkills: [...state.ownedSkills, picked.id] });
      return { type: 'skill' as const, id: picked.id, name: picked.name };
    }
  },

  drawGachaLocal5: () => {
    const state = get();
    if (state.gold < GACHA_5_COST) return [];
    set({ gold: state.gold - GACHA_5_COST });

    const results: any[] = [];
    const pickedSkillIds = new Set(state.ownedSkills);
    let newGenerals = { ...state.ownedGenerals };
    let newSkills = [...state.ownedSkills];
    let goldAdjust = 0;

    for (let i = 0; i < 5; i++) {
      const isGeneral = Math.random() < 0.5;

      if (isGeneral) {
        const pool = [...allGenerals];
        const picked = pool[Math.floor(Math.random() * pool.length)];
        const currentAdv = (newGenerals[picked.id] ?? 0)
          + results.filter(r => r.type === 'general' && r.id === picked.id).length;
        const isDuplicate = currentAdv > 0;
        const newAdv = Math.min(currentAdv + 1, MAX_ADVANCEMENT);
        if (currentAdv >= MAX_ADVANCEMENT) {
          goldAdjust += 50;
        } else {
          newGenerals = { ...newGenerals, [picked.id]: newAdv };
        }
        results.push({
          type: 'general' as const,
          id: picked.id,
          name: picked.name,
          isDuplicate,
          newAdvancement: newAdv,
        });
      } else {
        const availableSkills = generalSkills.filter(s => !pickedSkillIds.has(s.id));
        if (availableSkills.length === 0) {
          // 战法全拥有，改抽武将
          const pool = [...allGenerals];
          const picked = pool[Math.floor(Math.random() * pool.length)];
          const currentAdv = (newGenerals[picked.id] ?? 0)
            + results.filter(r => r.type === 'general' && r.id === picked.id).length;
          const newAdv = Math.min(currentAdv + 1, MAX_ADVANCEMENT);
          if (currentAdv >= MAX_ADVANCEMENT) {
            goldAdjust += 50;
          } else {
            newGenerals = { ...newGenerals, [picked.id]: newAdv };
          }
          results.push({
            type: 'general' as const,
            id: picked.id,
            name: picked.name,
            isDuplicate: currentAdv > 0,
            newAdvancement: newAdv,
          });
        } else {
          const picked = availableSkills[Math.floor(Math.random() * availableSkills.length)];
          pickedSkillIds.add(picked.id);
          newSkills = [...newSkills, picked.id];
          results.push({ type: 'skill' as const, id: picked.id, name: picked.name });
        }
      }
    }

    // 批量更新本地状态
    set({ ownedGenerals: newGenerals, ownedSkills: newSkills });
    if (goldAdjust > 0) set(s => ({ gold: s.gold + goldAdjust }));
    return results;
  },

  sendGachaResult: async (cost, results) => {
    try {
      // Replay any previously failed syncs first
      const pendingSyncs = getPendingSyncs();
      for (const ps of pendingSyncs) {
        try {
          await apiPut('/player/gacharesult', { cost: ps.cost, results: ps.results });
        } catch {
          // Still failing — leave in queue for next attempt
          break;
        }
      }

      // Send current gacha result
      const data = await apiPut('/player/gacharesult', { cost, results });
      clearPendingSyncs();

      // Reconcile with server-authoritative state
      set({
        gold: data.gold,
        ownedGenerals: data.generals,
        ownedSkills: data.skills,
      });
      return { gold: data.gold, ownedGenerals: data.generals, ownedSkills: data.skills };
    } catch {
      // Server unavailable — save to pending queue for retry on next login
      addPendingSync({ cost, results });
      return null;
    }
  },

  // Replay any pending gacha syncs against the server
  replayPendingSyncs: async () => {
    const pending = getPendingSyncs();
    if (pending.length === 0) return;
    let allDone = true;
    for (const ps of pending) {
      try {
        await apiPut('/player/gacharesult', { cost: ps.cost, results: ps.results });
      } catch {
        allDone = false;
        break;
      }
    }
    if (allDone) clearPendingSyncs();
  },

  reset: async () => {
    try {
      const data = await apiPost('/player/reset');
      set({ phase: 'menu', gold: data.gold, ownedGenerals: data.generals, ownedSkills: data.skills });
    } catch {
      // silently fail
    }
  },
}));
