import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPut, apiDelete } from '../../lib/api';
import { allGenerals, getGeneralById } from '../../../game/generals';
import { generalSkills } from '../../../game/skills';

interface PlayerInfo {
  id: number;
  username: string;
  gold: number;
  is_admin: number;
  created_at?: string;
}

interface PlayerDetail {
  id: number;
  username: string;
  gold: number;
  isAdmin: boolean;
  generals: Record<string, number>;
  skills: string[];
}

export default function GmPanel() {
  const { player } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [editGold, setEditGold] = useState('');
  const [msg, setMsg] = useState('');

  // Redirect non-admin
  useEffect(() => {
    if (player && !player.isAdmin) navigate('/');
  }, [player, navigate]);

  // Load player list (also on mount via refreshList)
  const refreshList = () => {
    apiGet('/admin/players').then(setPlayers).catch(() => {});
  };
  useEffect(() => { refreshList(); }, []);

  // Load detail when selected
  useEffect(() => {
    if (selectedId) {
      apiGet(`/admin/player/${selectedId}`).then(d => {
        setDetail(d);
        setEditGold(String(d.gold));
      }).catch(() => {});
    }
  }, [selectedId]);

  const saveGold = async () => {
    if (!detail || !editGold) return;
    const val = parseInt(editGold);
    if (isNaN(val) || val < 0) return;
    await apiPut(`/admin/player/${detail.id}/gold`, { gold: val });
    setDetail({ ...detail, gold: val });
    setPlayers(prev => prev.map(p => p.id === detail.id ? { ...p, gold: val } : p));
    setMsg('金币已更新');
    setTimeout(() => setMsg(''), 2000);
  };

  const addGeneral = async (generalId: string) => {
    if (!detail) return;
    await apiPut(`/admin/player/${detail.id}/generals`, { generalId, advancement: 1 });
    setDetail({ ...detail, generals: { ...detail.generals, [generalId]: 1 } });
    setMsg(`已添加武将: ${getGeneralById(generalId)?.name || generalId}`);
    setTimeout(() => setMsg(''), 2000);
  };

  const setAdvancement = async (generalId: string, adv: number) => {
    if (!detail) return;
    if (adv <= 0) {
      await apiDelete(`/admin/player/${detail.id}/generals/${generalId}`);
      const g = { ...detail.generals };
      delete g[generalId];
      setDetail({ ...detail, generals: g });
    } else {
      await apiPut(`/admin/player/${detail.id}/generals`, { generalId, advancement: adv });
      setDetail({ ...detail, generals: { ...detail.generals, [generalId]: adv } });
    }
  };

  const addSkill = async (skillId: string) => {
    if (!detail) return;
    await apiPut(`/admin/player/${detail.id}/skills`, { skillId });
    setDetail({ ...detail, skills: [...detail.skills, skillId] });
  };

  const removeSkill = async (skillId: string) => {
    if (!detail) return;
    await apiDelete(`/admin/player/${detail.id}/skills/${skillId}`);
    setDetail({ ...detail, skills: detail.skills.filter(s => s !== skillId) });
  };

  if (!player?.isAdmin) return null;

  return (
    <div className="flex-1 flex p-3 gap-3 min-h-0" style={{ maxHeight: 'calc(100vh - 64px)' }}>
      {/* Left: Player List */}
      <div className="w-64 bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-3 overflow-y-auto flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#c9a84c] text-lg font-bold">玩家列表</h2>
          <button onClick={refreshList}
            className="px-2 py-1 bg-[#3d2b1a] text-[#c9a84c] rounded text-xs hover:bg-[#3a2f1e] cursor-pointer">刷新</button>
        </div>
        <div className="space-y-1">
          {players.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`p-2 rounded cursor-pointer transition-colors ${
                selectedId === p.id ? 'bg-[#c9a84c]/20 border border-[#c9a84c]' : 'hover:bg-[#2a1a0a] border border-transparent'
              }`}
            >
              <div className="text-[#d4c5a0] text-sm font-bold">{p.username}</div>
              <div className="text-[#8b7355] text-xs flex justify-between">
                <span>💰{p.gold}</span>
                {p.is_admin ? <span className="text-[#ef4444]">管理员</span> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 bg-[#1f1410] border border-[#3d2b1a] rounded-lg p-4 overflow-y-auto">
        {!detail ? (
          <div className="text-[#8b7355] text-center py-12">选择左侧玩家查看详情</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#c9a84c] text-2xl font-bold">{detail.username}</h2>
              {detail.isAdmin && <span className="text-sm bg-[#5c1a1a] text-[#ef4444] px-2 py-0.5 rounded">管理员</span>}
            </div>

            {msg && <div className="mb-3 p-2 bg-[#1a2a1a] border border-[#22c55e] rounded text-[#22c55e] text-sm">{msg}</div>}

            {/* Gold */}
            <div className="mb-4 flex items-center gap-3">
              <label className="text-[#8b7355] text-sm w-12">金币</label>
              <input value={editGold} onChange={e => setEditGold(e.target.value)}
                className="w-24 bg-[#1a0f07] border border-[#3d2b1a] rounded px-3 py-1.5 text-[#d4c5a0] text-sm outline-none focus:border-[#c9a84c]" />
              <button onClick={saveGold}
                className="px-3 py-1.5 bg-[#c9a84c] text-[#1a0f07] rounded text-sm font-bold hover:bg-[#a07d1a] cursor-pointer">保存</button>
            </div>

            {/* Generals */}
            <div className="mb-4">
              <h3 className="text-[#c9a84c] text-base font-bold mb-2 border-b border-[#3d2b1a] pb-1">
                武将 ({Object.keys(detail.generals).length}/{allGenerals.length})
              </h3>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {allGenerals.map(g => {
                  const adv = detail.generals[g.id] ?? 0;
                  return (
                    <div key={g.id} className="flex items-center gap-2 bg-[#1a0f07] rounded p-1.5">
                      <span className={`text-xs flex-1 ${adv > 0 ? 'text-[#d4c5a0]' : 'text-[#5a4328]'}`}>
                        {g.name}
                      </span>
                      {adv > 0 ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAdvancement(g.id, adv - 1)}
                            className="w-5 h-5 rounded bg-[#3d2b1a] text-[#c9a84c] text-xs flex items-center justify-center hover:bg-[#3a2f1e] cursor-pointer">-</button>
                          <span className="text-[#c9a84c] text-xs w-3 text-center">{adv}</span>
                          <button onClick={() => setAdvancement(g.id, Math.min(5, adv + 1))}
                            className="w-5 h-5 rounded bg-[#3d2b1a] text-[#c9a84c] text-xs flex items-center justify-center hover:bg-[#3a2f1e] cursor-pointer">+</button>
                        </div>
                      ) : (
                        <button onClick={() => addGeneral(g.id)}
                          className="px-2 py-0.5 bg-[#1a2a1a] text-[#22c55e] rounded text-[10px] hover:bg-[#2a3a2a] cursor-pointer">+添加</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-[#c9a84c] text-base font-bold mb-2 border-b border-[#3d2b1a] pb-1">
                战法 ({detail.skills.length}/{generalSkills.length})
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {generalSkills.map(s => {
                  const owned = detail.skills.includes(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2 bg-[#1a0f07] rounded p-1.5">
                      <span className={`text-xs flex-1 ${owned ? 'text-[#d4c5a0]' : 'text-[#5a4328]'}`}>
                        {s.name}
                      </span>
                      {owned ? (
                        <button onClick={() => removeSkill(s.id)}
                          className="px-2 py-0.5 bg-[#2a0000] text-[#ef4444] rounded text-[10px] hover:bg-[#3a0000] cursor-pointer">移除</button>
                      ) : (
                        <button onClick={() => addSkill(s.id)}
                          className="px-2 py-0.5 bg-[#1a2a1a] text-[#22c55e] rounded text-[10px] hover:bg-[#2a3a2a] cursor-pointer">+添加</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
