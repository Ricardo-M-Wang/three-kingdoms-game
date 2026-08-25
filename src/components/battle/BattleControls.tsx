import { useBattleStore } from '../../store';

export default function BattleControls() {
  const isPlaying = useBattleStore(s => s.isPlaying);
  const speed = useBattleStore(s => s.playbackSpeed);
  const battleState = useBattleStore(s => s.battleState);
  const stepForward = useBattleStore(s => s.stepForward);
  const play = useBattleStore(s => s.play);
  const pause = useBattleStore(s => s.pause);
  const setSpeed = useBattleStore(s => s.setSpeed);
  const runToEnd = useBattleStore(s => s.runToEnd);

  const isFinished = battleState?.phase === 'finished';

  return (
    <div className="flex items-center justify-center gap-4 bg-transparent border border-white/10 rounded-lg px-4 py-2">
      <button
        onClick={stepForward}
        disabled={isFinished}
        className="px-3 py-1.5 bg-transparent border border-white/10 rounded text-[#c9a84c] text-sm
          hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        ⏭ 单步
      </button>

      <button
        onClick={isPlaying ? pause : play}
        disabled={isFinished}
        className={`px-4 py-1.5 rounded text-sm font-bold cursor-pointer ${
          isPlaying
            ? 'bg-[#c9a84c] text-[#1a0f07]'
            : 'bg-[#9b1d1d] text-white hover:bg-[#dc2626]'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPlaying ? '⏸ 暂停' : '▶ 播放'}
      </button>

      <select
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="bg-transparent border border-white/10 rounded px-2 py-1.5 text-sm text-[#d4c5a0] cursor-pointer
          focus:border-[#c9a84c] outline-none"
      >
        <option value={1000}>1x</option>
        <option value={500}>2x</option>
        <option value={200}>5x</option>
        <option value={50}>20x</option>
      </select>

      <button
        onClick={runToEnd}
        disabled={isFinished}
        className="px-3 py-1.5 bg-transparent border border-white/10 rounded text-[#8b7355] text-sm
          hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        ⏩ 跳过
      </button>
    </div>
  );
}
