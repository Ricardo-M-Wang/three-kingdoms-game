import { create } from 'zustand';
import type { BattleState, BattleLogEntry, Team } from '../types';
import { createBattleState, processBattleStep, runFullBattle } from '../engine';
import { eventBus } from '../engine';
import { useGameStore } from './gameStore';
import { getSkillById } from '../data';
import { createSeededRandom } from '../engine/seededRandom';

let battleRng: (() => number) | null = null;

export interface AnimationState {
  generalId: string;
  targetId?: string;
  animation: 'attacking' | 'hit' | 'crit' | 'killed' | 'casting' | 'healing' | 'dodge' | 'none';
  floatingText: string;
}

export interface SkillEffect {
  skillId: string;
  skillName: string;
  casterId: string;
  element: 'fire' | 'water' | 'lightning' | 'wind' | 'physical' | 'magical' | 'heal' | 'buff' | 'debuff';
}

// 技能ID → 元素类型映射
function getSkillElement(skillId: string): SkillEffect['element'] {
  const fire = new Set(['huoshaolianying', 'huoshaochibi', 'dianhuo']);
  const water = new Set(['shuiyanqijun', 'jushuiduanqiao']);
  const lightning = new Set(['wuleihongding']);
  const wind = new Set(['kuangfengdazuo', 'bingguishensu']);
  const heal = new Set(['jijiu', 'taoyuanjieyi']);
  const buff = new Set([
    'biyue', 'quanyujiangdong', 'hubaoxiongqi', 'guruojintang', 'xianzhenzhizhi',
    'wangzuo', 'luanshixiaoxiong', 'wuqian', 'qiaobian', 'yacibibao',
    'xiandeng', 'shensu', 'fange', 'wenwushuangquan', 'keji',
    'huixin', 'lianpo', 'ruibukedang', 'taoguangyanghui', 'sheshengquyi',
    'biqiruizhi', 'bubuweijing', 'shenweitainjiangjun',
  ]);
  const debuff = new Set(['ganglie', 'beifazhizhi', 'guzhielai', 'haolingqunxiong']);
  if (fire.has(skillId)) return 'fire';
  if (water.has(skillId)) return 'water';
  if (lightning.has(skillId)) return 'lightning';
  if (wind.has(skillId)) return 'wind';
  if (heal.has(skillId)) return 'heal';
  if (buff.has(skillId)) return 'buff';
  if (debuff.has(skillId)) return 'debuff';
  // 智力伤害 → magical, 武力伤害 → physical
  if (skillId.includes('haolingqunxiong')) return 'magical';
  return 'physical';
}

interface BattleStore {
  battleState: BattleState | null;
  isPlaying: boolean;
  playbackSpeed: number;

  initBattle: (playerTeam: Team, enemyTeam: Team, seed?: number) => void;
  stepForward: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (ms: number) => void;
  runToEnd: () => void;
  getBattleLog: () => BattleLogEntry[];

  playerTopDamage: { name: string; damage: number } | null;
  enemyTopDamage: { name: string; damage: number } | null;

  animations: AnimationState[];
  clearAnimations: () => void;

  currentSkillEffect: SkillEffect | null;
  setSkillEffect: (effect: SkillEffect | null) => void;
  screenShake: boolean;

  inspectedGeneralId: string | null;
  setInspectedGeneral: (id: string | null) => void;
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  battleState: null,
  isPlaying: false,
  playbackSpeed: 500,
  playerTopDamage: null,
  enemyTopDamage: null,
  animations: [],
  currentSkillEffect: null,
  screenShake: false,

  initBattle: (playerTeam: Team, enemyTeam: Team, seed?: number) => {
    if (seed !== undefined) {
      battleRng = createSeededRandom(seed);
      Math.random = battleRng;
    }
    eventBus.clear();
    const state = createBattleState(playerTeam, enemyTeam);

    // 监听战斗事件并创建动画
    eventBus.on('damage:dealt', (result: any) => {
      const anims: AnimationState[] = [];
      const dmg = result.finalDamage ?? 0;
      const dmgText = dmg > 0 ? `-${Math.round(dmg)}` : '';
      const sourceId = result.sourceId || result.sourceGeneralId || '';
      const targetId = result.targetId || result.targetGeneralId || '';

      if (result.isCrit) {
        anims.push({
          generalId: sourceId,
          targetId,
          animation: 'attacking',
          floatingText: '',
        });
        anims.push({
          generalId: targetId,
          targetId: sourceId,
          animation: 'crit',
          floatingText: dmgText,
        });
      } else {
        anims.push({
          generalId: sourceId,
          targetId,
          animation: 'attacking',
          floatingText: '',
        });
        anims.push({
          generalId: targetId,
          targetId: sourceId,
          animation: 'hit',
          floatingText: dmgText,
        });
      }
      set({ animations: [...get().animations, ...anims].slice(-12) });
    });

    eventBus.on('heal:applied', (target: any, amount: number) => {
      set({
        animations: [...get().animations, {
          generalId: target.generalId,
          animation: 'healing',
          floatingText: `+${Math.round(amount)}`,
        }].slice(-10),
      });
    });

    eventBus.on('dodge:triggered', (dodger: any) => {
      set({
        animations: [...get().animations, {
          generalId: dodger.generalId,
          animation: 'dodge',
          floatingText: '闪避!',
        }].slice(-10),
      });
    });

    eventBus.on('general:died', (general: any, state: BattleState) => {
      set({
        animations: [...get().animations, {
          generalId: general.generalId,
          animation: 'killed',
          floatingText: '',
        }].slice(-10),
      });
    });

    eventBus.on('skill:trigger', (general: any, skillId: string, skillName: string) => {
      const effect: SkillEffect = {
        skillId,
        skillName: skillName || getSkillById(skillId)?.name || skillId,
        casterId: general.generalId,
        element: getSkillElement(skillId),
      };
      const isBigSkill = ['huoshaolianying', 'shuiyanqijun', 'wuleihongding', 'kuangfengdazuo',
        'huoshaochibi', 'podi', 'luanwu', 'huxiao'].includes(skillId);
      set({
        animations: [...get().animations, {
          generalId: general.generalId,
          animation: 'casting',
          floatingText: '',
        }].slice(-10),
        currentSkillEffect: effect,
        screenShake: isBigSkill,
      });
      // 动画结束后清除
      setTimeout(() => {
        const current = get().currentSkillEffect;
        if (current?.skillId === skillId) {
          set({ currentSkillEffect: null });
        }
        set({ screenShake: false });
      }, isBigSkill ? 2000 : 1500);
    });

    // 监听战斗结束
    eventBus.on('battle:end', (winner: string, finalState: BattleState) => {
      const playerDmg = Object.entries(finalState.playerTotalDamage);
      const enemyDmg = Object.entries(finalState.enemyTotalDamage);

      const playerTop = playerDmg.sort(([, a], [, b]) => b - a)[0];
      const enemyTop = enemyDmg.sort(([, a], [, b]) => b - a)[0];

      const pName = playerTop ? playerTeam.generals.find(g => g.generalId === playerTop[0])?.name ?? '' : '';
      const eName = enemyTop ? enemyTeam.generals.find(g => g.generalId === enemyTop[0])?.name ?? '' : '';

      set({
        playerTopDamage: playerTop ? { name: pName, damage: playerTop[1] } : null,
        enemyTopDamage: enemyTop ? { name: eName, damage: enemyTop[1] } : null,
        isPlaying: false,
      });
    });

    set({ battleState: state, isPlaying: false, animations: [] });
    useGameStore.getState().setPhase('battle');
  },

  stepForward: () => {
    const state = get().battleState;
    if (!state || state.phase === 'finished') {
      get().pause();
      return;
    }
    get().clearAnimations();
    const newState = processBattleStep({ ...state, battleLog: [...eventBus.getLogs()] });
    newState.battleLog = [...eventBus.getLogs()];
    set({ battleState: newState });
  },

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  setSpeed: (ms: number) => set({ playbackSpeed: ms }),

  runToEnd: () => {
    const state = get().battleState;
    if (!state) return;
    get().clearAnimations();
    const finalState = runFullBattle({ ...state, battleLog: [...eventBus.getLogs()] });
    finalState.battleLog = [...eventBus.getLogs()];
    set({ battleState: finalState, isPlaying: false });
  },

  getBattleLog: () => get().battleState?.battleLog ?? [],

  clearAnimations: () => set({ animations: [], currentSkillEffect: null }),

  inspectedGeneralId: null,
  setInspectedGeneral: (id: string | null) => set({ inspectedGeneralId: id }),
  setSkillEffect: (effect: SkillEffect | null) => set({ currentSkillEffect: effect }),
}));
