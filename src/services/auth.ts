import type { UserProfile } from '../types';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from './storage';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];

  private constructor() {
    this.currentUser = loadProfile();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public subscribe(listener: (user: UserProfile | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  public async signUpWithEmail(name: string, email: string): Promise<UserProfile> {
    const newUser: UserProfile = {
      ...DEFAULT_PROFILE,
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: name.trim() || 'Atleta',
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    };
    this.currentUser = newUser;
    saveProfile(newUser);
    this.notify();
    return newUser;
  }

  public async loginWithEmail(email: string): Promise<UserProfile> {
    const existing = loadProfile();
    if (existing && existing.email.toLowerCase() === email.toLowerCase()) {
      this.currentUser = existing;
      this.notify();
      return existing;
    }

    const name = email.split('@')[0] || 'Atleta';
    return this.signUpWithEmail(name, email);
  }

  public async loginWithGoogle(): Promise<UserProfile> {
    const demoGoogleUser: UserProfile = {
      ...DEFAULT_PROFILE,
      id: 'g_' + Math.random().toString(36).substring(2, 9),
      name: 'Usuario Google Fit',
      email: 'usuario.fit@gmail.com',
    };
    this.currentUser = demoGoogleUser;
    saveProfile(demoGoogleUser);
    this.notify();
    return demoGoogleUser;
  }

  public updateUserProfile(updates: Partial<UserProfile>): UserProfile {
    if (!this.currentUser) {
      this.currentUser = { ...DEFAULT_PROFILE, ...updates };
    } else {
      this.currentUser = { ...this.currentUser, ...updates };
    }
    saveProfile(this.currentUser);
    this.notify();
    return this.currentUser;
  }

  public logout(): void {
    this.currentUser = null;
    this.notify();
  }
}

export const authService = AuthService.getInstance();
