import { useState, useEffect } from 'react';
import { useMatchStore } from '../../store/matchStore';
import GeneralPortrait from '../shared/GeneralPortrait';
import { getGeneralById } from '../../../game/generals';
import { getSkillById } from '../../../game/skills';
import RadarChart from '../shared/RadarChart';

export default function DraftPhase() {
  const {
    phase, round, maxRounds, timer, pool,
    myPicks, submitPicks, myGenerals,
  } = useMatchStore();

  const isGenerals = phase === 'draft_generals';
  const maxPerRound = isGenerals ? 2 : 3;
  const [selected, setSelected] = useState<string[]>([]);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [roundSubmitted, setRoundSubmitted] = useState(false);

  useEffect(() => { setSelected([]); setDetailItem(null); setRoundSubmitted(false); }, [round]);

  const toggle = (id: string) => {
    if (roundSubmitted) return;
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id));
    } else if (selected.length < maxPerRound) {
      setSelected([...selected, id]);
    }
  };

  const handleConfirm = () => {
    if (selected.length === maxPerRound && !roundSubmitted) {
      submitPicks(selected);
      setRoundSubmitted(true);
      setSelected([]);
      setDetailItem(null);
    }
  };

  const getSkillName = (id: string) => getSkillById(id)?.name || id;

  const getDetail = (id: string) => {
    const poolGen = isGenerals ? pool.find((g: any) => g.id === id) : null;
    const myGen = myGenerals.find((g: any) => g.id === id);
    const genDef = getGeneralById(id);
    if (poolGen || myGen || (genDef && myGenerals.some((g: any) => g.id === id))) {
      const gen = poolGen || myGen;
      const gd = genDef || (gen ? getGeneralById(gen.id) : null);
      return {
        id,
        name: gen?.name || gd?.name || '',
        advancement: gen?.advancement ?? 0,
        ranks: gen?.ranks || gd?.ranks || { atk: 'C', int: 'C', def: 'C', spd: 'C' },
        skillType: gd?.skillType,
        innateSkillId: gd?.innateSkillId,
      };
    }
    return getSkillById(id);
  };

  const detail = detailItem ? getDetail(detailItem) : null;
  const isGeneralDetail = detail && 'innateSkillId' in detail;
  const inPool = detailItem ? (isGenerals
    ? pool.some((g: any) => g.id === detailItem)
    : pool.includes(detailItem)) : false;
  const detailAdvancement = isGenerals && detailItem
    ? (pool.find((g: any) => g.id === detailItem)?.advancement ?? 0)
    : (myGenerals.find((g: any) => g.id === detailItem)?.advancement ?? 0);

  const DetailContent = () => (
    <div className="dynasty-panel rounded-lg p-4 md:p-5 h-full overflow-y-auto">
      {isGeneralDetail ? (
        <>
          <GeneralDetailPanel detail={detail} advancement={detailAdvancement} />
          {inPool && !roundSubmitted && (
            <button
              onClick={() => toggle(detailItem!)}
              className={`w-full mt-4 py-3 rounded text-lg font-bold transition-all cursor-pointer ${
                selected.includes(detailItem!)
                  ? 'bg-[#5c1a1a] text-[#ef4444] hover:bg-[#7a2525]'
                  : selected.length < maxPerRound
                    ? 'bg-[#c9a84c] text-[#1a0f07] hover:bg-[#a07d1a]'
                    : 'bg-[#3d2b1a] text-[#8b7355] cursor-not-allowed'
              }`}
              disabled={!selected.includes(detailItem!) && selected.length >= maxPerRound}
            >
              {selected.includes(detailItem!) ? '取消选择' : '选择'}
            </button>
          )}
          {inPool && roundSubmitted && (
            <div className="w-full mt-4 py-3 rounded text-lg font-bold text-center bg-[#2a3a1a] border border-[#4a6a2a] text-[#22c55e]">
              已确认
            </div>
          )}
        </>
      ) : (
        <>
          <SkillDetailPanel skill={detail} />
          {inPool && !roundSubmitted && (
            <button
              onClick={() => toggle(detailItem!)}
              className={`w-full mt-4 py-3 rounded text-lg font-bold transition-all cursor-pointer ${
                selected.includes(detailItem!)
                  ? 'bg-[#5c1a1a] text-[#ef4444] hover:bg-[#7a2525]'
                  : selected.length < maxPerRound
                    ? 'bg-[#c9a84c] text-[#1a0f07] hover:bg-[#a07d1a]'
                    : 'bg-[#3d2b1a] text-[#8b7355] cursor-not-allowed'
              }`}
              disabled={!selected.includes(detailItem!) && selected.length >= maxPerRound}
            >
              {selected.includes(detailItem!) ? '取消选择' : '选择'}
            </button>
          )}
          {inPool && roundSubmitted && (
            <div className="w-full mt-4 py-3 rounded text-lg font-bold text-center bg-[#2a3a1a] border border-[#4a6a2a] text-[#22c55e]">
              已确认
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col p-2 md:p-3 w-full gap-1.5 md:gap-2 page-bg-match" style={{ maxHeight: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-3xl text-[#c9a84c] font-bold tracking-wider">
          {isGenerals ? '选将阶段' : '选战法阶段'}
        </h1>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-[#8b7355] text-sm md:text-lg">第 {round}/{maxRounds} 轮</span>
          <span className="text-[#c9a84c] text-xl md:text-3xl font-bold">{timer}s</span>
        </div>
      </div>

      {/* Selected display */}
      <div className="bg-transparent border border-white/5 rounded p-2 md:p-3 flex gap-1.5 md:gap-2.5 items-center flex-wrap">
        {myGenerals.length > 0 && (
          <>
            <span className="text-[#8b7355] text-xs md:text-base">武将:</span>
            {myGenerals.map((g: any) => (
              <div key={g.id} className="flex items-center gap-1 md:gap-2 bg-[#2a1a0a] rounded px-2 md:px-3 py-1 md:py-1.5 border border-[#5a4328] cursor-pointer hover:border-[#c9a84c]"
                onClick={() => setDetailItem(g.id)}>
                <GeneralPortrait generalId={g.id} name={g.name} size="sm" showFrame={false} showRank={false} />
                <span className="text-[#d4c5a0] text-sm md:text-base font-bold">{g.name}</span>
              </div>
            ))}
          </>
        )}
        {!isGenerals && (
          <>
            <span className="text-[#5a4328] mx-0.5 md:mx-1">|</span>
            <span className="text-[#8b7355] text-xs md:text-base">战法:</span>
            {myPicks.map((sid: string) => {
              const s = getSkillById(sid);
              return s ? (
                <div key={sid} className="bg-[#1a2a1a] rounded px-2 md:px-3 py-1 md:py-1.5 border border-[#2a4a2a] cursor-pointer hover:border-[#22c55e]"
                  onClick={() => setDetailItem(sid)}>
                  <span className="text-[#d4c5a0] text-sm md:text-base font-bold">{s.name}</span>
                </div>
              ) : null;
            })}
          </>
        )}
        {isGenerals && myGenerals.length === 0 && (
          <span className="text-[#5a4328] text-xs md:text-base">尚未选择武将</span>
        )}
      </div>

      {/* Main: Centered Pool */}
      <div className="flex flex-col items-center flex-1 min-h-0 gap-2">
        <div className="text-[#8b7355] text-sm md:text-base">
          {isGenerals
            ? `每轮选${maxPerRound}个 · 本轮 ${selected.length}/${maxPerRound}`
            : `每轮选${maxPerRound}个 · 本轮 ${selected.length}/${maxPerRound}`}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 max-w-xl w-full overflow-y-auto">
          {pool.map((item: any) => {
            const id = isGenerals ? item.id : item;
            const sel = selected.includes(id);
            const name = isGenerals ? item.name : getSkillName(id);
            return (
              <div key={id}
                onClick={() => !roundSubmitted && setDetailItem(detailItem === id ? null : id)}
                className={`bg-transparent border rounded-lg p-3 md:p-4 text-center transition-all ${
                  roundSubmitted ? 'opacity-50 cursor-default' :
                  sel ? 'border-[#c9a84c] shadow-[0_0_10px_rgba(201,168,76,0.3)] cursor-pointer' : 'border-white/5 hover:border-white/10 cursor-pointer'
                }`}
              >
                {isGenerals && (
                  <div className="flex justify-center mb-1.5 md:mb-2">
                    <GeneralPortrait generalId={item.id} name={item.name} size="md" showRank={false} greyed={item.advancement === 0} />
                  </div>
                )}
                <div className="text-[#d4c5a0] text-base md:text-lg font-bold">{name}</div>
                {isGenerals && (
                  <div className="text-[#8b7355] text-xs md:text-sm mt-0.5">{item.advancement > 0 ? '★'.repeat(item.advancement) : '未拥有'}</div>
                )}
                {!isGenerals && (
                  <div className="text-[#8b7355] text-xs md:text-sm mt-0.5">
                    {getSkillById(id)?.type === 'active' ? '主动' : getSkillById(id)?.type === 'pursuit' ? '追击' : getSkillById(id)?.type === 'command' ? '指挥' : '被动'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm button */}
      <div className="flex justify-center gap-3 md:gap-4">
        {roundSubmitted ? (
          <div className="px-14 md:px-20 py-3 md:py-3.5 rounded text-xl md:text-2xl font-bold bg-[#2a3a1a] border border-[#4a6a2a] text-[#22c55e]">
            已确认，等待对手...
          </div>
        ) : (
          <>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])}
                className="px-10 md:px-14 py-3 md:py-3.5 rounded text-lg md:text-xl font-bold bg-transparent border border-[#5a4328] text-[#8b7355] hover:text-[#c9a84c] hover:border-[#c9a84c] cursor-pointer"
              >取消全部</button>
            )}
            <button onClick={handleConfirm}
              disabled={selected.length !== maxPerRound}
              className={`px-14 md:px-20 py-3 md:py-3.5 rounded text-xl md:text-2xl font-bold transition-all cursor-pointer ${
                selected.length === maxPerRound
                  ? 'bg-[#c9a84c] text-[#1a0f07] hover:bg-[#a07d1a]'
                  : 'bg-transparent border border-white/10 text-[#8b7355] cursor-not-allowed'
              }`}
            >确认 ({selected.length}/{maxPerRound})</button>
          </>
        )}
      </div>

      {/* Detail overlay */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setDetailItem(null)}>
          <div className="max-w-md w-full max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setDetailItem(null)}
                className="text-[#8b7355] hover:text-[#c9a84c] text-2xl px-3 py-1">✕</button>
            </div>
            <DetailContent />
          </div>
        </div>
      )}
    </div>
  );
}

function GeneralDetailPanel({ detail, advancement }: { detail: any; advancement: number }) {
  if (!detail) return null;
  const innate = getSkillById(detail.innateSkillId);
  return (
    <div>
      <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
        <GeneralPortrait generalId={detail.id} name={detail.name} size="xl" />
        <div>
          <h3 className="text-[#c9a84c] text-xl md:text-2xl font-bold">{detail.name}</h3>
          <div className="text-[#8b7355] text-sm md:text-base mt-0.5">
            {detail.skillType === 'active' ? '主动型' : detail.skillType === 'pursuit' ? '追击型' : detail.skillType === 'command' ? '指挥型' : '被动型'}
          </div>
          <div className="text-[#c9a84c] text-xs md:text-sm mt-1 md:mt-1.5">
            进阶: {advancement > 0 ? '★'.repeat(advancement) + '☆'.repeat(5 - advancement) : '未拥有'}
          </div>
        </div>
      </div>

      <div className="mb-3 md:mb-4">
        <h4 className="text-[#c9a84c] text-sm md:text-base font-bold mb-2 border-b border-[#3d2b1a] pb-1">四维</h4>
        <div className="flex justify-center mb-2 md:mb-3">
          <RadarChart ranks={detail.ranks} size={140} />
        </div>
        <div className="grid grid-cols-4 gap-1.5 md:gap-2 text-center text-base md:text-lg">
          <div><span className="text-[#ef4444] font-bold">{detail.ranks?.atk}</span></div>
          <div><span className="text-[#a855f7] font-bold">{detail.ranks?.int}</span></div>
          <div><span className="text-[#3b82f6] font-bold">{detail.ranks?.def}</span></div>
          <div><span className="text-[#22c55e] font-bold">{detail.ranks?.spd}</span></div>
        </div>
      </div>

      {innate && (
        <div>
          <h4 className="text-[#c9a84c] text-sm md:text-base font-bold mb-2 border-b border-[#3d2b1a] pb-1">自带战法</h4>
          <div className="text-[#d4c5a0] text-base md:text-lg font-bold">{innate.name}</div>
          <div className="text-[#8b7355] text-sm leading-relaxed mt-1">{innate.description}</div>
          {innate.activationRate > 0 && (
            <div className="text-[#c9a84c] text-sm mt-1.5">发动率: {innate.activationRate}%</div>
          )}
        </div>
      )}
    </div>
  );
}

function SkillDetailPanel({ skill }: { skill: any }) {
  if (!skill) return null;
  return (
    <div>
      <h3 className="text-[#c9a84c] text-xl md:text-2xl font-bold mb-2 md:mb-3">{skill.name}</h3>
      <div className="text-[#8b7355] text-sm md:text-base mb-3 md:mb-4">
        [{skill.type === 'active' ? '主动' : skill.type === 'pursuit' ? '追击' : skill.type === 'command' ? '指挥' : '被动'}战法]
        {skill.activationRate > 0 && <span className="ml-2">发动率: {skill.activationRate}%</span>}
      </div>
      <div className="text-[#d4c5a0] text-base md:text-lg leading-relaxed bg-[#1a0f07] rounded p-3 md:p-4 border border-[#3d2b1a]">
        {skill.description}
      </div>
    </div>
  );
}
