import { useState, useEffect } from 'react';
import type { DailyRoutine, UserProfile, WorkoutLog } from './types';
import { authService } from './services/auth';
import { loadWorkoutLogs, saveWorkoutLog, DEFAULT_PROFILE } from './services/storage';
import { getTodayRoutine } from './utils/routineGenerator';
import { reminderWatcher } from './utils/notifications';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [activeWorkoutRoutine, setActiveWorkoutRoutine] = useState<DailyRoutine | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => loadWorkoutLogs());

  // Modals: si no hay usuario, iniciamos con Auth abierto
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => !authService.getCurrentUser());
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubscribe = authService.subscribe((updatedUser) => {
      setUser(updatedUser);
    });
    return () => unsubscribe();
  }, []);

  // Background reminder watcher
  useEffect(() => {
    if (user) {
      reminderWatcher.start(
        user.scheduledDays,
        user.reminderTime,
        user.notificationsEnabled
      );
    } else {
      reminderWatcher.stop();
    }
    return () => reminderWatcher.stop();
  }, [user]);

  // Fallback profile if user is null during preview
  const currentProfile: UserProfile = user || DEFAULT_PROFILE;
  const todayRoutine = getTodayRoutine(currentProfile);

  // Handlers
  const handleStartWorkout = (routine: DailyRoutine) => {
    setActiveWorkoutRoutine(routine);
  };

  const handleFinishWorkout = (log: WorkoutLog, newAdaptationScore: number) => {
    const updatedLogs = saveWorkoutLog(log);
    setWorkoutLogs(updatedLogs);

    // Calculate streak update
    const todayStr = new Date().toDateString();
    let newStreak = currentProfile.streak;
    if (currentProfile.lastCompletedDate !== todayStr) {
      newStreak += 1;
    }

    const updatedUser = authService.updateUserProfile({
      adaptationScore: newAdaptationScore,
      streak: newStreak,
      lastCompletedDate: todayStr,
      totalWorkoutsCompleted: (currentProfile.totalWorkoutsCompleted || 0) + 1,
    });
    setUser(updatedUser);

    setActiveWorkoutRoutine(null);
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    const updated = authService.updateUserProfile(updates);
    setUser(updated);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* If workout is running, show full-screen player */}
      {activeWorkoutRoutine ? (
        <WorkoutPlayer
          routine={activeWorkoutRoutine}
          userProfile={currentProfile}
          onFinishWorkout={handleFinishWorkout}
          onExit={() => setActiveWorkoutRoutine(null)}
        />
      ) : (
        <>
          <Navbar
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenSettings={() => setIsOnboardingOpen(true)}
            onLogout={handleLogout}
          />

          <main className="flex-1">
            <Dashboard
              user={currentProfile}
              todayRoutine={todayRoutine}
              workoutLogs={workoutLogs}
              onStartWorkout={handleStartWorkout}
              onOpenSettings={() => setIsOnboardingOpen(true)}
              onUpdateProfile={handleUpdateProfile}
            />
          </main>

          <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950">
            <p>
              <strong>CalisHome</strong> — Diseñado para entrenar en casa con cero equipamiento y constancia garantizada.
            </p>
          </footer>
        </>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
          // Si es recién registrado, abrir el cuestionario de diagnóstico
          setIsOnboardingOpen(true);
        }}
      />

      {/* Onboarding / Routine Customizer Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        initialProfile={user}
        onSave={handleUpdateProfile}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}

export default App;
