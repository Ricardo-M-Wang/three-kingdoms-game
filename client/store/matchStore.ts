import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';
import { useGameStore } from './gameStore';

interface MatchState {
  socket: Socket | null;
  status: 'idle' | 'queueing' | 'matched' | 'playing' | 'finished';
  gameId: string | null;
  opponent: { id: number; username: string } | null;

  // Phase state
  phase: string | null;
  round: number;
  maxRounds: number;
  timer: number;
  pool: any[];
  myGenerals: any[];
  opponentGenerals: any[];
  myPicks: string[];
  opponentPicks: string[];
  myBanned: string | null;
  myBanChoice: string | null;
  opponentBanned: string | null;
  mySide: 'player1' | 'player2' | null;
  opponentReady: boolean;
  opponentTeam: any[] | null;  // opponent's configured team from config phase
  myBattleConfirmed: boolean;
  opponentBattleConfirmed: boolean;
  score: [number, number];
  battleSeed: number;
  battleIndex: number;
  myTeam: any[] | null;  // Configured team from config phase

  // Battle replays and stats
  replays: any[];
  battleResult: { winner: string; replay: any; score: [number, number]; battleIndex: number } | null;
  reward: { winner: string; gold: number; score: [number, number]; youWon: boolean } | null;

  // Actions
  connect: (token: string) => void;
  disconnect: () => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  submitPicks: (picks: string[]) => void;
  submitBan: (generalId: string) => void;
  submitReady: (team: any) => void;
  submitBattleResult: (winner: 'player1' | 'player2', replay: any) => void;
  confirmBattleContinue: () => void;
  reset: () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  socket: null,
  status: 'idle',
  gameId: null,
  opponent: null,
  phase: null,
  round: 1,
  maxRounds: 1,
  timer: 0,
  pool: [],
  myGenerals: [],
  opponentGenerals: [],
  myPicks: [],
  opponentPicks: [],
  myBanned: null,
  myBanChoice: null,
  opponentBanned: null,
  opponentReady: false,
  opponentTeam: null,
  myBattleConfirmed: false,
  opponentBattleConfirmed: false,
  mySide: null,
  score: [0, 0],
  battleSeed: 0,
  battleIndex: 0,
  myTeam: null,
  replays: [],
  battleResult: null,
  reward: null,

  connect: (token: string) => {
    const existing = get().socket;
    if (existing) existing.disconnect();

    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));

    socket.on('match:waiting', () => set({ status: 'queueing' }));
    socket.on('match:cancelled', () => set({ status: 'idle' }));
    socket.on('game:error', (data: any) => console.error('Game error:', data.message));

    socket.on('game:found', (data: any) => {
      set({ status: 'matched', gameId: data.gameId, opponent: data.opponent });
    });

    socket.on('game:phase', (data: any) => {
      set({
        status: 'playing',
        phase: data.phase,
        round: data.round || 1,
        maxRounds: data.maxRounds || 1,
        pool: data.pool || [],
        myGenerals: data.myGenerals || [],
        opponentGenerals: data.opponentGenerals || [],
        myPicks: data.myPicks || [],
        opponentPicks: data.opponentPicks || [],
        myBanned: data.myBanned || null,
        myBanChoice: data.myBanChoice || null,
        opponentBanned: data.opponentBanned || null,
        opponentReady: data.opponentReady || false,
        opponentTeam: data.opponentTeam || null,
        myBattleConfirmed: data.myBattleConfirmed || false,
        opponentBattleConfirmed: data.opponentBattleConfirmed || false,
        battleResult: null,
        score: data.score || [0, 0],
        mySide: data.mySide || null,
        battleSeed: data.battleSeed || 0,
        battleIndex: data.battleIndex || 0,
      });
    });

    socket.on('game:timer', (data: any) => set({ timer: data.timer }));

    socket.on('game:battleResult', (data: any) => {
      set({
        battleResult: {
          winner: data.winner,
          replay: data.replay,
          score: data.score,
          battleIndex: data.battleIndex,
        },
        myBattleConfirmed: false,
        opponentBattleConfirmed: false,
      });
    });

    socket.on('game:opponentConfirmed', () => {
      set({ opponentBattleConfirmed: true });
    });

    socket.on('game:reward', (data: any) => {
      // Sync gold to gameStore (server already updated DB, match local)
      const gs = useGameStore.getState();
      gs.addGold(data.gold);
      set({
        status: 'finished',
        reward: { winner: data.winner, gold: data.gold, score: data.score, youWon: data.youWon },
        replays: get().replays,
      });
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, status: 'idle' });
  },

  joinQueue: () => {
    get().socket?.emit('match:join');
  },

  leaveQueue: () => {
    get().socket?.emit('match:leave');
    set({ status: 'idle' });
  },

  submitPicks: (picks: string[]) => {
    get().socket?.emit('draft:pick', { gameId: get().gameId, picks });
  },

  submitBan: (generalId: string) => {
    get().socket?.emit('ban:select', { gameId: get().gameId, generalId });
  },

  submitReady: (team: any) => {
    set({ myTeam: team });
    get().socket?.emit('config:ready', { gameId: get().gameId, team });
  },

  submitBattleResult: (winner: 'player1' | 'player2', replay: any) => {
    const s = get();
    set({ replays: [...s.replays, replay] });
    s.socket?.emit('battle:result', { gameId: s.gameId, winner, replay });
  },

  confirmBattleContinue: () => {
    const s = get();
    set({ myBattleConfirmed: true });
    s.socket?.emit('battle:continue', { gameId: s.gameId });
  },

  reset: () => {
    get().socket?.disconnect();
    set({
      status: 'idle', gameId: null, opponent: null, phase: null,
      pool: [], myGenerals: [], opponentGenerals: [],
      myPicks: [], opponentPicks: [], myBanned: null, myBanChoice: null, opponentBanned: null,
      opponentReady: false, opponentTeam: null, myBattleConfirmed: false, opponentBattleConfirmed: false,
      mySide: null, score: [0, 0], battleSeed: 0, battleIndex: 0,
      myTeam: null, replays: [], battleResult: null, reward: null,
    });
  },
}));
