import { useEffect, useRef } from 'react';
import { useBattleStore } from '../store';

export function useBattleAnimation() {
  const isPlaying = useBattleStore(s => s.isPlaying);
  const speed = useBattleStore(s => s.playbackSpeed);
  const stepForward = useBattleStore(s => s.stepForward);
  const battleState = useBattleStore(s => s.battleState);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && battleState?.phase !== 'finished') {
      intervalRef.current = window.setInterval(() => {
        stepForward();
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, battleState?.phase]);

  // 当战斗结束时停止
  useEffect(() => {
    if (battleState?.phase === 'finished' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [battleState?.phase]);
}
