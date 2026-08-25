import { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattleStore, useGameStore } from '../../store';
import { useBattleAnimation } from '../../hooks/useBattleAnimation';
import { eventBus } from '../../engine';
import type { BattleLogEntry } from '../../types';
import BattleField from './BattleField';
import BattleLog from './BattleLog';
import BattleControls from './BattleControls';
import RoundIndicator from './RoundIndicator';
import GeneralInspectPanel from './GeneralInspectPanel';

const BATTLE_BGS = ['/bg-match.jpg', '/bg-team.jpg', '/bg-login-1.jpg'];

export default function BattleScreen() {
  const navigate = useNavigate();
  const battleState = useBattleStore(s => s.battleState);
  const isPlaying = useBattleStore(s => s.isPlaying);
  const inspectedId = useBattleStore(s => s.inspectedGeneralId);
  const setInspected = useBattleStore(s => s.setInspectedGeneral);
  const screenShake = useBattleStore(s => s.screenShake);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);

  // 直接监听 eventBus 获取战报，避免 Zustand 深层订阅卡顿
  useEffect(() => {
    setBattleLog([...eventBus.getLogs()]);
    const handler = () => setBattleLog([...eventBus.getLogs()]);
    eventBus.on('log', handler);
    return () => eventBus.off('log', handler);
  }, []);

  const bgImage = useMemo(() => BATTLE_BGS[Math.floor(Math.random() * BATTLE_BGS.length)], []);

  useBattleAnimation();

  useEffect(() => {
    if (battleState?.phase === 'finished') {
      const timer = setTimeout(() => {
        useGameStore.getState().setPhase('result');
        navigate('/result');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [battleState?.phase]);

  const handleGeneralClick = (key: string) => {
    if (!isPlaying) {
      setInspected(inspectedId === key ? null : key);
    }
  };

  const inspectedGeneral = (() => {
    if (!inspectedId) return null;
    const [side, ...rest] = inspectedId.split(':');
    const generalId = rest.join(':');
    const team = side === 'player' ? battleState?.playerTeam.generals : battleState?.enemyTeam.generals;
    return team?.find(g => g.generalId === generalId) ?? null;
  })();

  if (!battleState) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8b7355]">
        请先配置队伍
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-2 w-full gap-1 min-h-0" style={{
      maxHeight: 'calc(100vh - 64px)', overflow: 'hidden',
      background: `url(${bgImage}) center / cover no-repeat fixed`,
    }}>
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/70 -z-0" />

      {/* 回合指示器 */}
      <div className="relative z-10 shrink-0">
        <RoundIndicator
          round={battleState.roundNumber}
          maxRounds={battleState.maxRounds}
          phase={battleState.phase}
        />
      </div>

      {/* 战场 — 高度自适应武将数量 */}
      <div className={`shrink-0 relative z-10 ${screenShake ? 'animate-screen-shake' : ''}`}>
        <BattleField state={battleState} onGeneralClick={handleGeneralClick} />
      </div>

      {/* 文字战报 — 填满剩余空间，允许滑动 */}
      <div className="flex-1 min-h-0 relative z-10 overflow-y-auto" ref={logScrollRef}>
        <BattleLog entries={battleLog} speed={useBattleStore(s => s.playbackSpeed)} />
      </div>

      {/* 控制栏 */}
      <div className="relative z-10 shrink-0">
        <BattleControls />
      </div>

      {/* 暂停提示 */}
      {!isPlaying && (
        <div className="text-center text-[10px] text-[#8b7355] relative z-10 shrink-0">暂停中 — 点击武将头像查看详情</div>
      )}

      {/* 武将详情浮层 */}
      {inspectedGeneral && !isPlaying && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setInspected(null)}
        >
          <div className="max-w-md w-full" onClick={e => e.stopPropagation()}>
            <GeneralInspectPanel general={inspectedGeneral} onClose={() => setInspected(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
