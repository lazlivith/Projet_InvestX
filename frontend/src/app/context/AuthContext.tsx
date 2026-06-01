import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authAPI, profileAPI, LoginPayload, RegisterPayload } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;       // true pour admin ET superadmin
  isSuperAdmin: boolean;  // true uniquement pour superadmin
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Synchronise le profil depuis le serveur.
   * Priorité : serveur > localStorage
   * Protège contre la manipulation manuelle du localStorage.
   */
  const refreshUserProfile = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await profileAPI.getMe();
      const freshUser: User = res.data;

      // Mettre à jour le localStorage avec les données fraîches du serveur
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
    } catch (error: any) {
      // Token invalide ou expiré → déconnexion propre
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    }
  }, []);

  // Au démarrage : re-vérifier le rôle depuis le serveur (anti-manipulation localStorage)
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Afficher immédiatement les données locales (UX fluide)
          setUser(JSON.parse(storedUser));
          // Puis synchroniser avec le serveur en arrière-plan
          await refreshUserProfile();
        } catch {
          // Données locales corrompues → nettoyage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const login = async (data: LoginPayload) => {
    const response = await authAPI.login(data);
    const { accessToken, refreshToken, user } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
  };

  const register = async (data: RegisterPayload) => {
    await authAPI.register(data);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Dérivations de rôle calculées une seule fois
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin,
        isSuperAdmin,
        login,
        register,
        logout,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
