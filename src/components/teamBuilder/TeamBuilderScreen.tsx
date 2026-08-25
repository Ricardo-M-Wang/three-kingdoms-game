import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamStore, useBattleStore, useGameStore } from '../../store';
import { allGenerals, generalSkills } from '../../data';
import { refreshEffectiveAttributes } from '../../engine';
import GeneralPool from './GeneralPool';
import GeneralDetail from './GeneralDetail';
import GeneralPortrait from '../shared/GeneralPortrait';

export default function TeamBuilderScreen() {
  const navigate = useNavigate();
  const {
    playerGenerals, enemyGenerals, selectedGeneralIndex, selectedEnemyIndex, editingSide,
    selectGeneral, removeGeneral, selectSlot, selectEnemySlot, setEnemyGeneral,
    allocatePoint, allocateAllPoints, resetAllPoints, equipSkill, unequipSkill,
    randomEnemyTeam, removeEnemyGeneral, setEditingSide,
    presets, savePreset, deletePreset, applyPreset,
  } = useTeamStore();
  const initBattle = useBattleStore(s => s.initBattle);
  const ownedGenerals = useGameStore(s => s.ownedGenerals);
  const ownedSkills = useGameStore(s => s.ownedSkills);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saveSide, setSaveSide] = useState<'player' | 'enemy'>('player');

  const canStartBattle = playerGenerals.length >= 1 && enemyGenerals.length >= 1;

  const handleStartBattle = () => {
    if (!canStartBattle) return;
    const playerTeam = {
      owner: 'player' as const,
      generals: playerGenerals.map(g => {
        refreshEffectiveAttributes(g);
        return { ...g, currentHp: 10000, isAlive: true, buffs: [], statuses: [], customState: {} };
      }),
    };
    const enemyTeam = {
      owner: 'enemy' as const,
      generals: enemyGenerals.map(g => {
        refreshEffectiveAttributes(g);
        return { ...g, currentHp: 10000, isAlive: true, buffs: [], statuses: [], customState: {} };
      }),
    };
    initBattle(playerTeam, enemyTeam);
    navigate('/battle');
  };

  // 处理武将池点击: 根据编辑目标分发给玩家或敌方
  const handlePoolSelect = (def: typeof allGenerals[0]) => {
    // 玩家方: 检查是否拥有该武将
    if (editingSide === 'player' && !(def.id in ownedGenerals)) {
      return; // 未拥有，无法上阵
    }
    // 己方内部不可重复，敌方内部不可重复，但双方可以使用相同武将
    const sameSideDeployed = editingSide === 'player'
      ? playerGenerals.map(g => g?.generalId).filter(Boolean)
      : enemyGenerals.map(g => g?.generalId).filter(Boolean);
    if (sameSideDeployed.includes(def.id)) {
      return; // 己方已上阵，不可重复
    }
    if (editingSide === 'enemy') {
      const emptySlot = [0, 1, 2].find(i => !enemyGenerals[i]);
      const slot = emptySlot ?? Math.max(0, Math.max(selectedEnemyIndex, 0));
      setEnemyGeneral(slot, def);
      selectEnemySlot(slot);
    } else {
      const emptySlot = [0, 1, 2].find(i => !playerGenerals[i]);
      const slot = emptySlot ?? Math.max(0, selectedGeneralIndex);
      selectGeneral(slot, def);
      selectSlot(slot);
    }
  };

  // 当前编辑的武将
  const editingGeneral = editingSide === 'player'
    ? (selectedGeneralIndex >= 0 ? playerGenerals[selectedGeneralIndex] : null)
    : (selectedEnemyIndex >= 0 ? enemyGenerals[selectedEnemyIndex] : null);
  const editingIndex = editingSide === 'player' ? selectedGeneralIndex : selectedEnemyIndex;

  return (
    <div className="flex-1 flex flex-col p-2 w-full gap-1.5 page-bg-team" style={{ maxHeight: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' }}>
      {/* 标题栏 */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl text-[#c9a84c] font-bold tracking-wider">编队配将</h1>
      </div>

      {/* 主区域: 左半(武将池) | 右半(详情+阵容) */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* 左半: 武将池 */}
        <div className="flex-1 flex flex-col min-w-0">
          <GeneralPool
            generals={allGenerals}
            selectedIds={(editingSide === 'player'
              ? playerGenerals.map(g => g?.generalId).filter(Boolean)
              : enemyGenerals.map(g => g?.generalId).filter(Boolean)) as string[]}
            ownedGeneralIds={new Set(Object.keys(ownedGenerals))}
            onSelect={handlePoolSelect}
          />
        </div>

        {/* 右半: 详情 + 阵容 各占一半 */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {/* 武将详情 — 上半 */}
          <div className="flex-1 min-h-0">
            {editingGeneral ? (
              <GeneralDetail
                general={editingGeneral}
                index={editingIndex}
                side={editingSide}
                onAllocatePoint={allocatePoint}
                onAllocateAll={allocateAllPoints}
                onResetAll={resetAllPoints}
                onEquipSkill={equipSkill}
                onUnequipSkill={unequipSkill}
                availableSkills={generalSkills.filter(s => ownedSkills.includes(s.id))}
              />
            ) : (
              <div className="bg-transparent border border-white/5 rounded-lg p-6 text-center text-[#8b7355] text-sm flex items-center justify-center h-full">
                点击左侧武将加入队伍<br />再点击已选武将查看详情
              </div>
            )}
          </div>

          {/* 双方阵容 — 下半 */}
          <div className="flex-1 flex flex-col gap-0.5 bg-transparent border border-white/5 rounded-lg p-1.5 min-h-0">
            {/* 敌方队伍 */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${editingSide === 'enemy' ? 'text-[#ef4444]' : 'text-[#d46b6b]'}`}>
                  敌方{editingSide === 'enemy' && ' · 编辑中'}
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => setEditingSide(editingSide === 'player' ? 'enemy' : 'player')}
                    className={`px-3 py-1 rounded text-base font-bold cursor-pointer ${
                      editingSide === 'enemy' ? 'bg-[#5c1a1a] text-[#ef4444]' : 'bg-[#1a2a1a] text-[#22c55e]'
                    }`}
                  >{editingSide === 'enemy' ? '✓敌方' : '切敌方'}</button>
                  <button onClick={randomEnemyTeam}
                    className="px-3 py-1 bg-[#3d2b1a] text-[#c9a84c] rounded text-base font-bold hover:bg-[#3a2f1e] cursor-pointer">随机</button>
                  <button onClick={() => { setSaveSide('player'); setPresetName(''); setSaveModalOpen(true); }}
                    disabled={playerGenerals.length === 0 && enemyGenerals.length === 0}
                    className="px-3 py-1 bg-[#1a2a1a] border border-[#2a4a2a] text-[#22c55e] rounded text-base font-bold hover:bg-[#2a3a2a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">保存</button>
                  <button onClick={() => setLoadModalOpen(true)} disabled={presets.length === 0}
                    className="px-3 py-1 bg-[#1f1410] border border-[#3d2b1a] text-[#c9a84c] rounded text-base font-bold hover:bg-[#2a2a3e] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">加载({presets.length})</button>
                </div>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {[0, 1, 2].map(slot => {
                  const g = enemyGenerals[slot];
                  return (
                    <div key={slot} onClick={() => g ? selectEnemySlot(slot) : null}
                      className={`flex-1 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer py-0.5 ${
                        g
                          ? selectedEnemyIndex === slot && editingSide === 'enemy'
                            ? 'border-[#ef4444] bg-transparent'
                            : 'border-[#5c1a1a] bg-transparent hover:border-[#8c2a2a]'
                          : 'border-dashed border-[#3d2b1a] bg-transparent hover:border-[#5a4328]'
                      }`}
                    >
                      {g ? (
                        <div className="text-center">
                          <GeneralPortrait generalId={g.generalId} name={g.name} size="md" showFrame={false} showRank={false} />
                          <div className="text-[#d46b6b] text-base font-bold">{g.name}</div>
                          <div className="text-[#8b7355] text-sm">武{g.effectiveAttributes.atk} 智{g.effectiveAttributes.int} 统{g.effectiveAttributes.def} 速{g.effectiveAttributes.spd}</div>
                          <button onClick={(e) => { e.stopPropagation(); removeEnemyGeneral(slot); }}
                            className="text-sm text-[#8b4513] hover:text-red-400 cursor-pointer">移除</button>
                        </div>
                      ) : (
                        <div className="text-[#5a4328] text-2xl py-3">+</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VS */}
            <div className="flex items-center gap-1">
              <div className="flex-1 border-t border-[#3d2b1a]" />
              <span className="text-[#c9a84c] text-base font-bold">VS</span>
              <div className="flex-1 border-t border-[#3d2b1a]" />
            </div>

            {/* 我方队伍 */}
            <div>
              <h3 className={`text-lg font-bold ${editingSide === 'player' ? 'text-[#22c55e]' : 'text-[#c9a84c]'}`}>
                我方{editingSide === 'player' && ' · 编辑中'}
              </h3>
              <div className="flex gap-0.5 mt-0.5">
                {[0, 1, 2].map(slot => {
                  const g = playerGenerals[slot];
                  return (
                    <div key={slot} onClick={() => g ? selectSlot(slot) : null}
                      className={`flex-1 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer py-0.5 ${
                        g
                          ? selectedGeneralIndex === slot && editingSide === 'player'
                            ? 'border-[#22c55e] bg-transparent'
                            : 'border-[#2a4a2a] bg-transparent hover:border-[#3a6a3a]'
                          : 'border-dashed border-[#3d2b1a] bg-transparent hover:border-[#5a4328]'
                      }`}
                    >
                      {g ? (
                        <div className="text-center">
                          <GeneralPortrait generalId={g.generalId} name={g.name} size="md" showFrame={false} showRank={false} />
                          <div className="text-[#6bc96b] text-base font-bold">{g.name}</div>
                          <div className="text-[#6b5b3e] text-sm">武{g.effectiveAttributes.atk} 智{g.effectiveAttributes.int} 统{g.effectiveAttributes.def} 速{g.effectiveAttributes.spd}</div>
                          <button onClick={(e) => { e.stopPropagation(); removeGeneral(slot); }}
                            className="text-sm text-[#8b4513] hover:text-red-400 cursor-pointer">移除</button>
                        </div>
                      ) : (
                        <div className="text-[#5a4328] text-2xl py-3">+</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 开始战斗 */}
            <div className="flex justify-center mt-auto pt-1">
              <button
                onClick={handleStartBattle}
                disabled={!canStartBattle}
                className={`px-14 py-2.5 rounded-lg text-xl font-bold transition-all cursor-pointer hover-glow-btn ${
                  canStartBattle
                    ? 'bg-[#9b1d1d] text-white hover:bg-[#dc2626]'
                    : 'bg-[#3d2b1a] text-[#8b7355] cursor-not-allowed'
                }`}
              >开始战斗</button>
            </div>
          </div>
        </div>
      </div>

      {/* 保存阵容弹窗 */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-6 w-96">
            <h3 className="text-[#c9a84c] text-lg font-bold mb-4">保存阵容</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSaveSide('player')}
                className={`flex-1 py-2 rounded text-sm font-bold cursor-pointer ${
                  saveSide === 'player'
                    ? 'bg-[#1a2a1a] text-[#22c55e] border border-[#22c55e]'
                    : 'bg-[#1f1410] text-[#8b7355] border border-[#3d2b1a]'
                }`}
              >
                我方 ({playerGenerals.length}人)
              </button>
              <button
                onClick={() => setSaveSide('enemy')}
                className={`flex-1 py-2 rounded text-sm font-bold cursor-pointer ${
                  saveSide === 'enemy'
                    ? 'bg-[#2a1a1a] text-[#ef4444] border border-[#ef4444]'
                    : 'bg-[#1f1410] text-[#8b7355] border border-[#3d2b1a]'
                }`}
              >
                敌方 ({enemyGenerals.length}人)
              </button>
            </div>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="输入阵容名称..."
              className="w-full bg-[#1f1410] border border-[#3d2b1a] rounded px-3 py-2 text-[#d4c5a0] text-sm mb-4
                outline-none focus:border-[#c9a84c]"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-1.5 bg-[#3d2b1a] text-[#8b7355] rounded text-sm hover:bg-[#3a2f1e] cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (presetName.trim()) {
                    savePreset(presetName.trim(), saveSide);
                    setSaveModalOpen(false);
                    setPresetName('');
                  }
                }}
                disabled={!presetName.trim()}
                className="px-4 py-1.5 bg-[#c9a84c] text-[#1f1410] rounded text-sm font-bold
                  hover:bg-[#a07d1a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载阵容弹窗 */}
      {loadModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-6 w-[500px] max-h-[70vh] flex flex-col">
            <h3 className="text-[#c9a84c] text-lg font-bold mb-4">加载阵容</h3>
            {presets.length === 0 ? (
              <p className="text-[#8b7355] text-center py-8">暂无保存的阵容</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {presets.map(p => (
                  <div
                    key={p.id}
                    className="bg-[#1f1410] border border-[#3d2b1a] rounded p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[#d4c5a0] text-sm font-bold truncate">{p.name}</div>
                      <div className="text-[#8b7355] text-xs mt-0.5">
                        {p.createdAt} · {p.generals.length}人
                        · {p.generals.map(g => allGenerals.find(d => d.id === g.generalId)?.name ?? '?').join('、')}
                      </div>
                    </div>
                    <div className="flex gap-1.5 ml-3 flex-shrink-0">
                      <button
                        onClick={() => { applyPreset(p.id, 'player'); setLoadModalOpen(false); }}
                        className="px-2 py-1 bg-[#1a2a1a] text-[#22c55e] rounded text-xs hover:bg-[#2a3a2a] cursor-pointer"
                        title="应用到己方"
                      >
                        己方
                      </button>
                      <button
                        onClick={() => { applyPreset(p.id, 'enemy'); setLoadModalOpen(false); }}
                        className="px-2 py-1 bg-[#2a1a1a] text-[#ef4444] rounded text-xs hover:bg-[#3a2a2a] cursor-pointer"
                        title="应用到敌方"
                      >
                        敌方
                      </button>
                      <button
                        onClick={() => deletePreset(p.id)}
                        className="px-2 py-1 bg-[#2a0000] text-[#8b4513] rounded text-xs hover:bg-[#3a0000] cursor-pointer"
                        title="删除"
                      >
                        删
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setLoadModalOpen(false)}
              className="px-4 py-1.5 bg-[#3d2b1a] text-[#8b7355] rounded text-sm hover:bg-[#3a2f1e] cursor-pointer self-end"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
