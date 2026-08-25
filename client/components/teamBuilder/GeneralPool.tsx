import type { GeneralDef } from '../../../game/types';
import GeneralCard from './GeneralCard';

interface Props {
  generals: GeneralDef[];
  selectedIds: string[];
  ownedGeneralIds: Set<string>;
  onSelect: (general: GeneralDef) => void;
}

export default function GeneralPool({ generals, selectedIds, ownedGeneralIds, onSelect }: Props) {
  return (
    <div className="bg-transparent border border-transparent rounded-lg p-1.5 h-full overflow-y-auto">
      <h3 className="text-[#c9a84c] text-sm font-bold mb-1">武将池 (灰色=未拥有)</h3>
      <div className="grid grid-cols-6 gap-0.5">
        {generals.map(g => (
          <GeneralCard
            key={g.id}
            general={g}
            selected={selectedIds.includes(g.id)}
            isOwned={ownedGeneralIds.has(g.id)}
            onClick={() => onSelect(g)}
          />
        ))}
      </div>
    </div>
  );
}
