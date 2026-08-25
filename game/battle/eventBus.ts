import type { BattleState, BattleGeneral, BattleLogEntry } from '../types';
import type { DamageResult } from '../types/damage';

// 战斗事件类型
export interface BattleEventMap {
  'log': (entry: BattleLogEntry) => void;
  'battle:start': (state: BattleState) => void;
  'round:start': (round: number, state: BattleState) => void;
  'round:end': (round: number, state: BattleState) => void;
  'turn:start': (general: BattleGeneral, state: BattleState) => void;
  'turn:end': (general: BattleGeneral, state: BattleState) => void;
  'skill:trigger': (general: BattleGeneral, skillId: string, skillName: string, state: BattleState) => void;
  'damage:dealt': (result: DamageResult, state: BattleState) => void;
  'heal:applied': (target: BattleGeneral, amount: number, sourceName: string, state: BattleState) => void;
  'buff:applied': (target: BattleGeneral, buffName: string, state: BattleState) => void;
  'buff:expired': (target: BattleGeneral, buffName: string, state: BattleState) => void;
  'debuff:applied': (target: BattleGeneral, debuffName: string, stacks: number, state: BattleState) => void;
  'status:applied': (target: BattleGeneral, statusName: string, state: BattleState) => void;
  'status:expired': (target: BattleGeneral, statusName: string, state: BattleState) => void;
  'general:died': (general: BattleGeneral, state: BattleState) => void;
  'dodge:triggered': (general: BattleGeneral, attacker: BattleGeneral, state: BattleState) => void;
  'battle:end': (winner: string, state: BattleState) => void;
}

type EventHandler = (...args: any[]) => void;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private battleLog: BattleLogEntry[] = [];

  on<K extends keyof BattleEventMap>(event: K, handler: BattleEventMap[K]): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler as EventHandler);
  }

  off<K extends keyof BattleEventMap>(event: K, handler: BattleEventMap[K]): void {
    const list = this.handlers.get(event);
    if (list) {
      const idx = list.indexOf(handler as EventHandler);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit<K extends keyof BattleEventMap>(event: K, ...args: Parameters<BattleEventMap[K]>): void {
    const list = this.handlers.get(event);
    if (list) {
      for (const h of list) {
        (h as EventHandler)(...args);
      }
    }
  }

  // 添加战斗日志
  addLog(entry: BattleLogEntry): void {
    this.battleLog.push(entry);
    this.emit('log', entry);
  }

  getLogs(): BattleLogEntry[] {
    return this.battleLog;
  }

  clear(): void {
    this.handlers.clear();
    this.battleLog = [];
  }
}

// 单例
export const eventBus = new EventBus();
