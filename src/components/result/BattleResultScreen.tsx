import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattleStore, useGameStore } from '../../store';
import type { SkillStats } from '../../types';
import RoundChart from './RoundChart';

export default function BattleResultScreen() {
  const navigate = useNavigate();
  const battleState = useBattleStore(s => s.battleState);
  const reset = useGameStore(s => s.reset);
  const [activeTab, setActiveTab] = useState<'overview' | 'trend' | 'details'>('overview');

  const handleNewBattle = () => { reset(); navigate('/'); };
  const handleRematch = () => { navigate('/team-builder'); };

  if (!battleState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#8b7355] gap-4">
        <p>没有战斗数据</p>
        <button onClick={handleNewBattle} className="px-6 py-2 bg-[#c9a84c] text-[#1f1410] rounded font-bold cursor-pointer">返回首页</button>
      </div>
    );
  }

  const winner = battleState.winner;
  const isPlayerWin = winner === 'player';
  const isDraw = winner === 'draw';

  return (
    <div className="flex-1 flex flex-col items-center p-6 max-w-4xl mx-auto w-full">
      {/* 结果标题 */}
      <div className={`text-4xl font-bold mb-4 ${isPlayerWin ? 'text-[#22c55e]' : isDraw ? 'text-[#c9a84c]' : 'text-[#ef4444]'}`}>
        {isPlayerWin ? '🏆 胜利！' : isDraw ? '🤝 平局' : '💀 战败'}
      </div>

      {/* 选项卡 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors ${
            activeTab === 'overview' ? 'bg-[#c9a84c] text-[#1f1410]' : 'bg-[#3d2b1a] text-[#8b7355] hover:text-[#c9a84c]'
          }`}
        >概览</button>
        <button
          onClick={() => setActiveTab('trend')}
          className={`px-4 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors ${
            activeTab === 'trend' ? 'bg-[#c9a84c] text-[#1f1410]' : 'bg-[#3d2b1a] text-[#8b7355] hover:text-[#c9a84c]'
          }`}
        >趋势</button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors ${
            activeTab === 'details' ? 'bg-[#c9a84c] text-[#1f1410]' : 'bg-[#3d2b1a] text-[#8b7355] hover:text-[#c9a84c]'
          }`}
        >详细统计</button>
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab battleState={battleState} />
      ) : activeTab === 'trend' ? (
        <TrendTab snapshots={battleState.roundSnapshots} />
      ) : (
        <DetailsTab
          playerGenerals={battleState.playerTeam.generals}
          enemyGenerals={battleState.enemyTeam.generals}
          playerSkillStats={battleState.playerSkillStats}
          enemySkillStats={battleState.enemySkillStats}
        />
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4 mt-6">
        <button onClick={handleRematch} className="px-8 py-3 bg-[#9b1d1d] text-white rounded-lg font-bold hover:bg-[#dc2626] transition-colors cursor-pointer">
          再来一局
        </button>
        <button onClick={handleNewBattle} className="px-8 py-3 bg-[#3d2b1a] text-[#c9a84c] rounded-lg font-bold hover:bg-[#3a2f1e] transition-colors cursor-pointer">
          返回首页
        </button>
      </div>
    </div>
  );
}

function OverviewTab({ battleState }: { battleState: NonNullable<ReturnType<typeof useBattleStore.getState>['battleState']> }) {
  const playerGenerals = battleState.playerTeam.generals;
  const enemyGenerals = battleState.enemyTeam.generals;

  return (
    <div className="w-full bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-[#6bc96b] font-bold mb-3 text-lg">我方</h4>
          {playerGenerals.map(g => {
            const totalDmg = battleState.playerTotalDamage[g.generalId] ?? 0;
            const stats = battleState.playerSkillStats[g.generalId];
            return (
              <div key={g.generalId} className="mb-3 bg-[#1f1410] rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#d4c5a0] font-bold">{g.name}</span>
                  {!g.isAlive && <span className="text-[#ef4444] text-xs">(阵亡)</span>}
                </div>
                <div className="text-[#8b7355] text-xs space-y-0.5">
                  <div>剩余生命: {Math.max(0, g.currentHp)} / {g.maxHp}</div>
                  <div>总伤害: <span className="text-[#ef4444] font-bold">{totalDmg}</span></div>
                  {stats && (
                    <>
                      <div>普攻: {stats.normalAttack.count}次 · {stats.normalAttack.damage}伤害</div>
                      {Object.values(stats.skills).map(s => (
                        <div key={s.name}>
                          [{s.type==='active'?'主动':s.type==='pursuit'?'追击':s.type==='command'?'指挥':'被动'}] {s.name}: {s.count}次 · {s.damage}伤害{s.heal > 0 ? ` · ${s.heal}治疗` : ''}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <h4 className="text-[#d46b6b] font-bold mb-3 text-lg">敌方</h4>
          {enemyGenerals.map(g => {
            const totalDmg = battleState.enemyTotalDamage[g.generalId] ?? 0;
            const stats = battleState.enemySkillStats[g.generalId];
            return (
              <div key={g.generalId} className="mb-3 bg-[#1f1410] rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#d4c5a0] font-bold">{g.name}</span>
                  {!g.isAlive && <span className="text-[#ef4444] text-xs">(阵亡)</span>}
                </div>
                <div className="text-[#8b7355] text-xs space-y-0.5">
                  <div>剩余生命: {Math.max(0, g.currentHp)} / {g.maxHp}</div>
                  <div>总伤害: <span className="text-[#ef4444] font-bold">{totalDmg}</span></div>
                  {stats && (
                    <>
                      <div>普攻: {stats.normalAttack.count}次 · {stats.normalAttack.damage}伤害</div>
                      {Object.values(stats.skills).map(s => (
                        <div key={s.name}>
                          [{s.type==='active'?'主动':s.type==='pursuit'?'追击':s.type==='command'?'指挥':'被动'}] {s.name}: {s.count}次 · {s.damage}伤害{s.heal > 0 ? ` · ${s.heal}治疗` : ''}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrendTab({ snapshots }: { snapshots: any[] }) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="w-full bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-6 text-center text-[#5a4328]">
        暂无趋势数据
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <RoundChart snapshots={snapshots} metric="hp" />
      <RoundChart snapshots={snapshots} metric="damage" />
    </div>
  );
}

function DetailsTab({
  playerGenerals, enemyGenerals,
  playerSkillStats, enemySkillStats,
}: {
  playerGenerals: any[]; enemyGenerals: any[];
  playerSkillStats: Record<string, SkillStats>;
  enemySkillStats: Record<string, SkillStats>;
}) {
  return (
    <div className="w-full bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-6">
      <div className="grid grid-cols-2 gap-6">
        <GeneralDetailStats generals={playerGenerals} skillStats={playerSkillStats} side="player" />
        <GeneralDetailStats generals={enemyGenerals} skillStats={enemySkillStats} side="enemy" />
      </div>
    </div>
  );
}

function GeneralDetailStats({ generals, skillStats, side }: { generals: any[]; skillStats: Record<string, SkillStats>; side: string }) {
  const colorClass = side === 'player' ? 'text-[#6bc96b]' : 'text-[#d46b6b]';

  return (
    <div>
      <h4 className={`${colorClass} font-bold mb-3`}>{side === 'player' ? '我方' : '敌方'}详细统计</h4>
      {generals.map(g => {
        const stats = skillStats[g.generalId];
        if (!stats) return null;
        return (
          <div key={g.generalId} className="mb-4 bg-[#1f1410] rounded p-3 border border-[#3d2b1a]">
            <div className="text-[#d4c5a0] font-bold text-sm mb-2">{g.name}</div>
            {/* 普攻行 */}
            <div className="mb-2">
              <div className="text-xs text-[#8b7355] mb-1">普攻 (共{stats.normalAttack.count}次)</div>
              {stats.normalAttack.count > 0 ? (
                <div className="flex justify-between text-xs">
                  <span className="text-[#d4c5a0]">造成伤害</span>
                  <span className="text-[#ef4444] font-mono">{stats.normalAttack.damage}</span>
                </div>
              ) : (
                <div className="text-[#5a4328] text-xs">无普攻记录</div>
              )}
            </div>
            {/* 每个技能 */}
            {Object.entries(stats.skills).length > 0 && (
              <div>
                <div className="text-xs text-[#8b7355] mb-1">战法</div>
                {Object.entries(stats.skills).map(([skillId, s]) => (
                  <div key={skillId} className="bg-[#1f1410] rounded p-2 mb-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-[#c9a84c] font-bold">{s.name}</span>
                      <span className="text-[#8b7355]">
                        [{s.type === 'active' ? '主动' : s.type === 'pursuit' ? '追击' : s.type === 'command' ? '指挥' : '被动'}]
                        {' '}发动{s.count}次
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#d4c5a0]">伤害</span>
                      <span className="text-[#ef4444] font-mono">{s.damage}</span>
                    </div>
                    {s.heal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#d4c5a0]">治疗</span>
                        <span className="text-[#22c55e] font-mono">{s.heal}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {generals.every((g: any) => !skillStats[g.generalId]) && (
        <div className="text-[#5a4328] text-sm text-center py-4">暂无统计</div>
      )}
    </div>
  );
}
