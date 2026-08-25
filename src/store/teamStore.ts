import { create } from 'zustand';
import type { BattleGeneral, GeneralDef } from '../types';
import type { SkillDef } from '../types/skill';
import { allGenerals, generalSkills } from '../data';
import { computeBaseAttributes, refreshEffectiveAttributes } from '../engine';
import { BASE_FREE_POINTS, ADVANCEMENT_POINTS } from '../types/general';
import { useGameStore } from './gameStore';

// 保存的阵容
export interface TeamPreset {
  id: string;
  name: string;
  createdAt: string;
  generals: {
    generalId: string;
    freePoints: { atk: number; int: number; def: number; spd: number };
    equippedSkillIds: [string, string];
  }[];
}

const PRESETS_KEY = 'three_kingdoms_team_presets';

function loadPresets(): TeamPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePresets(presets: TeamPreset[]): void {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

interface TeamStore {
  playerGenerals: BattleGeneral[];
  enemyGenerals: BattleGeneral[];
  selectedGeneralIndex: number;
  selectedEnemyIndex: number;
  editingSide: 'player' | 'enemy';

  // 选择/移除武将
  selectGeneral: (index: number, generalDef: GeneralDef) => void;
  removeGeneral: (index: number) => void;
  selectSlot: (index: number) => void;
  selectEnemySlot: (index: number) => void;
  setEditingSide: (side: 'player' | 'enemy') => void;
  removeEnemyGeneral: (index: number) => void;

  // 自由属性点
  allocatePoint: (index: number, attr: 'atk' | 'int' | 'def' | 'spd', delta: number, side?: 'player' | 'enemy') => void;
  allocateAllPoints: (index: number, attr: 'atk' | 'int' | 'def' | 'spd', side?: 'player' | 'enemy') => void;
  resetAllPoints: (index: number, side?: 'player' | 'enemy') => void;

  // 战法选择
  equipSkill: (index: number, skillSlot: 0 | 1, skillId: string, side?: 'player' | 'enemy') => void;
  unequipSkill: (index: number, skillSlot: 0 | 1, side?: 'player' | 'enemy') => void;

  // 敌方队伍
  randomEnemyTeam: () => void;
  setEnemyGeneral: (index: number, generalDef: GeneralDef) => void;

  // 获取可用战法列表
  getAvailableSkills: (index: number, side?: 'player' | 'enemy') => SkillDef[];

  // 阵容保存/加载
  presets: TeamPreset[];
  savePreset: (name: string, side: 'player' | 'enemy') => void;
  deletePreset: (id: string) => void;
  applyPreset: (id: string, side: 'player' | 'enemy') => void;
}

function createEmptyGeneral(def: GeneralDef, side: 'player' | 'enemy'): BattleGeneral {
  const baseAttrs = computeBaseAttributes(def.ranks);
  const advancement = side === 'player' ? useGameStore.getState().getAdvancement(def.id) : 0;
  const maxFreePoints = BASE_FREE_POINTS + advancement * ADVANCEMENT_POINTS;
  const g: BattleGeneral = {
    generalId: def.id, name: def.name, portrait: def.portrait, side,
    baseAttributes: baseAttrs,
    freePoints: { atk: 0, int: 0, def: 0, spd: 0 },
    maxFreePoints,
    advancement,
    innateSkillId: def.innateSkillId,
    equippedSkillIds: ['', ''],
    currentHp: 10000, maxHp: 10000, isAlive: true,
    isStunned: false, isSilenced: false, isDisarmed: false,
    hasArmorBreak: false, hasFormationBreak: false, hasInsight: false,
    hasDoubleStrike: false, hasClarity: false, hasPenetrate: false,
    buffs: [], statuses: [],
    floodStacks: 0, fearStacks: 0,
    atkBonusPercent: 0, intBonusPercent: 0, defBonusPercent: 0, spdBonusPercent: 0,
    damageBonus: 0, damageReduction: 0, takenBonus: 0, takenReduction: 0,
    critRate: 0, critDamage: 150,
    lifestealPhysical: 0, lifestealMagical: 0,
    dodgeRate: 0, counterDamageBonus: 0,
    activeSkillRateBonus: 0,
    effectiveAttributes: { atk: 0, int: 0, def: 0, spd: 0, hp: 10000 },
    customState: {},
  };
  refreshEffectiveAttributes(g);
  return g;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  playerGenerals: [],
  enemyGenerals: [],
  selectedGeneralIndex: -1,
  selectedEnemyIndex: -1,
  editingSide: 'player',
  presets: loadPresets(),

  selectGeneral: (index: number, generalDef: GeneralDef) => {
    set(state => {
      const newGenerals = [...state.playerGenerals];
      newGenerals[index] = createEmptyGeneral(generalDef, 'player');
      return { playerGenerals: newGenerals, selectedGeneralIndex: index, editingSide: 'player' };
    });
  },

  removeGeneral: (index: number) => {
    set(state => {
      const newGenerals = [...state.playerGenerals];
      newGenerals.splice(index, 1);
      return { playerGenerals: newGenerals, selectedGeneralIndex: -1 };
    });
  },

  selectSlot: (index: number) => set({ selectedGeneralIndex: index, editingSide: 'player' }),

  selectEnemySlot: (index: number) => set({ selectedEnemyIndex: index, editingSide: 'enemy' }),

  setEditingSide: (side: 'player' | 'enemy') => set({ editingSide: side }),

  removeEnemyGeneral: (index: number) => {
    set(state => {
      const enemies = [...state.enemyGenerals];
      enemies.splice(index, 1);
      return { enemyGenerals: enemies, selectedEnemyIndex: -1 };
    });
  },

  allocatePoint: (index: number, attr, delta, side = 'player') => {
    set(state => {
      const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
      const generals = [...state[key]];
      if (!generals[index]) return state;
      const g = { ...generals[index], freePoints: { ...generals[index].freePoints } };

      const currentTotal = g.freePoints.atk + g.freePoints.int + g.freePoints.def + g.freePoints.spd;
      if (delta > 0 && currentTotal >= g.maxFreePoints) return state;
      if (delta < 0 && g.freePoints[attr] <= 0) return state;

      g.freePoints = { ...g.freePoints, [attr]: g.freePoints[attr] + delta };
      generals[index] = g;
      refreshEffectiveAttributes(g);
      return { [key]: generals } as any;
    });
  },

  allocateAllPoints: (index: number, attr, side = 'player') => {
    set(state => {
      const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
      const generals = [...state[key]];
      if (!generals[index]) return state;
      const g = { ...generals[index], freePoints: { ...generals[index].freePoints } };

      const currentTotal = g.freePoints.atk + g.freePoints.int + g.freePoints.def + g.freePoints.spd;
      const remaining = g.maxFreePoints - currentTotal;
      if (remaining <= 0) return state;

      g.freePoints = {
        atk: attr === 'atk' ? g.freePoints.atk + remaining : g.freePoints.atk,
        int: attr === 'int' ? g.freePoints.int + remaining : g.freePoints.int,
        def: attr === 'def' ? g.freePoints.def + remaining : g.freePoints.def,
        spd: attr === 'spd' ? g.freePoints.spd + remaining : g.freePoints.spd,
      };
      generals[index] = g;
      refreshEffectiveAttributes(g);
      return { [key]: generals } as any;
    });
  },

  resetAllPoints: (index: number, side = 'player') => {
    set(state => {
      const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
      const generals = [...state[key]];
      if (!generals[index]) return state;
      const g = { ...generals[index], freePoints: { atk: 0, int: 0, def: 0, spd: 0 } };
      generals[index] = g;
      refreshEffectiveAttributes(g);
      return { [key]: generals } as any;
    });
  },

  equipSkill: (index: number, skillSlot, skillId, side = 'player') => {
    set(state => {
      const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
      const generals = [...state[key]];
      if (!generals[index]) return state;

      // 检查同队伍是否有其他武将已装备此战法
      const duplicateGeneral = generals.find((gen, i) =>
        i !== index && gen && (gen.equippedSkillIds[0] === skillId || gen.equippedSkillIds[1] === skillId)
      );
      if (duplicateGeneral) return state; // 重复战法，不允许

      const g = { ...generals[index], equippedSkillIds: [...generals[index].equippedSkillIds] as [string, string] };
      g.equippedSkillIds[skillSlot] = skillId;
      generals[index] = g;
      return { [key]: generals } as any;
    });
  },

  unequipSkill: (index: number, skillSlot, side = 'player') => {
    set(state => {
      const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
      const generals = [...state[key]];
      if (!generals[index]) return state;
      const g = { ...generals[index], equippedSkillIds: [...generals[index].equippedSkillIds] as [string, string] };
      g.equippedSkillIds[skillSlot] = '';
      generals[index] = g;
      return { [key]: generals } as any;
    });
  },

  randomEnemyTeam: () => {
    const shuffled = [...allGenerals].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    const enemyGens = picked.map(def => {
      const g = createEmptyGeneral(def, 'enemy');
      let remaining = BASE_FREE_POINTS;
      const attrs: ('atk' | 'int' | 'def' | 'spd')[] = ['atk', 'int', 'def', 'spd'];
      for (const attr of attrs) {
        const pts = Math.floor(Math.random() * (remaining + 1));
        g.freePoints[attr] = pts;
        remaining -= pts;
      }
      const availableSkills = generalSkills.filter(s =>
        s.type !== def.skillType || s.id !== def.innateSkillId
      );
      const pickedSkills = [...availableSkills].sort(() => Math.random() - 0.5).slice(0, 2);
      g.equippedSkillIds = [pickedSkills[0]?.id ?? '', pickedSkills[1]?.id ?? ''];
      refreshEffectiveAttributes(g);
      return g;
    });
    set({ enemyGenerals: enemyGens, selectedEnemyIndex: -1 });
  },

  setEnemyGeneral: (index: number, def: GeneralDef) => {
    set(state => {
      const enemies = [...state.enemyGenerals];
      enemies[index] = createEmptyGeneral(def, 'enemy');
      return { enemyGenerals: enemies, selectedEnemyIndex: index, editingSide: 'enemy' };
    });
  },

  getAvailableSkills: (index: number, side = 'player') => {
    const state = get();
    const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
    const g = state[key][index];
    if (!g) return [];
    const equipped = g.equippedSkillIds.filter(Boolean);
    const ownedSkills = useGameStore.getState().ownedSkills;
    // For player side: filter by ownership. For enemy side: show all.
    if (side === 'player') {
      return generalSkills.filter(s => ownedSkills.includes(s.id) && !equipped.includes(s.id));
    }
    return generalSkills.filter(s => !equipped.includes(s.id));
  },

  // 阵容保存/加载
  savePreset: (name: string, side: 'player' | 'enemy') => {
    const state = get();
    const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
    const generals = state[key];
    if (generals.length === 0) return;

    const preset: TeamPreset = {
      id: Date.now().toString(36),
      name,
      createdAt: new Date().toLocaleString('zh-CN'),
      generals: generals.map(g => ({
        generalId: g.generalId,
        freePoints: { ...g.freePoints },
        equippedSkillIds: [...g.equippedSkillIds],
      })),
    };

    const presets = [...state.presets, preset];
    savePresets(presets);
    set({ presets });
  },

  deletePreset: (id: string) => {
    const state = get();
    const presets = state.presets.filter(p => p.id !== id);
    savePresets(presets);
    set({ presets });
  },

  applyPreset: (id: string, side: 'player' | 'enemy') => {
    const state = get();
    const preset = state.presets.find(p => p.id === id);
    if (!preset) return;

    const generals = preset.generals.map(g => {
      const def = allGenerals.find(d => d.id === g.generalId);
      if (!def) return null;
      const gen = createEmptyGeneral(def, side);
      gen.freePoints = { ...g.freePoints };
      gen.equippedSkillIds = [...g.equippedSkillIds];
      refreshEffectiveAttributes(gen);
      return gen;
    }).filter(Boolean) as BattleGeneral[];

    const key = side === 'player' ? 'playerGenerals' : 'enemyGenerals';
    set({
      [key]: generals,
      selectedGeneralIndex: side === 'player' ? 0 : -1,
      selectedEnemyIndex: side === 'enemy' ? 0 : -1,
      editingSide: side,
    } as any);
  },
}));
