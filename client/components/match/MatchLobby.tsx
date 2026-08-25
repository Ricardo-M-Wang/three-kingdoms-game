import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../../store/matchStore';
import DraftPhase from './DraftPhase';
import BanPhase from './BanPhase';
import ConfigPhase from './ConfigPhase';
import BattlePhase from './BattlePhase';

export default function MatchLobby() {
  const navigate = useNavigate();
  const {
    status, connect, disconnect, joinQueue, leaveQueue, phase, reward, replays, reset,
  } = useMatchStore();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) connect(token);
    return () => { disconnect(); };
  }, []);

  const handleLeave = () => {
    reset();
    navigate('/');
  };

  // Finished
  if (status === 'finished' && reward) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 gap-4 md:gap-6 page-bg-match" style={{ position: 'relative', overflow: 'hidden' }}>

        <h1 className="text-2xl md:text-3xl text-[#c9a84c] font-bold tracking-widest title-dynasty">战斗结束</h1>
        <div className="dynasty-panel rounded-xl p-6 md:p-8 text-center max-w-md mx-4">
          <div className={`text-3xl md:text-4xl font-bold mb-3 md:mb-4 ${reward.youWon ? 'text-[#22c55e]' : reward.winner ? 'text-[#ef4444]' : 'text-[#c9a84c]'}`}>
            {reward.youWon ? '胜利！' : (reward.winner ? '败北' : '平局')}
          </div>
          <div className="text-[#c9a84c] text-xl md:text-2xl mb-2">
            比分: {reward.score[0]} - {reward.score[1]}
          </div>
          <div className="text-[#8b7355] text-base md:text-lg mb-6">
            获得金币: <span className="text-[#c9a84c] font-bold">+{reward.gold}</span>
          </div>
          {replays.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[#c9a84c] text-base mb-2">战报回放</h3>
              <div className="flex gap-2 justify-center flex-wrap">
                {replays.map((_, i) => (
                  <button key={i}
                    onClick={() => {/* TODO: replay viewer */}}
                    className="px-3 py-1 bg-[#3d2b1a] text-[#c9a84c] rounded text-sm hover:bg-[#3a2f1e] cursor-pointer"
                  >第{i + 1}局</button>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleLeave}
            className="btn-dynasty-primary px-8 py-2.5 rounded-lg text-lg">返回首页</button>
        </div>
      </div>
    );
  }

  // Queueing
  if (status === 'idle' || status === 'queueing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 page-bg-match" style={{ position: 'relative', overflow: 'hidden' }}>

        <h1 className="text-3xl text-[#c9a84c] font-bold tracking-widest title-dynasty">匹配对战</h1>
        <div className="dynasty-panel rounded-xl p-8 text-center max-w-md w-full">
          {status === 'idle' ? (
            <>
              <p className="text-[#8b7355] text-base mb-6">寻找实力相当的对手</p>
              <button onClick={joinQueue}
                className="btn-dynasty-primary px-12 py-3.5 rounded-lg text-xl tracking-wider"
                style={{ boxShadow: '0 0 30px rgba(201,168,76,0.2)' }}
              >开始匹配</button>
            </>
          ) : (
            <>
              <div className="text-[#c9a84c] text-lg mb-4 animate-pulse-glow">正在寻找对手...</div>
              <div className="flex justify-center gap-2 mb-6">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-3 h-3 bg-[#c9a84c] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <button onClick={leaveQueue}
                className="px-6 py-2 bg-[#3d2b1a] text-[#8b7355] rounded hover:text-[#c9a84c] cursor-pointer text-sm"
              >取消匹配</button>
            </>
          )}
        </div>
        <button onClick={() => navigate('/')}
          className="text-[#8b7355] hover:text-[#c9a84c] text-sm cursor-pointer">返回首页</button>
      </div>
    );
  }

  // Phase-based screens
  if (status === 'playing' || status === 'matched') {
    if (phase === 'draft_generals' || phase === 'draft_skills') {
      return <DraftPhase />;
    }
    if (phase === 'ban') {
      return <BanPhase />;
    }
    if (phase === 'config') {
      return <ConfigPhase />;
    }
    if (phase === 'battle') {
      const battleIndex = useMatchStore.getState().battleIndex;
      return <BattlePhase key={battleIndex} />;
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[#c9a84c] text-xl animate-pulse-glow">加载中...</div>
    </div>
  );
}
