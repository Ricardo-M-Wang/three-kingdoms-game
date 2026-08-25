import type { BattleGeneral } from '../../../game/types';

interface Props {
  generals: BattleGeneral[];
  selectedIndex: number;
  editingSide: 'player' | 'enemy';
  onSelectSlot: (index: number) => void;
  onRemove: (index: number) => void;
}

export default function SelectedTeam({ generals, selectedIndex, editingSide, onSelectSlot, onRemove }: Props) {
  const isEditing = editingSide === 'player';

  return (
    <div>
      <h3 className={`text-xs font-bold mb-1 ${isEditing ? 'text-[#22c55e]' : 'text-[#c9a84c]'}`}>
        我方 {isEditing && '· 编辑中'}
      </h3>
      <div className="flex gap-2">
        {[0, 1, 2].map(slot => {
          const g = generals[slot];
          return (
            <div
              key={slot}
              onClick={() => g ? onSelectSlot(slot) : null}
              className={`flex-1 h-20 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                g
                  ? selectedIndex === slot && isEditing
                    ? 'border-[#22c55e] bg-[#1a2a1a]'
                    : 'border-[#2a4a2a] bg-[#0d1a0d] hover:border-[#3a6a3a]'
                  : 'border-dashed border-[#3d2b1a] bg-[#1f1410] hover:border-[#5a4328]'
              }`}
            >
              {g ? (
                <>
                  <div className="text-[#d4c5a0] text-xs font-bold">{g.name}</div>
                  <div className="text-[#6b5b3e] text-[9px]">武{g.effectiveAttributes.atk} 智{g.effectiveAttributes.int} 统{g.effectiveAttributes.def} 速{g.effectiveAttributes.spd}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(slot); }}
                    className="text-[9px] text-[#8b4513] hover:text-red-400 cursor-pointer"
                  >移除</button>
                </>
              ) : (
                <div className="text-[#5a4328] text-lg">+</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
