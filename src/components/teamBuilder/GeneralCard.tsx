import type { GeneralDef } from '../../types';
import { useGeneralPortrait, GENERAL_TITLES } from '../../hooks/useGeneralPortrait';
import GeneralPortrait from '../shared/GeneralPortrait';

interface Props {
  general: GeneralDef;
  selected?: boolean;
  isOwned?: boolean;
  onClick: () => void;
  onRemove?: () => void;
}

export default function GeneralCard({ general, selected, isOwned = true, onClick, onRemove }: Props) {
  const { faction } = useGeneralPortrait(general.id);
  const title = GENERAL_TITLES[general.id];

  return (
    <div
      onClick={isOwned ? onClick : undefined}
      className={`rounded p-1 text-center transition-all duration-200 border ${
        !isOwned ? 'cursor-not-allowed opacity-70' :
        selected
          ? 'shadow-lg scale-[1.02] cursor-pointer'
          : 'hover:border-[#5a4328] hover:scale-[1.01] cursor-pointer'
      }`}
      style={{
        backgroundColor: selected ? `${faction.accentColor}18` : 'transparent',
        borderColor: selected ? faction.accentColor : 'transparent',
        boxShadow: selected ? `0 0 6px ${faction.glowColor}` : 'none',
      }}
    >
      <div className="flex justify-center">
        <GeneralPortrait generalId={general.id} name={general.name} size="md" showRank={false} greyed={!isOwned} />
      </div>
      <div className="text-[#d4c5a0] text-sm font-bold mt-0.5 leading-tight">{general.name}</div>
      {title && <div className="gen-card-title mt-0.5">{title}</div>}
      <div className="flex justify-center gap-1 mt-0.5 text-[11px] text-[#8b7355]">
        <span>武{general.ranks.atk}</span>
        <span>智{general.ranks.int}</span>
        <span>统{general.ranks.def}</span>
        <span>速{general.ranks.spd}</span>
      </div>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="mt-0.5 text-[10px] text-[#8b4513] hover:text-[#9b1d1d] cursor-pointer"
        >移除</button>
      )}
    </div>
  );
}
