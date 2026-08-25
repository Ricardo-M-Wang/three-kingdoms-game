import { useState } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { useGameStore } from '../../store/gameStore';
import GeneralPortrait from '../shared/GeneralPortrait';
import { getGeneralById } from '../../../game/generals';
import { getSkillById } from '../../../game/skills';
import { computeBaseAttributes, refreshEffectiveAttributes } from '../../../game/battle';
import type { BattleGeneral } from '../../../game/types';

export default function ConfigPhase() {
  const { timer, myGenerals, myBanned, myPicks, opponentReady, submitReady } = useMatchStore();
  const [ready, setReady] = useState(false);
  const [teamSlots, setTeamSlots] = useState<(BattleGeneral | null)[]>([null, null, null]);
  const [detailGen, setDetailGen] = useState<BattleGeneral | null>(null);
  const [detailSlotIdx, setDetailSlotIdx] = useState<number>(-1);
  const [skillError, setSkillError] = useState('');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const availableGens = myGenerals.filter((g: any) => g.id !== myBanned);
  const availableSkills = myPicks.map((sid: string) => getSkillById(sid)).filter(Boolean);

  const addToTeam = (gen: any) => {
    if (teamSlots.some(s => s?.generalId === gen.id)) return;
    const slot = teamSlots.findIndex(s => !s);
    if (slot < 0) return;
    const g = createBattleGeneral(gen);
    const newTeam = [...teamSlots];
    newTeam[slot] = g;
    setTeamSlots(newTeam);
    setDetailGen(g);
    setDetailSlotIdx(slot);
    setShowMobileDetail(true);
    setSkillError('');
  };

  const removeFromTeam = (idx: number) => {
    const newTeam = [...teamSlots];
    newTeam[idx] = null;
    setTeamSlots(newTeam);
    if (detailSlotIdx === idx) { setDetailGen(null); setDetailSlotIdx(-1); setShowMobileDetail(false); }
  };

  const assignSkill = (slotIdx: number, skillIdx: 0 | 1, skillId: string) => {
    const g = teamSlots[slotIdx];
    if (!g || !skillId) return;
    const newSkills: [string, string] = [...g.equippedSkillIds] as [string, string];
    newSkills[skillIdx] = skillId;

    const allUsed = teamSlots.flatMap((s, i) =>
      i === slotIdx ? newSkills.filter(Boolean) : (s?.equippedSkillIds || []).filter(Boolean)
    );
    if (new Set(allUsed).size !== allUsed.length) {
      setSkillError('战法不能重复！');
      return;
    }
    setSkillError('');

    const newG = { ...g, equippedSkillIds: newSkills };
    const newTeam = [...teamSlots];
    newTeam[slotIdx] = newG;
    setTeamSlots(newTeam);
    if (detailSlotIdx === slotIdx) setDetailGen(newG);
  };

  const allocatePoint = (attr: 'atk' | 'int' | 'def' | 'spd', delta: number) => {
    const g = teamSlots[detailSlotIdx];
    if (!g) return;
    const newFree = { ...g.freePoints };
    const newVal = (newFree[attr] || 0) + delta;
    if (newVal < 0) return;
    const totalUsed = Object.values(newFree).reduce((s, v) => s + v, 0) + delta;
    if (totalUsed > g.maxFreePoints) return;

    newFree[attr] = newVal;
    applyPoints(newFree);
  };

  const allocateMax = (attr: 'atk' | 'int' | 'def' | 'spd') => {
    const g = teamSlots[detailSlotIdx];
    if (!g) return;
    const used = Object.values(g.freePoints).reduce((s, v) => s + v, 0);
    const remaining = g.maxFreePoints - used;
    if (remaining <= 0) return;
    const newFree = { ...g.freePoints, [attr]: (g.freePoints[attr] || 0) + remaining };
    applyPoints(newFree);
  };

  const resetPoints = () => {
    const g = teamSlots[detailSlotIdx];
    if (!g) return;
    applyPoints({ atk: 0, int: 0, def: 0, spd: 0 });
  };

  const applyPoints = (newFree: Record<string, number>) => {
    const g = teamSlots[detailSlotIdx];
    if (!g) return;
    const newG = { ...g, freePoints: newFree as any };
    refreshEffectiveAttributes(newG);
    const newTeam = [...teamSlots];
    newTeam[detailSlotIdx] = newG;
    setTeamSlots(newTeam);
    setDetailGen(newG);
  };

  const remainingPoints = detailGen
    ? detailGen.maxFreePoints - Object.values(detailGen.freePoints).reduce((s, v) => s + v, 0)
    : 0;

  const handleSelectSlot = (idx: number) => {
    const g = teamSlots[idx];
    if (g) { setDetailGen(g); setDetailSlotIdx(idx); setShowMobileDetail(true); }
  };

  const handleReady = () => {
    if (teamSlots.filter(Boolean).length === 0) return;
    const allSkills = teamSlots.flatMap(s => s?.equippedSkillIds || []).filter(Boolean);
    if (new Set(allSkills).size !== allSkills.length) {
      setSkillError('队伍中有重复战法！');
      return;
    }
    setReady(true);
    submitReady(teamSlots.filter((s): s is BattleGeneral => s !== null).map(g => ({
      ...g,
      innateSkillId: getGeneralById(g.generalId)?.innateSkillId || '',
    })));
  };

  const genDef = detailGen ? getGeneralById(detailGen.generalId) : null;

  const renderDetailPanel = () => (
    <div className="bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-4 md:p-5 overflow-y-auto">
      <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
        <GeneralPortrait generalId={detailGen!.generalId} name={detailGen!.name} size="xl" />
        <div>
          <h3 className="text-[#c9a84c] text-xl md:text-2xl font-bold">{detailGen!.name}</h3>
          <div className="text-[#8b7355] text-sm md:text-base mt-0.5">
            {genDef!.skillType === 'active' ? '主动型' : genDef!.skillType === 'pursuit' ? '追击型' : genDef!.skillType === 'command' ? '指挥型' : '被动型'}
          </div>
        </div>
      </div>

      <div className="mb-3 md:mb-4">
        <div className="flex justify-between text-sm md:text-base mb-2">
          <span className="text-[#c9a84c] font-bold">自由属性点</span>
          <div className="flex items-center gap-2">
            <span className={remainingPoints > 0 ? 'text-[#22c55e]' : 'text-[#8b7355]'}>
              余 {remainingPoints}/{detailGen!.maxFreePoints}
            </span>
            <button onClick={resetPoints}
              className="text-xs md:text-sm px-2 md:px-3 py-1 rounded bg-[#2a0000] text-[#ef4444] border border-[#5c1a1a] cursor-pointer">重置</button>
          </div>
        </div>
        {(['atk', 'int', 'def', 'spd'] as const).map(attr => (
          <div key={attr} className="flex items-center gap-1.5 md:gap-2 mb-1.5 text-base md:text-lg">
            <span className="text-[#8b7355] w-10 md:w-12">{{ atk: '武力', int: '智力', def: '统帅', spd: '速度' }[attr]}</span>
            <span className="text-[#d4c5a0] w-10 md:w-12 text-right font-bold">{detailGen!.effectiveAttributes[attr]}</span>
            <span className="text-[#8b7355] text-xs md:text-sm">(+{detailGen!.freePoints[attr] || 0})</span>
            <div className="flex gap-1 ml-auto">
              <button onClick={() => allocatePoint(attr, -1)} disabled={!detailGen!.freePoints[attr]}
                className="w-7 h-7 rounded bg-[#3d2b1a] text-[#c9a84c] text-base flex items-center justify-center disabled:opacity-30 cursor-pointer">-</button>
              <button onClick={() => allocatePoint(attr, 1)} disabled={remainingPoints <= 0}
                className="w-7 h-7 rounded bg-[#3d2b1a] text-[#c9a84c] text-base flex items-center justify-center disabled:opacity-30 cursor-pointer">+</button>
              <button onClick={() => allocateMax(attr)} disabled={remainingPoints <= 0}
                className="w-10 h-7 rounded bg-[#9b1d1d] text-white text-sm flex items-center justify-center disabled:opacity-30 cursor-pointer font-bold">MAX</button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-[#c9a84c] text-sm md:text-base font-bold mb-2">装备战法</h4>
        <select value={detailGen!.equippedSkillIds[0]} onChange={e => assignSkill(detailSlotIdx, 0, e.target.value)}
          className="w-full bg-[#1a0f07] border border-[#3d2b1a] rounded p-2 md:p-2.5 text-[#d4c5a0] text-sm md:text-base outline-none mb-2">
          <option value="">战法1</option>
          {availableSkills.map((s: any) => (
            <option key={s.id} value={s.id} disabled={detailGen!.equippedSkillIds[1] === s.id}>{s.name} [{s.type === 'active' ? '主动' : s.type === 'pursuit' ? '追击' : s.type === 'command' ? '指挥' : '被动'}]</option>
          ))}
        </select>
        {detailGen!.equippedSkillIds[0] && (() => { const s = getSkillById(detailGen!.equippedSkillIds[0]); return s ? (
          <div className="bg-[#1a0f07] border border-[#3d2b1a] rounded p-2 md:p-3 mb-2">
            <div className="text-[#c9a84c] text-sm font-bold mb-1">{s.name}</div>
            <div className="text-[#8b7355] text-sm leading-relaxed">{s.description}</div>
          </div>
        ) : null; })()}
        <select value={detailGen!.equippedSkillIds[1]} onChange={e => assignSkill(detailSlotIdx, 1, e.target.value)}
          className="w-full bg-[#1a0f07] border border-[#3d2b1a] rounded p-2 md:p-2.5 text-[#d4c5a0] text-sm md:text-base outline-none">
          <option value="">战法2</option>
          {availableSkills.map((s: any) => (
            <option key={s.id} value={s.id} disabled={detailGen!.equippedSkillIds[0] === s.id}>{s.name} [{s.type === 'active' ? '主动' : s.type === 'pursuit' ? '追击' : s.type === 'command' ? '指挥' : '被动'}]</option>
          ))}
        </select>
        {detailGen!.equippedSkillIds[1] && (() => { const s = getSkillById(detailGen!.equippedSkillIds[1]); return s ? (
          <div className="bg-[#1a0f07] border border-[#3d2b1a] rounded p-2 md:p-3 mt-2">
            <div className="text-[#c9a84c] text-sm font-bold mb-1">{s.name}</div>
            <div className="text-[#8b7355] text-sm leading-relaxed">{s.description}</div>
          </div>
        ) : null; })()}
      </div>

      {(() => { const innate = getSkillById(genDef!.innateSkillId); return innate ? (
        <div className="mt-3 md:mt-4">
          <h4 className="text-[#c9a84c] text-sm md:text-base font-bold mb-2 border-b border-[#3d2b1a] pb-1">自带战法</h4>
          <div className="text-[#d4c5a0] text-base md:text-lg font-bold">{innate.name}</div>
          <div className="text-[#8b7355] text-sm leading-relaxed mt-1">{innate.description}</div>
          {innate.activationRate > 0 && (
            <div className="text-[#c9a84c] text-sm mt-1.5">发动率: {innate.activationRate}%</div>
          )}
        </div>
      ) : null; })()}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col p-2 md:p-3 w-full gap-1.5 md:gap-2 page-bg-match" style={{ maxHeight: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-3xl text-[#c9a84c] font-bold tracking-wider">配置阵容</h1>
        <div className="flex items-center gap-2 md:gap-4">
          {opponentReady && <span className="text-[#22c55e] text-xs md:text-base">对手已就绪</span>}
          <span className="text-[#c9a84c] text-xl md:text-3xl font-bold">{timer}s</span>
        </div>
      </div>

      <div className="flex gap-2 md:gap-3 flex-1 min-h-0 items-center justify-center">
        {/* Available generals sidebar */}
        <div className="bg-transparent border border-white/5 rounded-lg p-2 md:p-3 overflow-y-auto flex-shrink-0 w-20 md:w-56">
          <h3 className="text-[#c9a84c] text-xs md:text-base font-bold mb-1.5 md:mb-2">可用 ({availableGens.length})</h3>
          {availableGens.map((g: any) => (
            <div key={g.id} onClick={() => addToTeam(g)}
              className={`flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 rounded cursor-pointer border border-white/5 hover:border-[#c9a84c] transition-colors mb-1 ${
                teamSlots.some(s => s?.generalId === g.id) ? 'opacity-40' : ''
              }`}
            >
              <GeneralPortrait generalId={g.id} name={g.name} size="sm" showRank={false} />
              <div className="flex-1 min-w-0 hidden md:block">
                <div className="text-[#d4c5a0] text-base font-bold truncate">{g.name}</div>
                <div className="text-[#8b7355] text-sm">进阶 {g.advancement}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Team slots — centered */}
        <div className="flex gap-2 md:gap-4 max-w-2xl w-full mx-auto">
          {[0, 1, 2].map(slot => {
            const g = teamSlots[slot];
            const sel = detailSlotIdx === slot;
            return (
              <div key={slot} onClick={() => handleSelectSlot(slot)}
                className={`flex-1 rounded-lg border flex flex-col cursor-pointer p-3 md:p-4 gap-1 ${
                  sel ? 'border-[#c9a84c]' :
                  g ? 'border-white/10 bg-transparent' : 'border-dashed border-white/5 bg-transparent'
                }`}
              >
                {g ? (
                  <>
                    <GeneralPortrait generalId={g.generalId} name={g.name} size="md" showRank={false} />
                    <div className="text-[#d4c5a0] text-sm md:text-lg font-bold text-center truncate">{g.name}</div>
                    <div className="text-[#8b7355] text-xs md:text-sm text-center leading-tight">
                      武{g.effectiveAttributes.atk} 智{g.effectiveAttributes.int} 统{g.effectiveAttributes.def} 速{g.effectiveAttributes.spd}
                    </div>
                    <div className="text-[#8b7355] text-xs md:text-sm text-center">
                      {getGeneralById(g.generalId)?.skillType === 'active' ? '主动' : getGeneralById(g.generalId)?.skillType === 'pursuit' ? '追击' : getGeneralById(g.generalId)?.skillType === 'command' ? '指挥' : '被动'}型
                    </div>
                    <div>
                      {g.equippedSkillIds[0] && (
                        <div className="text-[#8b7355] text-xs mt-0.5 leading-tight">
                          <span className="text-[#c9a84c]">1:</span> {getSkillById(g.equippedSkillIds[0])?.name}
                        </div>
                      )}
                      {g.equippedSkillIds[1] && (
                        <div className="text-[#8b7355] text-xs leading-tight">
                          <span className="text-[#c9a84c]">2:</span> {getSkillById(g.equippedSkillIds[1])?.name}
                        </div>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFromTeam(slot); }}
                      className="text-sm md:text-base text-red-400/60 hover:text-red-400 mt-auto cursor-pointer py-1">移除</button>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#5a4328] text-xl md:text-3xl">+</div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      <div className="flex justify-center">
        {skillError && <div className="text-[#ef4444] text-xs md:text-sm mr-3 md:mr-4 self-center">{skillError}</div>}
        <button onClick={handleReady}
          disabled={ready || teamSlots.filter(Boolean).length === 0}
          className={`px-16 md:px-24 py-4 md:py-4 rounded text-xl md:text-2xl font-bold transition-all cursor-pointer ${
            ready
              ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e] cursor-default'
              : teamSlots.filter(Boolean).length > 0
                ? 'bg-[#c9a84c] text-[#1a0f07] hover:bg-[#a07d1a]'
                : 'bg-transparent border border-white/10 text-[#8b7355] cursor-not-allowed'
          }`}
        >{ready ? '已就绪 ✓' : '就绪'}</button>
      </div>

      {/* Detail overlay */}
      {showMobileDetail && detailGen && genDef && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setShowMobileDetail(false)}>
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowMobileDetail(false)}
                className="text-[#8b7355] hover:text-[#c9a84c] text-2xl px-3 py-1 cursor-pointer">✕</button>
            </div>
            {renderDetailPanel()}
          </div>
        </div>
      )}
    </div>
  );
}

function createBattleGeneral(def: any): BattleGeneral {
  const baseAttrs = computeBaseAttributes(def.ranks);
  const gameStoreAdv = useGameStore.getState().getAdvancement(def.id);
  const advancement = Math.max(def.advancement || 0, gameStoreAdv);
  const g: BattleGeneral = {
    generalId: def.id, name: def.name, portrait: '', side: 'player',
    baseAttributes: baseAttrs,
    freePoints: { atk: 0, int: 0, def: 0, spd: 0 },
    maxFreePoints: 50 + advancement * 10, advancement,
    innateSkillId: '', equippedSkillIds: ['', ''],
    currentHp: 10000, maxHp: 10000, isAlive: true,
    isStunned: false, isSilenced: false, isDisarmed: false,
    hasArmorBreak: false, hasFormationBreak: false, hasInsight: false,
    hasDoubleStrike: false, hasClarity: false, hasPenetrate: false,
    buffs: [], statuses: [],
    floodStacks: 0, fearStacks: 0,
    atkBonusPercent: 0, intBonusPercent: 0, defBonusPercent: 0, spdBonusPercent: 0,
    damageBonus: 0, damageReduction: 0, takenBonus: 0, takenReduction: 0,
    critRate: 0, critDamage: 150,
    lifestealPhysical: 0, lifestealMagical: 0,
    dodgeRate: 0, counterDamageBonus: 0,
    activeSkillRateBonus: 0,
    effectiveAttributes: { atk: 0, int: 0, def: 0, spd: 0, hp: 10000 },
    customState: {},
  };
  refreshEffectiveAttributes(g);
  return g;
}
