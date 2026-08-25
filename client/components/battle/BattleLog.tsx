import { useEffect, useRef } from 'react';
import type { BattleLogEntry } from '../../../game/types';

interface Props {
  entries: BattleLogEntry[];
  speed?: number;
}

export default function BattleLog({ entries }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!userScrolledRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    userScrolledRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 40;
  };

  return (
    <div
      ref={containerRef}
      className="bg-transparent border border-white/10 rounded-lg p-2 h-full font-mono text-lg md:text-xl leading-relaxed"
      onScroll={handleScroll}
    >
      {entries.length === 0 ? (
        <div className="text-[#5a4328] text-center py-4">等待战斗开始...</div>
      ) : (
        entries.map((entry, i) => (
          <BattleLogEntryRow key={i} entry={entry} />
        ))
      )}
    </div>
  );
}

function BattleLogEntryRow({ entry }: { entry: BattleLogEntry }) {
  const colorMap: Record<string, string> = {
    damage: '#ef4444', crit: '#f59e0b', heal: '#22c55e', skill: '#a855f7',
    buff: '#3b82f6', debuff: '#8b5cf6', status: '#f97316', death: '#ef4444',
    dodge: '#06b6d4', system: '#8b7355', normal_attack: '#d4c5a0',
  };

  const color = colorMap[entry.type] ?? '#8b7355';

  return (
    <div className="py-0.5 animate-fade-in" style={{ color }}>
      <span className="text-[#5a4328] mr-2 text-sm md:text-base">[{entry.roundNumber}]</span>
      {entry.message}
    </div>
  );
}
