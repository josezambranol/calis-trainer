import React, { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UserProfile } from '../types';
import { authApi, userApi } from '../services/api';
import { registerUnauthorizedHandler } from '../services/apiClient';
import {
  clearGuestOnboardingDraft,
  clearLegacyLocalProgress,
  loadGuestOnboardingDraft,
  loadLegacyLocalProgress,
} from '../services/storage';
import { AuthContext } from './useAuth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();

  const syncLocalProgressIfPresent = useCallback(
    async (baseUser: UserProfile): Promise<UserProfile> => {
      const draft = loadGuestOnboardingDraft();
      const legacy = loadLegacyLocalProgress();
      if (!draft && (!legacy || (legacy.logs.length === 0 && !legacy.profile))) {
        return baseUser;
      }

      const profileSource = draft || legacy?.profile || undefined;
      try {
        const res = await userApi.importLocalProgress({
          profile: profileSource
            ? {
                level: profileSource.level,
                goal: profileSource.goal,
                durationMinutes: profileSource.duration,
                scheduledDays: profileSource.scheduledDays,
                reminderTime: profileSource.reminderTime,
                timezone: profileSource.timezone,
                notificationsEnabled: profileSource.notificationsEnabled,
                soundEnabled: profileSource.soundEnabled,
                voiceCoachEnabled: profileSource.voiceCoachEnabled,
                adaptationScore:
                  legacy?.profile && typeof legacy.profile.adaptationScore === 'number'
                    ? legacy.profile.adaptationScore
                    : undefined,
              }
            : undefined,
          logs: legacy?.logs?.map((l) => ({
            date: l.date,
            routineTitle: l.routineTitle,
            durationSeconds: l.durationSeconds,
            exercisesCompleted: l.exercisesCompleted,
            feedback: l.feedback,
          })),
        });
        clearGuestOnboardingDraft();
        clearLegacyLocalProgress();
        return res.user;
      } catch {
        return baseUser;
      }
    },
    []
  );

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
      queryClient.removeQueries({ queryKey: ['weeklyPlan', 'auth'] });
      queryClient.removeQueries({ queryKey: ['workouts'] });
    });

    let active = true;
    authApi
      .tryRestoreSession()
      .then(async (restored) => {
        if (!active) return;
        if (restored) {
          const synced = await syncLocalProgressIfPresent(restored);
          if (active) {
            setUser(synced);
          }
        }
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });

    return () => {
      active = false;
      registerUnauthorizedHandler(null);
    };
  }, [queryClient, syncLocalProgressIfPresent]);

  const completeLogin = useCallback(
    async (loggedUser: UserProfile): Promise<UserProfile> => {
      const synced = await syncLocalProgressIfPresent(loggedUser);
      setUser(synced);
      await queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] });
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      return synced;
    },
    [queryClient, syncLocalProgressIfPresent]
  );

  const updateCachedUser = useCallback((updatedUser: UserProfile) => {
    setUser(updatedUser);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    queryClient.removeQueries({ queryKey: ['weeklyPlan', 'auth'] });
    queryClient.removeQueries({ queryKey: ['workouts'] });
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isRestoring,
        completeLogin,
        updateCachedUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
