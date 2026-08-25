import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'three-kingdoms-dev-secret';

interface QueuedPlayer {
  socket: Socket;
  playerId: number;
  username: string;
}

interface PlayerState {
  id: number;
  username: string;
  socketId: string;
  generals: DraftGeneral[];
  skills: string[];
  banChoice: string | null;   // what this player chose to ban from opponent
  ready: boolean;
  battleConfirmed: boolean;   // confirmed to continue after battle
  battleResults: BattleResultItem[];
  team?: any;
}

interface DraftGeneral {
  id: string;
  name: string;
  advancement: number;
  ranks: any;
}

interface BattleResultItem {
  winner: 'player1' | 'player2';
  replay: any;
}

interface GameState {
  id: string;
  player1: PlayerState;
  player2: PlayerState;
  phase: 'draft_generals' | 'ban' | 'draft_skills' | 'config' | 'battle' | 'finished';
  round: number;
  maxRounds: number;
  pool1: any[];
  pool2: any[];
  score: [number, number];
  battleIndex: number;
  battleSeed: number;           // shared RNG seed for deterministic battles
  battleResultRecorded: boolean; // prevent double-counting from both clients
  timer: number;
  timerInterval: NodeJS.Timeout | null;
}

const gameStates = new Map<string, GameState>();
const waitingQueue: QueuedPlayer[] = [];
const playerGames = new Map<number, string>();
const queuedPlayers = new Set<number>();

let io: Server;

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr: any[], count: number, exclude: Set<string>): any[] {
  const available = arr.filter((x: any) => !exclude.has(x.id));
  return shuffle(available).slice(0, count);
}

// Cache reference data from DB
let cachedGenerals: any[] | null = null;
let cachedSkills: any[] | null = null;

async function getGenerals(): Promise<any[]> {
  if (cachedGenerals) return cachedGenerals;
  const [rows] = await pool.execute('SELECT id, name, rank_atk, rank_int, rank_def, rank_spd, innate_skill_id, skill_type FROM generals');
  cachedGenerals = (rows as any[]).map(r => ({
    id: r.id, name: r.name,
    ranks: { atk: r.rank_atk, int: r.rank_int, def: r.rank_def, spd: r.rank_spd },
    innateSkillId: r.innate_skill_id, skillType: r.skill_type,
  }));
  return cachedGenerals!;
}

async function getSkills(): Promise<any[]> {
  if (cachedSkills) return cachedSkills;
  const [rows] = await pool.execute('SELECT id, name, type, activation_rate FROM skills WHERE is_innate = 0');
  cachedSkills = (rows as any[]).map(r => ({
    id: r.id, name: r.name, type: r.type, activationRate: r.activation_rate,
  }));
  return cachedSkills!;
}

function getOwnedGenerals(playerId: number): Promise<Record<string, number>> {
  return pool.execute(
    'SELECT general_id, advancement FROM player_generals WHERE player_id = ?',
    [playerId]
  ).then(([rows]) => {
    const map: Record<string, number> = {};
    for (const r of rows as any[]) {
      map[r.general_id] = r.advancement;
    }
    return map;
  });
}

function getOwnedSkills(playerId: number): Promise<string[]> {
  return pool.execute(
    'SELECT skill_id FROM player_skills WHERE player_id = ?',
    [playerId]
  ).then(([rows]) => (rows as any[]).map(r => r.skill_id));
}

function startTimer(game: GameState, duration: number, onEnd: () => void) {
  if (game.timerInterval) clearInterval(game.timerInterval);
  game.timer = duration;
  io.to(game.id).emit('game:timer', { timer: duration });
  game.timerInterval = setInterval(() => {
    game.timer--;
    io.to(game.id).emit('game:timer', { timer: game.timer });
    if (game.timer <= 0) {
      clearInterval(game.timerInterval!);
      game.timerInterval = null;
      onEnd();
    }
  }, 1000);
}

function emitPhase(game: GameState) {
  const p1 = game.player1;
  const p2 = game.player2;
  io.to(p1.socketId).emit('game:phase', buildPhaseData(game, 'player1'));
  io.to(p2.socketId).emit('game:phase', buildPhaseData(game, 'player2'));
}

function buildPhaseData(game: GameState, side: 'player1' | 'player2') {
  const isP1 = side === 'player1';
  const me = isP1 ? game.player1 : game.player2;
  const opponent = isP1 ? game.player2 : game.player1;
  const pool = isP1 ? game.pool1 : game.pool2;

  return {
    phase: game.phase,
    round: game.round,
    maxRounds: game.maxRounds,
    timer: game.timer,
    myPicks: game.phase === 'draft_generals'
      ? me.generals.map(g => g.id)
      : me.skills,
    opponentPicks: game.phase === 'draft_generals'
      ? opponent.generals.map(g => g.id)
      : opponent.skills,
    pool,
    myGenerals: opponent.banChoice
      ? me.generals.filter((g: any) => g.id !== opponent.banChoice)
      : me.generals,
    opponentGenerals: me.banChoice
      ? opponent.generals.filter((g: any) => g.id !== me.banChoice)
      : opponent.generals,
    opponentTeam: opponent.team || null,  // opponent's configured team (freePoints, equipped skills)
    myBanChoice: me.banChoice,          // what I banned (disables my ban button)
    myBanned: opponent.banChoice,        // what opponent banned from me (filters my ConfigPhase)
    opponentBanChoice: opponent.banChoice,
    opponentBanned: me.banChoice,
    opponentReady: opponent.ready,
    myBattleConfirmed: me.battleConfirmed,
    opponentBattleConfirmed: opponent.battleConfirmed,
    score: game.score,
    mySide: side,
    battleSeed: game.battleSeed,
    battleIndex: game.battleIndex,
  };
}

function endGame(game: GameState, forfeitPlayer?: 'player1' | 'player2') {
  if (game.timerInterval) clearInterval(game.timerInterval);

  let winner: 'player1' | 'player2' | null = null;
  if (forfeitPlayer) {
    winner = forfeitPlayer === 'player1' ? 'player2' : 'player1';
  } else {
    if (game.score[0] >= 2) winner = 'player1';
    else if (game.score[1] >= 2) winner = 'player2';
    else if (game.battleIndex >= 3) {
      winner = game.score[0] > game.score[1] ? 'player1' : game.score[1] > game.score[0] ? 'player2' : null;
    }
  }

  game.phase = 'finished';
  const winnerId = winner === 'player1' ? game.player1.id : winner === 'player2' ? game.player2.id : null;
  const loserId = winnerId ? (winnerId === game.player1.id ? game.player2.id : game.player1.id) : null;

  // Save match history
  const scoreStr = `${game.score[0]}-${game.score[1]}`;
  pool.execute(
    'INSERT INTO match_history (player1_id, player2_id, winner_id, score) VALUES (?, ?, ?, ?)',
    [game.player1.id, game.player2.id, winnerId, scoreStr]
  ).catch(console.error);

  // Distribute rewards
  const p1Gold = winner === 'player1' ? 500 : 200;
  const p2Gold = winner === 'player2' ? 500 : 200;
  pool.execute('UPDATE players SET gold = gold + ? WHERE id = ?', [p1Gold, game.player1.id]).catch(console.error);
  pool.execute('UPDATE players SET gold = gold + ? WHERE id = ?', [p2Gold, game.player2.id]).catch(console.error);

  io.to(game.player1.socketId).emit('game:reward', { winner, youWon: winner === 'player1', gold: p1Gold, score: game.score });
  io.to(game.player2.socketId).emit('game:reward', { winner, youWon: winner === 'player2', gold: p2Gold, score: game.score });

  // Cleanup
  playerGames.delete(game.player1.id);
  playerGames.delete(game.player2.id);
  gameStates.delete(game.id);
}

// Helper: resolve player by token
async function resolvePlayer(socket: Socket): Promise<{ id: number; username: string } | null> {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return { id: payload.id, username: payload.username };
  } catch {
    return null;
  }
}

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: [/^http:\/\/localhost:\d+$/, /\.ngrok-free\.dev$/], credentials: true },
  });

  io.on('connection', async (socket: Socket) => {
    const player = await resolvePlayer(socket);
    if (!player) {
      socket.emit('game:error', { message: '请先登录' });
      socket.disconnect();
      return;
    }

    console.log(`Player connected: ${player.username} (${socket.id})`);

    // If player was in a game, reconnect them
    const existingGameId = playerGames.get(player.id);
    if (existingGameId) {
      const game = gameStates.get(existingGameId);
      if (game) {
        const side = game.player1.id === player.id ? 'player1' : 'player2';
        const pState = side === 'player1' ? game.player1 : game.player2;
        pState.socketId = socket.id;
        socket.join(game.id);
        io.to(socket.id).emit('game:phase', buildPhaseData(game, side));
        io.to(socket.id).emit('game:timer', { timer: game.timer });
      }
    }

    socket.on('match:join', async () => {
      if (playerGames.has(player.id) || queuedPlayers.has(player.id)) {
        socket.emit('game:error', { message: '你已在匹配或游戏中' });
        return;
      }

      // Check if someone is waiting
      if (waitingQueue.length > 0) {
        const opponent = waitingQueue.shift()!;
        queuedPlayers.delete(opponent.playerId);
        if (opponent.playerId === player.id) {
          // Should not happen due to queuedPlayers check, but guard anyway
          waitingQueue.unshift(opponent);
          queuedPlayers.add(opponent.playerId);
          socket.emit('game:error', { message: '匹配失败，请重试' });
          return;
        }
        createGame(socket, player, opponent);
      } else {
        waitingQueue.push({ socket, playerId: player.id, username: player.username });
        queuedPlayers.add(player.id);
        socket.emit('match:waiting');
      }
    });

    socket.on('match:leave', () => {
      const idx = waitingQueue.findIndex(q => q.socket.id === socket.id);
      if (idx >= 0) {
        queuedPlayers.delete(waitingQueue[idx].playerId);
        waitingQueue.splice(idx, 1);
        socket.emit('match:cancelled');
      }
    });

    socket.on('draft:pick', async (data: { gameId: string; picks: string[] }) => {
      const game = gameStates.get(data.gameId);
      if (!game) return;
      const side = game.player1.socketId === socket.id ? 'player1' : 'player2';
      const pState = side === 'player1' ? game.player1 : game.player2;
      const pool = side === 'player1' ? game.pool1 : game.pool2;

      if (game.phase === 'draft_generals') {
        for (const id of data.picks) {
          const gen = pool.find((g: any) => g.id === id);
          if (gen && !pState.generals.find(g => g.id === id)) {
            pState.generals.push(gen);
          }
        }
      } else if (game.phase === 'draft_skills') {
        for (const id of data.picks) {
          if (!pState.skills.includes(id)) {
            pState.skills.push(id);
          }
        }
      }

      // Check if both players submitted
      const p1Ready = game.phase === 'draft_generals'
        ? game.player1.generals.length >= (game.round === 1 ? 2 : Math.min(8, (game.round) * 2))
        : game.player1.skills.length >= Math.min(9, game.round * 3);
      const p2Ready = game.phase === 'draft_generals'
        ? game.player2.generals.length >= (game.round === 1 ? 2 : Math.min(8, (game.round) * 2))
        : game.player2.skills.length >= Math.min(9, game.round * 3);

      if (p1Ready && p2Ready) {
        advanceDraftRound(game);
      } else {
        emitPhase(game);
      }
    });

    socket.on('ban:select', (data: { gameId: string; generalId: string }) => {
      const game = gameStates.get(data.gameId);
      if (!game || game.phase !== 'ban') return;
      const side = game.player1.socketId === socket.id ? 'player1' : 'player2';
      const pState = side === 'player1' ? game.player1 : game.player2;
      // Record this player's ban choice
      pState.banChoice = data.generalId;

      if (game.player1.banChoice && game.player2.banChoice) {
        advanceToSkillDraft(game);
      } else {
        emitPhase(game);
      }
    });

    socket.on('config:ready', (data: { gameId: string; team: any }) => {
      const game = gameStates.get(data.gameId);
      if (!game || game.phase !== 'config') return;
      const side = game.player1.socketId === socket.id ? 'player1' : 'player2';
      const pState = side === 'player1' ? game.player1 : game.player2;
      pState.ready = true;
      pState.team = data.team;

      if (game.player1.ready && game.player2.ready) {
        startBattlePhase(game);
      } else {
        emitPhase(game);
      }
    });

    socket.on('battle:result', (data: { gameId: string; winner: 'player1' | 'player2'; replay: any }) => {
      const game = gameStates.get(data.gameId);
      if (!game || game.phase !== 'battle') return;
      // Guard: only count the first result to prevent double-counting from both clients
      if (game.battleResultRecorded) return;
      game.battleResultRecorded = true;

      if (data.winner === 'player1') game.score[0]++;
      else game.score[1]++;
      game.player1.battleResults.push({ winner: data.winner, replay: data.replay });
      game.player2.battleResults.push({ winner: data.winner, replay: data.replay });

      // Send detailed battle result to both players — wait for mutual confirmation
      game.player1.battleConfirmed = false;
      game.player2.battleConfirmed = false;
      io.to(game.id).emit('game:battleResult', {
        winner: data.winner,
        replay: data.replay,
        score: game.score,
        battleIndex: game.battleIndex,
      });
    });

    socket.on('battle:continue', (data: { gameId: string }) => {
      const game = gameStates.get(data.gameId);
      if (!game || game.phase !== 'battle') return;
      const side = game.player1.socketId === socket.id ? 'player1' : 'player2';
      const pState = side === 'player1' ? game.player1 : game.player2;
      pState.battleConfirmed = true;

      // Notify opponent that this player confirmed
      const opponent = side === 'player1' ? game.player2 : game.player1;
      io.to(opponent.socketId).emit('game:opponentConfirmed');

      if (game.player1.battleConfirmed && game.player2.battleConfirmed) {
        // Both confirmed — advance (Bo3: first to 2 wins)
        if (game.score[0] >= 2 || game.score[1] >= 2 || game.battleIndex >= 2) {
          endGame(game);
        } else {
          game.battleIndex++;
          game.battleSeed = Math.floor(Math.random() * 2147483647);
          game.battleResultRecorded = false;
          game.player1.ready = false;
          game.player2.ready = false;
          game.player1.battleConfirmed = false;
          game.player2.battleConfirmed = false;
          emitPhase(game);
        }
      }
    });

    socket.on('disconnect', () => {
      const idx = waitingQueue.findIndex(q => q.socket.id === socket.id);
      if (idx >= 0) {
        queuedPlayers.delete(waitingQueue[idx].playerId);
        waitingQueue.splice(idx, 1);
      }
      const gameId = playerGames.get(player.id);
      if (gameId) {
        const game = gameStates.get(gameId);
        if (game && game.phase !== 'finished') {
          const side = game.player1.id === player.id ? 'player1' : 'player2';
          endGame(game, side);
        }
      }
      console.log(`Player disconnected: ${player.username}`);
    });
  });

  return io;
}

async function createGame(s1: Socket, p1: NonNullable<Awaited<ReturnType<typeof resolvePlayer>>>, opponent: QueuedPlayer) {
  const p2 = { id: opponent.playerId, username: opponent.username };
  const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const game: GameState = {
    id: gameId,
    player1: { id: p1.id, username: p1.username, socketId: s1.id, generals: [], skills: [], banChoice: null, ready: false, battleConfirmed: false, battleResults: [] },
    player2: { id: p2.id, username: p2.username, socketId: opponent.socket.id, generals: [], skills: [], banChoice: null, ready: false, battleConfirmed: false, battleResults: [] },
    phase: 'draft_generals',
    round: 1,
    maxRounds: 4,
    pool1: [],
    pool2: [],
    score: [0, 0],
    battleIndex: 0,
    battleSeed: Math.floor(Math.random() * 2147483647),
    battleResultRecorded: false,
    timer: 30,
    timerInterval: null,
  };

  gameStates.set(gameId, game);
  playerGames.set(p1.id, gameId);
  playerGames.set(p2.id, gameId);
  s1.join(gameId);
  opponent.socket.join(gameId);

  // Load owned generals and generate first draft pool
  const [gen1, gen2] = await Promise.all([getOwnedGenerals(p1.id), getOwnedGenerals(p2.id)]);
  await Promise.all([
    generateDraftPool(game, 'player1', gen1),
    generateDraftPool(game, 'player2', gen2),
  ]);

  io.to(s1.id).emit('game:found', { gameId, opponent: { id: p2.id, username: p2.username } });
  io.to(opponent.socket.id).emit('game:found', { gameId, opponent: { id: p1.id, username: p1.username } });

  emitPhase(game);
  startTimer(game, 30, () => { if (game.phase !== 'draft_generals') return; autoPickDraft(game); });
}

async function generateDraftPool(game: GameState, side: 'player1' | 'player2', ownedGens: Record<string, number>) {
  const pState = side === 'player1' ? game.player1 : game.player2;
  const pickedIds = new Set(pState.generals.map(g => g.id));
  const allGens = await getGenerals();
  const available = shuffle(allGens.filter(g => !pickedIds.has(g.id))).slice(0, 5);
  const pool = available.map(g => ({
    id: g.id,
    name: g.name,
    advancement: ownedGens[g.id] ?? 0,
    ranks: g.ranks,
  }));
  if (side === 'player1') game.pool1 = pool;
  else game.pool2 = pool;
}

function autoPickDraft(game: GameState) {
  for (const side of ['player1', 'player2'] as const) {
    const pState = side === 'player1' ? game.player1 : game.player2;
    const pool = side === 'player1' ? game.pool1 : game.pool2;
    const needed = Math.min(2, 2 * game.round - pState.generals.length);
    for (let i = 0; i < needed; i++) {
      const avail = pool.filter((g: any) => !pState.generals.find(pg => pg.id === g.id));
      if (avail.length > 0) pState.generals.push(avail[0]);
    }
  }
  advanceDraftRound(game);
}

async function advanceDraftRound(game: GameState) {
  if (game.phase === 'draft_generals') {
    game.round++;
    if (game.round > game.maxRounds) {
      game.phase = 'ban';
      game.round = 1;
      game.maxRounds = 1;
      emitPhase(game);
      startTimer(game, 30, () => { if (game.phase !== 'ban') return; autoBan(game); });
      return;
    }
    const [gen1, gen2] = await Promise.all([
      getOwnedGenerals(game.player1.id),
      getOwnedGenerals(game.player2.id),
    ]);
    await Promise.all([
      generateDraftPool(game, 'player1', gen1),
      generateDraftPool(game, 'player2', gen2),
    ]);
    emitPhase(game);
    startTimer(game, 30, () => { if (game.phase !== 'draft_generals') return; autoPickDraft(game); });
  } else if (game.phase === 'draft_skills') {
    game.round++;
    if (game.round > game.maxRounds) {
      game.phase = 'config';
      emitPhase(game);
      startTimer(game, 120, () => {
        if (game.phase !== 'config') return;
        game.player1.ready = true;
        game.player2.ready = true;
        startBattlePhase(game);
      });
      return;
    }
    await Promise.all([
      generateSkillPool(game, 'player1'),
      generateSkillPool(game, 'player2'),
    ]);
    emitPhase(game);
    startTimer(game, 30, () => { if (game.phase !== 'draft_skills') return; autoPickSkills(game); });
  }
}

function autoBan(game: GameState) {
  if (!game.player1.banChoice && game.player2.generals.length > 0) {
    game.player1.banChoice = game.player2.generals[0].id;
  }
  if (!game.player2.banChoice && game.player1.generals.length > 0) {
    game.player2.banChoice = game.player1.generals[0].id;
  }
  advanceToSkillDraft(game);
}

async function advanceToSkillDraft(game: GameState) {
  game.phase = 'draft_skills';
  game.round = 1;
  game.maxRounds = 3;
  await Promise.all([
    generateSkillPool(game, 'player1'),
    generateSkillPool(game, 'player2'),
  ]);
  emitPhase(game);
  startTimer(game, 30, () => { if (game.phase !== 'draft_skills') return; autoPickSkills(game); });
}

async function generateSkillPool(game: GameState, side: 'player1' | 'player2') {
  const pState = side === 'player1' ? game.player1 : game.player2;
  const pickedIds = new Set(pState.skills);
  const allSkills = await getSkills();
  const pool = pickRandom(allSkills, 6, pickedIds).map(s => s.id);
  if (side === 'player1') game.pool1 = pool;
  else game.pool2 = pool;
}

function autoPickSkills(game: GameState) {
  for (const side of ['player1', 'player2'] as const) {
    const pState = side === 'player1' ? game.player1 : game.player2;
    const pool = side === 'player1' ? game.pool1 : game.pool2;
    const needed = Math.min(3, 3 * game.round - pState.skills.length);
    for (let i = 0; i < needed; i++) {
      const avail = pool.filter((id: string) => !pState.skills.includes(id));
      if (avail.length > 0) pState.skills.push(avail[0]);
    }
  }
  advanceDraftRound(game);
}

function startBattlePhase(game: GameState) {
  game.phase = 'battle';
  game.battleIndex = 0;
  game.battleSeed = Math.floor(Math.random() * 2147483647);
  game.battleResultRecorded = false;
  game.player1.battleConfirmed = false;
  game.player2.battleConfirmed = false;
  if (game.timerInterval) clearInterval(game.timerInterval);
  emitPhase(game);
}
