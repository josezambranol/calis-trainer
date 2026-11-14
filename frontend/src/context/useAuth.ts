import { createContext, useContext } from 'react';
import type { UserProfile } from '../types';

export interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  completeLogin: (loggedUser: UserProfile) => Promise<UserProfile>;
  updateCachedUser: (updatedUser: UserProfile) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
