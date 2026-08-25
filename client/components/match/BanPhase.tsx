import { useState } from 'react';
import { useMatchStore } from '../../store/matchStore';
import GeneralPortrait from '../shared/GeneralPortrait';

export default function BanPhase() {
  const { timer, opponentGenerals, myBanChoice, submitBan } = useMatchStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [banned, setBanned] = useState(false);

  const handleConfirm = () => {
    if (!selected || banned) return;
    submitBan(selected);
    setBanned(true);
  };

  return (
    <div className="flex-1 flex flex-col p-2 md:p-3 w-full gap-2 md:gap-3 page-bg-match" style={{ maxHeight: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-3xl text-[#c9a84c] font-bold tracking-wider">禁用阶段</h1>
        <span className="text-xl md:text-3xl text-[#c9a84c] font-bold">{timer}s</span>
      </div>
      <p className="text-[#8b7355] text-sm md:text-lg">选择对方一名武将禁用{!banned && myBanChoice == null ? '，点击查看详情后确认' : ''}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-4 flex-1 min-h-0 overflow-y-auto">
        {opponentGenerals.map((g: any) => {
          const isSelected = selected === g.id;
          const isDisabled = banned || myBanChoice != null;
          return (
            <div key={g.id}
              onClick={() => !isDisabled && setSelected(isSelected ? null : g.id)}
              className={`bg-transparent rounded-lg p-3 md:p-4 text-center transition-all border ${
                isDisabled
                  ? 'border-transparent opacity-50 cursor-not-allowed'
                  : isSelected
                    ? 'border-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer'
                    : 'border-white/5 hover:border-[#ef4444] cursor-pointer'
              }`}
            >
              <div className="flex justify-center mb-1.5 md:mb-2">
                <GeneralPortrait generalId={g.id} name={g.name} size="lg" showRank={false} />
              </div>
              <div className="text-[#d4c5a0] text-base md:text-lg font-bold">{g.name}</div>
              {isSelected && !banned && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
                  className="mt-2 px-4 py-1.5 bg-[#c41e1e] text-white rounded text-sm font-bold hover:bg-[#e63929] cursor-pointer"
                >确认禁用</button>
              )}
              {isDisabled && <div className="text-[#8b7355] text-sm mt-1 font-bold">已禁用</div>}
            </div>
          );
        })}
      </div>

      {(banned || myBanChoice != null) && (
        <div className="text-center text-[#c9a84c] text-base md:text-lg">等待对手禁用...</div>
      )}
    </div>
  );
}
