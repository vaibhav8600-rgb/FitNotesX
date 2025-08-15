import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db/dexie';

export interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  units: 'metric' | 'imperial';
  weightIncrement: number;
  timerSound: boolean;
  seedingDone: boolean;
  
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setUnits: (units: 'metric' | 'imperial') => void;
  setWeightIncrement: (increment: number) => void;
  setTimerSound: (enabled: boolean) => void;
  setSeedingDone: (done: boolean) => void;
  loadSettings: () => Promise<void>;
  resetData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      units: 'metric',
      weightIncrement: 2.5,
      timerSound: true,
      seedingDone: false,

      setTheme: async (theme) => {
        set({ theme });
        await db.settings.update(1, { theme });
        
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'light') {
          root.classList.remove('dark');
          root.classList.add('light');
        } else if (theme === 'dark') {
          root.classList.remove('light');
          root.classList.add('dark');
        } else {
          // Auto theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.remove('light', 'dark');
          root.classList.add(prefersDark ? 'dark' : 'light');
        }
      },

      setUnits: async (units) => {
        set({ units });
        await db.settings.update(1, { units });
      },

      setWeightIncrement: async (weightIncrement) => {
        set({ weightIncrement });
        await db.settings.update(1, { weightIncrement });
      },

      setTimerSound: async (timerSound) => {
        set({ timerSound });
        await db.settings.update(1, { timerSound });
      },

      setSeedingDone: async (seedingDone) => {
        set({ seedingDone });
        await db.settings.update(1, { seedingDone });
      },

      loadSettings: async () => {
        try {
          const settings = await db.settings.get(1);
          if (settings) {
            set({
              theme: settings.theme,
              units: settings.units,
              weightIncrement: settings.weightIncrement,
              timerSound: settings.timerSound,
              seedingDone: settings.seedingDone
            });
            
            // Apply theme
            get().setTheme(settings.theme);
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      },

      resetData: async () => {
        try {
          await db.transaction('rw', [db.exercises, db.workouts, db.measurements, db.routines], async () => {
            await db.exercises.clear();
            await db.workouts.clear();
            await db.measurements.clear();
            await db.routines.clear();
          });
          
          set({ seedingDone: false });
          await db.settings.update(1, { seedingDone: false });
        } catch (error) {
          console.error('Error resetting data:', error);
          throw error;
        }
      }
    }),
    {
      name: 'fitnotes-settings',
      partialize: (state) => ({
        theme: state.theme,
        units: state.units,
        weightIncrement: state.weightIncrement,
        timerSound: state.timerSound,
        seedingDone: state.seedingDone
      })
    }
  )
);