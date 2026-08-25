import { useState } from 'react';
import { allGenerals, generalsByType } from '../../../game/generals';
import { getSkillById, generalSkills } from '../../../game/skills';
import type { GeneralDef } from '../../../game/types';
import { GENERAL_TITLES } from '../../../game/generals/factions';
import type { SkillDef } from '../../../game/types/skill';
import { ATK_INT_VALUES, DEF_VALUES, SPD_VALUES } from '../../../game/generals';
import GeneralPortrait from '../shared/GeneralPortrait';
import SkillIcon from '../shared/SkillIcon';
import RadarChart from '../shared/RadarChart';
import { useGeneralPortrait } from '../../hooks/useGeneralPortrait';

type Tab = 'generals' | 'skills';

export default function EncyclopediaScreen() {
  const [tab, setTab] = useState<Tab>('generals');
  const [generalFilter, setGeneralFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [selectedGeneral, setSelectedGeneral] = useState<GeneralDef | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillDef | null>(null);

  const filteredGenerals = generalFilter === 'all'
    ? allGenerals
    : generalsByType[generalFilter as keyof typeof generalsByType] ?? [];

  const filteredSkills = skillFilter === 'all'
    ? generalSkills
    : generalSkills.filter(s => s.type === skillFilter);

  const rankToValue = (rank: string, type: 'atk' | 'int' | 'def' | 'spd') => {
    if (type === 'atk' || type === 'int') return ATK_INT_VALUES[rank as keyof typeof ATK_INT_VALUES] ?? 100;
    if (type === 'def') return DEF_VALUES[rank as keyof typeof DEF_VALUES] ?? 50;
    return SPD_VALUES[rank as keyof typeof SPD_VALUES] ?? 60;
  };

  return (
    <div className="flex-1 flex flex-col p-3 w-full min-h-0 page-bg-encyclopedia" style={{ maxHeight: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' }}>
      <h1 className="text-2xl md:text-3xl text-[#c9a84c] text-center font-bold tracking-[0.15em] title-dynasty mb-2 md:mb-3">图鉴</h1>

      {/* 标签切换 */}
      <div className="flex justify-center gap-2 mb-2 md:mb-3">
        <button onClick={() => { setTab('generals'); setSelectedGeneral(null); }}
          className={`px-5 md:px-8 py-1.5 md:py-2 rounded text-base md:text-lg font-bold cursor-pointer transition-colors ${
            tab === 'generals' ? 'bg-[#c9a84c] text-[#1a0f07]' : 'bg-[#3d2b1a] text-[#8b7355] hover:text-[#c9a84c]'
          }`}>武将图鉴</button>
        <button onClick={() => { setTab('skills'); setSelectedSkill(null); }}
          className={`px-5 md:px-8 py-1.5 md:py-2 rounded text-base md:text-lg font-bold cursor-pointer transition-colors ${
            tab === 'skills' ? 'bg-[#c9a84c] text-[#1a0f07]' : 'bg-[#3d2b1a] text-[#8b7355] hover:text-[#c9a84c]'
          }`}>战法图鉴</button>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* 列表 */}
        <div className={`${selectedGeneral || selectedSkill ? 'flex-1' : 'w-full'} overflow-y-auto`}>
          {tab === 'generals' ? (
            <>
              <div className="flex justify-center gap-2 mb-2">
                {[{ key: 'all', label: '全部' }, { key: 'active', label: '主动' }, { key: 'pursuit', label: '追击' }, { key: 'command', label: '指挥' }, { key: 'passive', label: '被动' }].map(f => (
                  <button key={f.key} onClick={() => setGeneralFilter(f.key)}
                    className={`px-3 py-1 rounded text-sm cursor-pointer transition-colors ${
                      generalFilter === f.key ? 'bg-[#c9a84c] text-[#1a0f07] font-bold' : 'bg-[#1f1410] text-[#8b7355] border border-[#3d2b1a] hover:border-[#c9a84c]'
                    }`}>{f.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                {filteredGenerals.map(g => (
                  <div key={g.id} onClick={() => setSelectedGeneral(g)}
                    className={`hover-glow bg-transparent border rounded-lg p-3 text-center cursor-pointer ${
                      selectedGeneral?.id === g.id ? 'border-[#c9a84c] shadow-[0_0_8px_rgba(201,168,76,0.3)]' : 'border-transparent'
                    }`}
                  >
                    <GeneralPortrait generalId={g.id} name={g.name} size="lg" />
                    <div className="text-[#d4c5a0] text-base font-bold mt-1.5">{g.name}</div>
                    {GENERAL_TITLES[g.id] && <div className="gen-card-title mt-0.5">{GENERAL_TITLES[g.id]}</div>}
                    <div className="flex justify-center gap-1.5 mt-1 text-sm">
                      <span className="text-red-400/80">武{g.ranks.atk}</span>
                      <span className="text-blue-400/80">统{g.ranks.def}</span>
                      <span className="text-purple-400/80">智{g.ranks.int}</span>
                      <span className="text-green-400/80">速{g.ranks.spd}</span>
                    </div>
                    <div className="text-xs text-[#8b7355] mt-1">
                      {g.skillType === 'active' ? '主动' : g.skillType === 'pursuit' ? '追击' : g.skillType === 'command' ? '指挥' : '被动'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center gap-2 mb-2">
                {[{ key: 'all', label: '全部' }, { key: 'active', label: '主动' }, { key: 'pursuit', label: '追击' }, { key: 'command', label: '指挥' }, { key: 'passive', label: '被动' }].map(f => (
                  <button key={f.key} onClick={() => setSkillFilter(f.key)}
                    className={`px-3 py-1 rounded text-sm cursor-pointer transition-colors ${
                      skillFilter === f.key ? 'bg-[#c9a84c] text-[#1a0f07] font-bold' : 'bg-[#1f1410] text-[#8b7355] border border-[#3d2b1a] hover:border-[#c9a84c]'
                    }`}>{f.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSkills.map(s => (
                  <div key={s.id} onClick={() => setSelectedSkill(s)}
                    className={`hover-glow bg-transparent border rounded-lg p-4 cursor-pointer ${
                      selectedSkill?.id === s.id ? 'border-[#c9a84c] shadow-[0_0_8px_rgba(201,168,76,0.3)]' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <SkillIcon type={s.type} size="lg" />
                      <span className="text-[#d4c5a0] font-bold text-lg">{s.name}</span>
                      <span className={`text-sm px-2 py-0.5 rounded-full ${
                        s.type === 'active' ? 'bg-[#3a1010] text-[#ef4444]' : s.type === 'pursuit' ? 'bg-[#1a2a1a] text-[#22c55e]' :
                        s.type === 'command' ? 'bg-[#1a1a3a] text-[#818cf8]' : 'bg-[#2a1a0a] text-[#c9a84c]'
                      }`}>{s.type === 'active' ? '主动' : s.type === 'pursuit' ? '追击' : s.type === 'command' ? '指挥' : '被动'}</span>
                      {s.activationRate > 0 && <span className="text-base text-[#c9a84c] ml-auto">发动率 {s.activationRate}%</span>}
                    </div>
                    <div className="text-[#8b7355] text-base leading-relaxed">{s.description}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 右侧: 详情面板 */}
        {(selectedGeneral || selectedSkill) && (
          <div className="w-full md:w-[420px] flex-shrink-0">
            {selectedGeneral && (
              <GeneralDetailPanel general={selectedGeneral} onClose={() => setSelectedGeneral(null)} rankToValue={rankToValue} />
            )}
            {selectedSkill && (
              <SkillDetailPanel skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GeneralDetailPanel({ general, onClose, rankToValue }: { general: GeneralDef; onClose: () => void; rankToValue: (r: string, t: 'atk'|'int'|'def'|'spd') => number }) {
  const innate = getSkillById(general.innateSkillId);
  const { faction, title } = useGeneralPortrait(general.id);

  return (
    <div className="bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#c9a84c] text-2xl font-bold">{general.name}</h3>
        <button onClick={onClose} className="text-[#8b7355] hover:text-[#c9a84c] text-2xl cursor-pointer">✕</button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <GeneralPortrait generalId={general.id} name={general.name} size="xl" />
        <div>
          <div className="text-base px-3 py-1 rounded-full inline-block mb-1"
            style={{ backgroundColor: faction.accentColor + '22', color: faction.accentColor, border: `1px solid ${faction.accentColor}44` }}>
            {faction.name}国
          </div>
          {title && <div className="text-[#8b7355] text-sm">{title}</div>}
          <div className="text-[#c9a84c] text-sm mt-1">
            {general.skillType === 'active' ? '主动型' : general.skillType === 'pursuit' ? '追击型' : general.skillType === 'command' ? '指挥型' : '被动型'}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-[#c9a84c] text-lg font-bold mb-2 border-b border-[#3d2b1a] pb-1">四维图</h4>
        <div className="flex justify-center">
          <RadarChart ranks={general.ranks} size={220} />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center mt-3">
          <div><span className="text-[#ef4444] font-bold text-lg">{general.ranks.atk}</span><span className="text-[#8b7355] text-sm ml-1">({rankToValue(general.ranks.atk, 'atk')})</span></div>
          <div><span className="text-[#a855f7] font-bold text-lg">{general.ranks.int}</span><span className="text-[#8b7355] text-sm ml-1">({rankToValue(general.ranks.int, 'int')})</span></div>
          <div><span className="text-[#3b82f6] font-bold text-lg">{general.ranks.def}</span><span className="text-[#8b7355] text-sm ml-1">({rankToValue(general.ranks.def, 'def')})</span></div>
          <div><span className="text-[#22c55e] font-bold text-lg">{general.ranks.spd}</span><span className="text-[#8b7355] text-sm ml-1">({rankToValue(general.ranks.spd, 'spd')})</span></div>
        </div>
      </div>

      <div>
        <h4 className="text-[#c9a84c] text-lg font-bold mb-2 border-b border-[#3d2b1a] pb-1">自带战法</h4>
        {innate && (
          <div className="bg-[#1a0f07] rounded p-4 border border-[#3d2b1a]">
            <div className="flex items-center gap-3 mb-2">
              <SkillIcon type={innate.type} size="md" />
              <span className="text-[#d4c5a0] text-xl font-bold">{innate.name}</span>
              <span className="text-sm text-[#8b7355]">
                [{general.skillType === 'active' ? '主动' : general.skillType === 'pursuit' ? '追击' : general.skillType === 'command' ? '指挥' : '被动'}]
              </span>
            </div>
            <div className="text-[#8b7355] text-lg leading-relaxed">{innate.description}</div>
            {innate.activationRate > 0 && (
              <div className="text-[#c9a84c] text-lg mt-2 font-bold">发动率: {innate.activationRate}%</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillDetailPanel({ skill, onClose }: { skill: SkillDef; onClose: () => void }) {
  return (
    <div className="bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#c9a84c] text-2xl font-bold">{skill.name}</h3>
        <button onClick={onClose} className="text-[#8b7355] hover:text-[#c9a84c] text-2xl cursor-pointer">✕</button>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <SkillIcon type={skill.type} size="lg" />
        <span className={`text-base px-3 py-1.5 rounded-full ${
          skill.type === 'active' ? 'bg-[#3a1010] text-[#ef4444]' :
          skill.type === 'pursuit' ? 'bg-[#1a2a1a] text-[#22c55e]' :
          skill.type === 'command' ? 'bg-[#1a1a3a] text-[#818cf8]' :
          'bg-[#2a1a0a] text-[#c9a84c]'
        }`}>
          {skill.type === 'active' ? '主动战法' : skill.type === 'pursuit' ? '追击战法' : skill.type === 'command' ? '指挥战法' : '被动战法'}
        </span>
      </div>

      <div className="mb-5">
        <h4 className="text-[#c9a84c] text-lg font-bold mb-2 border-b border-[#3d2b1a] pb-1">效果描述</h4>
        <div className="text-[#d4c5a0] text-lg leading-relaxed bg-[#1a0f07] rounded p-4 border border-[#3d2b1a]">
          {skill.description}
        </div>
      </div>

      {skill.activationRate > 0 && (
        <div className="mb-5">
          <h4 className="text-[#c9a84c] text-lg font-bold mb-2 border-b border-[#3d2b1a] pb-1">发动率</h4>
          <div className="text-[#c9a84c] text-4xl font-bold">{skill.activationRate}%</div>
        </div>
      )}

      {skill.maxTriggersPerRound && (
        <div>
          <h4 className="text-[#c9a84c] text-lg font-bold mb-2 border-b border-[#3d2b1a] pb-1">每回合触发上限</h4>
          <div className="text-[#d4c5a0] text-2xl">{skill.maxTriggersPerRound} 次</div>
        </div>
      )}
    </div>
  );
}
