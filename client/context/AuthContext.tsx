import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiPost, apiGet } from '../lib/api';

interface PlayerData {
  id: number;
  username: string;
  gold: number;
  isAdmin: boolean;
  generals: Record<string, number>;
  skills: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  player: PlayerData | null;
  login: (username: string, password: string) => Promise<string | null>;
  register: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  refreshPlayerData: () => Promise<void>;
  updateLocalPlayer: (data: Partial<PlayerData>) => void;
}

const AuthContext = createContext<AuthState>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlayerData = useCallback(async () => {
    try {
      const data = await apiGet('/player/full');
      setPlayer({
        id: data.id,
        username: data.username,
        gold: data.gold,
        isAdmin: data.isAdmin,
        generals: data.generals || {},
        skills: data.skills || [],
      });
    } catch {
      localStorage.removeItem('auth_token');
      setPlayer(null);
    }
  }, []);

  // On mount: check for existing token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshPlayerData().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshPlayerData]);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const data = await apiPost('/auth/login', { username, password });
      localStorage.setItem('auth_token', data.token);
      await refreshPlayerData();
      return null; // success
    } catch (err: any) {
      return err.message || '登录失败';
    }
  }, [refreshPlayerData]);

  const register = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const data = await apiPost('/auth/register', { username, password });
      localStorage.setItem('auth_token', data.token);
      await refreshPlayerData();
      return null; // success
    } catch (err: any) {
      return err.message || '注册失败';
    }
  }, [refreshPlayerData]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setPlayer(null);
  }, []);

  const updateLocalPlayer = useCallback((data: Partial<PlayerData>) => {
    setPlayer(prev => prev ? { ...prev, ...data } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!player,
      isLoading,
      player,
      login,
      register,
      logout,
      refreshPlayerData,
      updateLocalPlayer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
