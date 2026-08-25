import { useEffect, useState, useRef, useMemo } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { useGameStore } from '../../store/gameStore';
import { useBattleStore } from '../../store';
import { useBattleAnimation } from '../../hooks/useBattleAnimation';
import { refreshEffectiveAttributes, computeBaseAttributes } from '../../engine/attributeCalculator';
import type { BattleGeneral, Team } from '../../types';
import { getGeneralById } from '../../data';
import BattleField from '../battle/BattleField';
import BattleLog from '../battle/BattleLog';
import BattleControls from '../battle/BattleControls';
import RoundIndicator from '../battle/RoundIndicator';
import GeneralInspectPanel from '../battle/GeneralInspectPanel';
import RoundChart from '../result/RoundChart';

const BATTLE_BGS = ['/bg-match.jpg', '/bg-team.jpg', '/bg-login-1.jpg'];

function buildGeneral(g: any, skills: string[], side: 'player' | 'enemy'): BattleGeneral {
  const genDef = getGeneralById(g.generalId || g.id);
  const baseAttrs = computeBaseAttributes(genDef?.ranks || g.ranks || { atk: 'C', int: 'C', def: 'C', spd: 'C' });
  const innate = genDef?.innateSkillId || g.innateSkillId || '';
  const fps = g.freePoints || { atk: 0, int: 0, def: 0, spd: 0 };

  let eqSkills: [string, string] = (g.equippedSkillIds || ['', '']) as [string, string];
  if (!eqSkills[0] && skills.length > 0) eqSkills[0] = skills[0] || '';
  if (!eqSkills[1] && skills.length > 1) eqSkills[1] = skills[1] || '';

  const gameStoreAdv = side === 'player' ? useGameStore.getState().getAdvancement(g.generalId || g.id) : 0;
  const advancement = Math.max(g.advancement || 0, gameStoreAdv);

  const bg: BattleGeneral = {
    generalId: g.generalId || g.id, name: g.name, portrait: '', side,
    baseAttributes: baseAttrs,
    freePoints: { atk: fps.atk || 0, int: fps.int || 0, def: fps.def || 0, spd: fps.spd || 0 },
    maxFreePoints: 50 + advancement * 10, advancement,
    innateSkillId: innate, equippedSkillIds: eqSkills,
    currentHp: 10000, maxHp: 10000, isAlive: true,
    isStunned: false, isSilenced: false, isDisarmed: false,
    hasArmorBreak: false, hasFormationBreak: false, hasInsight: false,
    hasDoubleStrike: false, hasClarity: false, hasPenetrate: false,
    buffs: [], statuses: [], floodStacks: 0, fearStacks: 0,
    atkBonusPercent: 0, intBonusPercent: 0, defBonusPercent: 0, spdBonusPercent: 0,
    damageBonus: 0, damageReduction: 0, takenBonus: 0, takenReduction: 0,
    critRate: 0, critDamage: 150, lifestealPhysical: 0, lifestealMagical: 0,
    dodgeRate: 0, counterDamageBonus: 0, activeSkillRateBonus: 0,
    effectiveAttributes: { atk: 0, int: 0, def: 0, spd: 0, hp: 10000 },
    customState: {},
  };
  refreshEffectiveAttributes(bg);
  return bg;
}

interface BattleStats {
  winner: 'player' | 'enemy';
  myTeam: { name: string; hp: number; maxHp: number; isAlive: boolean; generalId: string }[];
  oppTeam: { name: string; hp: number; maxHp: number; isAlive: boolean; generalId: string }[];
  roundSnapshots: any[];
  myTotalDamage: Record<string, number>;
  oppTotalDamage: Record<string, number>;
  mySkillStats: Record<string, any>;
  oppSkillStats: Record<string, any>;
}

export default function BattlePhase() {
  const battleIndex = useMatchStore(s => s.battleIndex);
  const myGenerals = useMatchStore(s => s.myGenerals);
  const myPicks = useMatchStore(s => s.myPicks);
  const opponentGenerals = useMatchStore(s => s.opponentGenerals);
  const opponentTeam = useMatchStore(s => s.opponentTeam);
  const myBanned = useMatchStore(s => s.myBanned);
  const score = useMatchStore(s => s.score);
  const myTeam = useMatchStore(s => s.myTeam);
  const mySide = useMatchStore(s => s.mySide);
  const submitBattleResult = useMatchStore(s => s.submitBattleResult);
  const confirmBattleContinue = useMatchStore(s => s.confirmBattleContinue);
  const myBattleConfirmed = useMatchStore(s => s.myBattleConfirmed);
  const opponentBattleConfirmed = useMatchStore(s => s.opponentBattleConfirmed);
  const battleSeed = useMatchStore(s => s.battleSeed);

  const myScore = mySide === 'player1' ? score[0] : score[1];
  const oppScore = mySide === 'player1' ? score[1] : score[0];

  const battleState = useBattleStore(s => s.battleState);
  const isPlaying = useBattleStore(s => s.isPlaying);
  const inspectedId = useBattleStore(s => s.inspectedGeneralId);
  const setInspected = useBattleStore(s => s.setInspectedGeneral);
  const battleLog = useBattleStore(s => s.battleState?.battleLog ?? []);
  const screenShake = useBattleStore(s => s.screenShake);
  const logRef = useRef<HTMLDivElement>(null);

  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [battleStats, setBattleStats] = useState<BattleStats | null>(null);
  const [battleWinner, setBattleWinner] = useState<boolean>(false);

  // 随机背景（每次进入战斗随机选一张）
  const bgImage = useMemo(() => BATTLE_BGS[Math.floor(Math.random() * BATTLE_BGS.length)], [battleIndex]);

  useBattleAnimation();

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog.length]);

  // Initialize the battle — re-runs for each battleIndex (each game in Bo3)
  useEffect(() => {
    setSubmitted(false);
    setShowResult(false);
    setBattleStats(null);

    const myGens = (myBanned && myBanned.length > 0)
      ? myGenerals.filter((g: any) => g.id !== myBanned).slice(0, 3)
      : myGenerals.slice(0, 3);
    const oppGens = opponentGenerals.slice(0, 3);

    const playerGens = myTeam
      ? myTeam.map((g: any) => buildGeneral(g, myPicks, 'player'))
      : myGens.map((g: any, i: number) => buildGeneral(g, myPicks.slice(i * 3, i * 3 + 2), 'player'));

    const enemyGens = opponentTeam
      ? opponentTeam.map((g: any) => buildGeneral(g, [], 'enemy'))
      : oppGens.map((g: any) => buildGeneral(g, [], 'enemy'));

    const playerTeam: Team = { owner: 'player', generals: playerGens };
    const enemyTeam: Team = { owner: 'enemy', generals: enemyGens };

    useBattleStore.getState().initBattle(playerTeam, enemyTeam, battleSeed);
    useBattleStore.getState().play();
  }, [battleIndex]);

  // When battle finishes — capture stats and submit result
  useEffect(() => {
    if (!battleState || battleState.phase !== 'finished' || submitted) return;

    const iWon = battleState.winner === 'player';
    const winner = iWon ? 'player1' as const : 'player2' as const;

    const stats: BattleStats = {
      winner: battleState.winner as 'player' | 'enemy',
      myTeam: battleState.playerTeam.generals.map(g => ({
        name: g.name, hp: g.currentHp, maxHp: g.maxHp,
        isAlive: g.isAlive, generalId: g.generalId,
      })),
      oppTeam: battleState.enemyTeam.generals.map(g => ({
        name: g.name, hp: g.currentHp, maxHp: g.maxHp,
        isAlive: g.isAlive, generalId: g.generalId,
      })),
      roundSnapshots: battleState.roundSnapshots || [],
      myTotalDamage: { ...battleState.playerTotalDamage },
      oppTotalDamage: { ...battleState.enemyTotalDamage },
      mySkillStats: { ...battleState.playerSkillStats },
      oppSkillStats: { ...battleState.enemySkillStats },
    };
    setBattleStats(stats);
    setBattleWinner(iWon);

    const replay = {
      winner,
      rounds: battleState.roundSnapshots || [],
      playerTeam: stats.myTeam,
      enemyTeam: stats.oppTeam,
      battleLog: battleLog.slice(-50),
    };
    submitBattleResult(winner, replay);
    setSubmitted(true);
    setTimeout(() => setShowResult(true), 600);
  }, [battleState?.phase, submitted]);

  const handleContinue = () => {
    confirmBattleContinue();
  };

  if (!battleState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[#c9a84c] animate-pulse-glow text-lg">准备战斗...</div>
      </div>
    );
  }

  const isFinished = showResult && battleStats;

  return (
    <div className="flex-1 flex flex-col p-1.5 md:p-2 gap-1 md:gap-1.5" style={{
      maxHeight: 'calc(100vh - 64px)',
      position: 'relative',
      overflow: 'hidden',
      background: `url(${bgImage}) center / cover no-repeat`,
    }}>
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/70 z-0" />

      {/* Header */}
      <div className="flex items-center justify-between px-1 md:px-2 shrink-0 relative z-10">
        <h1 className="text-sm md:text-lg text-[#c9a84c] font-bold tracking-wider">
          第 {battleIndex + 1} 局 / 三局两胜
        </h1>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-[#22c55e] text-sm md:text-base font-bold">{myScore}</span>
          <span className="text-[#8b7355]">:</span>
          <span className="text-[#ef4444] text-sm md:text-base font-bold">{oppScore}</span>
        </div>
      </div>

      {/* Main: battlefield + post-battle stats */}
      <div className={`flex-1 flex gap-1.5 md:gap-2 min-h-0 relative z-10 ${screenShake ? 'animate-screen-shake' : ''}`}>
        {/* Left: Battle field */}
        <div className={`flex flex-col gap-1 md:gap-1.5 ${isFinished ? 'w-[55%]' : 'w-full'} transition-all`}>
          <RoundIndicator round={battleState.roundNumber} maxRounds={battleState.maxRounds} phase={battleState.phase} />
          <div className="flex-1 relative min-h-0">
            <BattleField state={battleState} onGeneralClick={(key) => {
              if (!isPlaying) setInspected(inspectedId === key ? null : key);
            }} />
          </div>
          <div className="text-center text-[#8b7355] text-[10px] md:text-xs">
            {!isPlaying && battleState.phase !== 'finished' && '点击武将查看详情'}
          </div>
        </div>

        {/* Right: Post-battle stats panel */}
        {isFinished && (
          <div className="w-[45%] flex flex-col gap-2 min-h-0 animate-fade-in overflow-hidden relative z-10">
            <PostBattlePanel
              stats={battleStats}
              battleWinner={battleWinner}
              myConfirmed={myBattleConfirmed}
              opponentConfirmed={opponentBattleConfirmed}
              onContinue={handleContinue}
            />
          </div>
        )}
      </div>

      {/* 文字战报 — 上移并增大 */}
      <div ref={logRef} className="h-32 md:h-40 bg-transparent border border-white/10 rounded-lg p-2 md:p-2.5 overflow-y-auto shrink-0 relative z-10">
        <BattleLog entries={battleLog} speed={useBattleStore(s => s.playbackSpeed)} />
      </div>

      {/* 控制按钮 — 上移到战报下方 */}
      <div className="relative z-10">
        <BattleControls />
      </div>

      {/* Inspect panel */}
      {inspectedId && (() => {
        const [side, gId] = inspectedId.split(':');
        const gen = side === 'player'
          ? battleState.playerTeam.generals.find(g => g.generalId === gId)
          : battleState.enemyTeam.generals.find(g => g.generalId === gId);
        return gen ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setInspected(null)}>
            <div onClick={e => e.stopPropagation()}>
              <GeneralInspectPanel general={gen} onClose={() => setInspected(null)} />
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}

function PostBattlePanel({
  stats, battleWinner, myConfirmed, opponentConfirmed, onContinue,
}: {
  stats: BattleStats;
  battleWinner: boolean;
  myConfirmed: boolean;
  opponentConfirmed: boolean;
  onContinue: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'trend' | 'damage'>('overview');

  const myTotalDmg = Object.values(stats.myTotalDamage).reduce((a, b) => a + b, 0);
  const oppTotalDmg = Object.values(stats.oppTotalDamage).reduce((a, b) => a + b, 0);

  const myMvp = Object.entries(stats.myTotalDamage).sort(([, a], [, b]) => b - a)[0];
  const oppMvp = Object.entries(stats.oppTotalDamage).sort(([, a], [, b]) => b - a)[0];

  const tabs = [
    { key: 'overview' as const, label: '总览' },
    { key: 'trend' as const, label: '血量趋势' },
    { key: 'damage' as const, label: '伤害统计' },
  ];

  return (
    <div className="bg-black/50 backdrop-blur border border-white/10 rounded-lg flex flex-col gap-2 h-full overflow-hidden">
      {/* Win/Loss banner */}
      <div className={`text-center text-lg md:text-xl font-bold py-2 shrink-0 ${battleWinner ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
        {battleWinner ? '✦ 本局胜利 ✦' : '本局败北'}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-transparent border border-white/5 rounded mx-3 p-0.5 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-1 rounded text-xs md:text-sm font-bold transition-all cursor-pointer ${
              tab === t.key ? 'bg-[#c9a84c] text-[#1a0f07]' : 'text-[#8b7355] hover:text-[#d4c5a0]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-3 min-h-0">
        {tab === 'overview' && (
          <OverviewTab stats={stats} myMvp={myMvp} oppMvp={oppMvp} myTotalDmg={myTotalDmg} oppTotalDmg={oppTotalDmg} />
        )}
        {tab === 'trend' && <TrendTab stats={stats} />}
        {tab === 'damage' && <DamageTab stats={stats} />}
      </div>

      {/* Confirmation area */}
      <div className="border-t border-white/10 px-3 py-2 flex flex-col items-center gap-2 shrink-0">
        <div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-[#d4c5a0]">我方</span>
            {myConfirmed ? (
              <span className="text-[#22c55e] font-bold">已就绪 ✓</span>
            ) : (
              <span className="text-[#8b7355]">等待中...</span>
            )}
          </div>
          <span className="text-[#5a4328]">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#d4c5a0]">对手</span>
            {opponentConfirmed ? (
              <span className="text-[#22c55e] font-bold">已就绪 ✓</span>
            ) : (
              <span className="text-[#8b7355]">等待中...</span>
            )}
          </div>
        </div>
        <button
          onClick={onContinue}
          disabled={myConfirmed}
          className={`px-8 py-2 rounded text-sm font-bold transition-all cursor-pointer ${
            myConfirmed
              ? 'bg-transparent border border-white/10 text-[#5a4328] cursor-not-allowed'
              : 'bg-[#c9a84c] text-[#1a0f07] hover:bg-[#a07d1a]'
          }`}>
          {myConfirmed ? '已确认，等待对手...' : '继续战斗'}
        </button>
      </div>
    </div>
  );
}

function OverviewTab({
  stats, myMvp, oppMvp, myTotalDmg, oppTotalDmg,
}: {
  stats: BattleStats;
  myMvp: [string, number] | undefined;
  oppMvp: [string, number] | undefined;
  myTotalDmg: number;
  oppTotalDmg: number;
}) {
  const roundsPlayed = stats.roundSnapshots.length;
  const myAlive = stats.myTeam.filter(g => g.isAlive).length;
  const oppAlive = stats.oppTeam.filter(g => g.isAlive).length;

  const myMvpName = myMvp ? stats.myTeam.find(g => g.generalId === myMvp[0])?.name || myMvp[0] : '—';
  const oppMvpName = oppMvp ? stats.oppTeam.find(g => g.generalId === oppMvp[0])?.name || oppMvp[0] : '—';

  return (
    <div className="space-y-2 py-1">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-transparent border border-white/10 rounded p-2">
          <div className="text-[#22c55e] font-bold text-xs mb-1">我方</div>
          <div className="flex flex-col gap-0.5">
            {stats.myTeam.map(g => (
              <span key={g.name} className={g.isAlive ? 'text-[#d4c5a0] text-xs' : 'text-[#5a4328] text-xs line-through'}>
                {g.name} ({g.hp}/{g.maxHp})
              </span>
            ))}
          </div>
          <div className="text-[#8b7355] text-[10px] mt-1">存活 {myAlive}/3 · 伤害 {Math.round(myTotalDmg)}</div>
        </div>
        <div className="bg-transparent border border-white/10 rounded p-2">
          <div className="text-[#ef4444] font-bold text-xs mb-1">敌方</div>
          <div className="flex flex-col gap-0.5">
            {stats.oppTeam.map(g => (
              <span key={g.name} className={g.isAlive ? 'text-[#d4c5a0] text-xs' : 'text-[#5a4328] text-xs line-through'}>
                {g.name} ({g.hp}/{g.maxHp})
              </span>
            ))}
          </div>
          <div className="text-[#8b7355] text-[10px] mt-1">存活 {oppAlive}/3 · 伤害 {Math.round(oppTotalDmg)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-transparent border border-white/10 rounded p-2">
          <div className="text-[#8b7355] text-[10px]">回合数</div>
          <div className="text-[#c9a84c] text-base font-bold">{roundsPlayed}</div>
        </div>
        <div className="bg-transparent border border-white/10 rounded p-2">
          <div className="text-[#8b7355] text-[10px]">我方MVP</div>
          <div className="text-[#22c55e] text-xs font-bold">{myMvpName}</div>
          <div className="text-[#d4c5a0] text-[10px]">{myMvp ? Math.round(myMvp[1]) : 0} 伤害</div>
        </div>
        <div className="bg-transparent border border-white/10 rounded p-2">
          <div className="text-[#8b7355] text-[10px]">敌方MVP</div>
          <div className="text-[#ef4444] text-xs font-bold">{oppMvpName}</div>
          <div className="text-[#d4c5a0] text-[10px]">{oppMvp ? Math.round(oppMvp[1]) : 0} 伤害</div>
        </div>
        <div className="bg-transparent border border-white/10 rounded p-2">
          <div className="text-[#8b7355] text-[10px]">结果</div>
          <div className={`text-base font-bold ${stats.winner === 'player' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {stats.winner === 'player' ? '胜' : '败'}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendTab({ stats }: { stats: BattleStats }) {
  return (
    <div className="space-y-3 py-1">
      <RoundChart snapshots={stats.roundSnapshots} metric="hp" />
      <RoundChart snapshots={stats.roundSnapshots} metric="damage" />
    </div>
  );
}

function DamageTab({ stats }: { stats: BattleStats }) {
  const myDamage = Object.entries(stats.myTotalDamage)
    .sort(([, a], [, b]) => b - a)
    .filter(([, d]) => d > 0);
  const oppDamage = Object.entries(stats.oppTotalDamage)
    .sort(([, a], [, b]) => b - a)
    .filter(([, d]) => d > 0);

  const maxDmg = Math.max(
    ...myDamage.map(([, d]) => d),
    ...oppDamage.map(([, d]) => d),
    1,
  );

  return (
    <div className="space-y-3 py-1">
      <div>
        <div className="text-[#22c55e] text-xs font-bold mb-1">我方输出</div>
        <div className="space-y-1">
          {myDamage.length === 0 && <div className="text-[#5a4328] text-xs">无伤害数据</div>}
          {myDamage.map(([id, dmg]) => {
            const name = stats.myTeam.find(g => g.generalId === id)?.name || id;
            const pct = (dmg / maxDmg) * 100;
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="text-[#d4c5a0] text-xs w-14 text-right truncate">{name}</span>
                <div className="flex-1 h-3 bg-transparent border border-white/10 rounded overflow-hidden">
                  <div className="h-full bg-[#22c55e]/60 rounded" style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <span className="text-[#c9a84c] text-xs w-12 text-right">{Math.round(dmg)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[#ef4444] text-xs font-bold mb-1">敌方输出</div>
        <div className="space-y-1">
          {oppDamage.length === 0 && <div className="text-[#5a4328] text-xs">无伤害数据</div>}
          {oppDamage.map(([id, dmg]) => {
            const name = stats.oppTeam.find(g => g.generalId === id)?.name || id;
            const pct = (dmg / maxDmg) * 100;
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="text-[#d4c5a0] text-xs w-14 text-right truncate">{name}</span>
                <div className="flex-1 h-3 bg-transparent border border-white/10 rounded overflow-hidden">
                  <div className="h-full bg-[#ef4444]/60 rounded" style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <span className="text-[#c9a84c] text-xs w-12 text-right">{Math.round(dmg)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[#c9a84c] text-xs font-bold mb-1">战法使用</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-transparent border border-white/10 rounded p-2">
            <div className="text-[#22c55e] text-[10px] font-bold mb-1">我方</div>
            {Object.entries(stats.mySkillStats).map(([gId, ss]: [string, any]) => {
              const name = stats.myTeam.find(g => g.generalId === gId)?.name || gId;
              const skillEntries = Object.entries(ss.skills || {}) as [string, any][];
              return (
                <div key={gId} className="mb-1">
                  <div className="text-[#d4c5a0] text-[10px] font-bold">{name}</div>
                  {skillEntries.map(([sId, sData]: [string, any]) => (
                    <div key={sId} className="text-[#8b7355] text-[9px] ml-1.5">
                      {sData.name}: {sData.count}次 · 伤害{sData.damage || 0} · 治疗{sData.heal || 0}
                    </div>
                  ))}
                  {skillEntries.length === 0 && <div className="text-[#5a4328] text-[9px] ml-1.5">无数据</div>}
                </div>
              );
            })}
            {Object.keys(stats.mySkillStats).length === 0 && (
              <div className="text-[#5a4328] text-[9px]">无数据</div>
            )}
          </div>
          <div className="bg-transparent border border-white/10 rounded p-2">
            <div className="text-[#ef4444] text-[10px] font-bold mb-1">敌方</div>
            {Object.entries(stats.oppSkillStats).map(([gId, ss]: [string, any]) => {
              const name = stats.oppTeam.find(g => g.generalId === gId)?.name || gId;
              const skillEntries = Object.entries(ss.skills || {}) as [string, any][];
              return (
                <div key={gId} className="mb-1">
                  <div className="text-[#d4c5a0] text-[10px] font-bold">{name}</div>
                  {skillEntries.map(([sId, sData]: [string, any]) => (
                    <div key={sId} className="text-[#8b7355] text-[9px] ml-1.5">
                      {sData.name}: {sData.count}次 · 伤害{sData.damage || 0} · 治疗{sData.heal || 0}
                    </div>
                  ))}
                  {skillEntries.length === 0 && <div className="text-[#5a4328] text-[9px] ml-1.5">无数据</div>}
                </div>
              );
            })}
            {Object.keys(stats.oppSkillStats).length === 0 && (
              <div className="text-[#5a4328] text-[9px]">无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
