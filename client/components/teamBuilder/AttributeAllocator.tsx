import type { FreePoints } from '../../../game/types';

interface Props {
  freePoints: FreePoints;
  remaining: number;
  baseAtk: number;
  baseInt: number;
  baseDef: number;
  baseSpd: number;
  onChange: (attr: 'atk' | 'int' | 'def' | 'spd', delta: number) => void;
  onAllocateAll: (attr: 'atk' | 'int' | 'def' | 'spd') => void;
  onResetAll: () => void;
}

export default function AttributeAllocator({
  freePoints, remaining, baseAtk, baseInt, baseDef, baseSpd, onChange, onAllocateAll, onResetAll,
}: Props) {
  const attrs: { key: 'atk' | 'int' | 'def' | 'spd'; label: string; base: number; value: number }[] = [
    { key: 'atk', label: '武力', base: baseAtk, value: freePoints.atk },
    { key: 'int', label: '智力', base: baseInt, value: freePoints.int },
    { key: 'def', label: '统帅', base: baseDef, value: freePoints.def },
    { key: 'spd', label: '速度', base: baseSpd, value: freePoints.spd },
  ];

  const totalUsed = freePoints.atk + freePoints.int + freePoints.def + freePoints.spd;

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <h4 className="text-[#c9a84c] text-lg font-bold">自由点 <span className={`text-base ${remaining > 0 ? 'text-[#22c55e]' : 'text-[#8b7355]'}`}>余{remaining}</span></h4>
        {totalUsed > 0 && (
          <button onClick={onResetAll}
            className="text-sm px-2 py-0.5 rounded bg-[#2a0000] text-[#ef4444] border border-[#5c1a1a] hover:bg-[#3a0000] cursor-pointer">重置</button>
        )}
      </div>
      {attrs.map(attr => (
        <div key={attr.key} className="flex items-center gap-1.5 mb-0.5 text-lg">
          <span className="text-[#8b7355] w-9">{attr.label}</span>
          <span className="text-[#d4c5a0] w-9 text-right font-bold">{attr.base + attr.value}</span>
          <div className="flex gap-0.5 ml-auto">
            <button onClick={() => onChange(attr.key, -1)} disabled={attr.value <= 0}
              className="w-7 h-7 rounded bg-[#3d2b1a] text-[#c9a84c] text-base flex items-center justify-center hover:bg-[#3a2f1e] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">-</button>
            <span className="text-[#d4c5a0] w-6 text-center text-base">{attr.value}</span>
            <button onClick={() => onChange(attr.key, 1)} disabled={remaining <= 0}
              className="w-7 h-7 rounded bg-[#3d2b1a] text-[#c9a84c] text-base flex items-center justify-center hover:bg-[#3a2f1e] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">+</button>
            <button onClick={() => onAllocateAll(attr.key)} disabled={remaining <= 0}
              className="w-9 h-7 rounded bg-[#9b1d1d] text-white text-sm flex items-center justify-center hover:bg-[#dc2626] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold">MAX</button>
          </div>
        </div>
      ))}
    </div>
  );
}
