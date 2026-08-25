import { FACTIONS, GENERAL_FACTION, GENERAL_TITLES } from '../../game/generals/factions';

export function useGeneralPortrait(generalId: string) {
  const factionId = GENERAL_FACTION[generalId] ?? 'qun';
  const faction = FACTIONS[factionId] ?? FACTIONS.qun;
  const title = GENERAL_TITLES[generalId] ?? '';
  return { faction, title, factionId };
}
