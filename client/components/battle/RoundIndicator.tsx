import type { BattlePhase } from '../../../game/types';

interface Props {
  round: number;
  maxRounds: number;
  phase: BattlePhase;
}

export default function RoundIndicator({ round, maxRounds, phase }: Props) {
  const phaseLabels: Record<string, string> = {
    not_started: '准备中...',
    battle_start: '战斗开始!',
    round_start: `第 ${round} 回合`,
    turn_processing: `第 ${round} 回合 - 行动中`,
    round_end: `第 ${round} 回合结束`,
    finished: '战斗结束',
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="bg-transparent border border-white/10 rounded-lg px-4 py-1.5 text-center">
        <span className="text-[#8b7355] text-sm">回合 </span>
        <span className="text-[#c9a84c] text-xl font-bold">{Math.min(round, maxRounds)}</span>
        <span className="text-[#8b7355] text-sm"> / {maxRounds}</span>
      </div>
      {phase === 'finished' && (
        <span className="text-[#c9a84c] text-lg font-bold animate-pulse-glow">
          ⚔ {phaseLabels[phase]}
        </span>
      )}
    </div>
  );
}
