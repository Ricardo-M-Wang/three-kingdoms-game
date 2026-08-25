import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useGameStore } from './store';
import AppLayout from './components/layout/AppLayout';
import HomeScreen from './components/home/HomeScreen';
import TeamBuilderScreen from './components/teamBuilder/TeamBuilderScreen';
import BattleScreen from './components/battle/BattleScreen';
import BattleResultScreen from './components/result/BattleResultScreen';
import EncyclopediaScreen from './components/home/EncyclopediaScreen';
import GachaScreen from './components/home/GachaScreen';
import LoginScreen from './components/login/LoginScreen';
import GmPanel from './components/admin/GmPanel';
import PreviewA from './components/preview/PreviewA';
import PreviewB from './components/preview/PreviewB';
import PreviewC from './components/preview/PreviewC';
import MatchLobby from './components/match/MatchLobby';

function PlayerDataSyncer() {
  const { player } = useAuth();
  const loadPlayerData = useGameStore(s => s.loadPlayerData);

  useEffect(() => {
    if (player) {
      loadPlayerData({
        gold: player.gold,
        generals: player.generals,
        skills: player.skills,
      });
    }
  }, [player, loadPlayerData]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a0f07] flex items-center justify-center">
        <div className="text-[#c9a84c] text-2xl animate-pulse-glow tracking-widest">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <><PlayerDataSyncer />{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/preview-a" element={<PreviewA />} />
      <Route path="/preview-b" element={<PreviewB />} />
      <Route path="/preview-c" element={<PreviewC />} />
      <Route path="*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/team-builder" element={<TeamBuilderScreen />} />
              <Route path="/battle" element={<BattleScreen />} />
              <Route path="/result" element={<BattleResultScreen />} />
              <Route path="/encyclopedia" element={<EncyclopediaScreen />} />
              <Route path="/gacha" element={<GachaScreen />} />
              <Route path="/gm" element={<GmPanel />} />
              <Route path="/match" element={<MatchLobby />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
