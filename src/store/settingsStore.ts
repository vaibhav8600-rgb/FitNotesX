// src/store/settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db/dexie';

// Only import stores you actually have:
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useExercisesStore } from '@/store/exercisesStore';
import { markSeededGuard } from '@/app/bootstrap'; // NEW
export interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  units: 'metric' | 'imperial';
  weightIncrement: number;
  timerSound: boolean;
  seedingDone: boolean;

  setTheme: (theme: 'light' | 'dark' | 'auto') => Promise<void>;
  setUnits: (units: 'metric' | 'imperial') => Promise<void>;
  setWeightIncrement: (increment: number) => Promise<void>;
  setTimerSound: (enabled: boolean) => Promise<void>;
  setSeedingDone: (done: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetData: () => Promise<void>;
}

// UPDATED: keep initial in-memory defaults well-typed (literal unions preserved)
export const INITIAL_SETTINGS = {
  theme: 'dark',
  units: 'metric',
  weightIncrement: 2.5,
  timerSound: true,
  seedingDone: true, // align with dexie.ts ready hook & reset behavior
} as const satisfies Pick<
  SettingsState,
  'theme' | 'units' | 'weightIncrement' | 'timerSound' | 'seedingDone'
>;

// UPDATED: what we (re)write into Dexie when creating the row
const DB_DEFAULT_SETTINGS = {
  id: 1,
  theme: 'dark',
  units: 'metric',
  weightIncrement: 2.5,
  timerSound: true,
  seedingDone: true,
} as const;

// UPDATED: what we set into Zustand after a reset
const RESET_DEFAULTS = {
  theme: 'dark',
  units: 'metric',
  weightIncrement: 2.5,
  timerSound: true,
  seedingDone: true,
} as const satisfies Pick<
  SettingsState,
  'theme' | 'units' | 'weightIncrement' | 'timerSound' | 'seedingDone'
>;


// Persist keys used by your stores (adjust to match your actual persist names).
const PERSIST_KEYS = [
  'fitnotes-settings',   // this store
  'fitnotes-workouts',   // workouts store (change if different)
  'fitnotes-exercises',  // exercises store (change if different)
] as const;

// Ensure there is a row with id=1 to avoid update errors.
async function ensureSettingsRow() {
  const existing = await db.settings.get(1 as any);
  if (!existing) {
    try {
      await db.settings.add({ id: 1, ...INITIAL_SETTINGS } as any);
    } catch {
      // If schema uses auto id, a later put will create/update it.
    }
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...INITIAL_SETTINGS,

      setTheme: async (theme) => {
        set({ theme });
        try {
          await ensureSettingsRow();
          await db.settings.put({ id: 1, theme } as any, 1 as any);
        } catch (e) {
          console.warn('setTheme DB write failed:', e);
        }

        // apply theme class
        const root = document.documentElement;
        if (theme === 'light') {
          root.classList.remove('dark');
          root.classList.add('light');
        } else if (theme === 'dark') {
          root.classList.remove('light');
          root.classList.add('dark');
        } else {
          const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
          root.classList.remove('light', 'dark');
          root.classList.add(prefersDark ? 'dark' : 'light');
        }
      },

      setUnits: async (units) => {
        set({ units });
        try {
          await ensureSettingsRow();
          await db.settings.put({ id: 1, units } as any, 1 as any);
        } catch (e) {
          console.warn('setUnits DB write failed:', e);
        }
      },

      setWeightIncrement: async (weightIncrement) => {
        set({ weightIncrement });
        try {
          await ensureSettingsRow();
          await db.settings.put({ id: 1, weightIncrement } as any, 1 as any);
        } catch (e) {
          console.warn('setWeightIncrement DB write failed:', e);
        }
      },

      setTimerSound: async (timerSound) => {
        set({ timerSound });
        try {
          await ensureSettingsRow();
          await db.settings.put({ id: 1, timerSound } as any, 1 as any);
        } catch (e) {
          console.warn('setTimerSound DB write failed:', e);
        }
      },

      setSeedingDone: async (seedingDone) => {
        set({ seedingDone });
        try {
          await ensureSettingsRow();
          await db.settings.put({ id: 1, seedingDone } as any, 1 as any);
        } catch (e) {
          console.warn('setSeedingDone DB write failed:', e);
        }
      },

      loadSettings: async () => {
        try {
          const settings = await db.settings.get(1 as any);
          if (settings) {
            set({
              theme: settings.theme ?? INITIAL_SETTINGS.theme,
              units: settings.units ?? INITIAL_SETTINGS.units,
              weightIncrement: settings.weightIncrement ?? INITIAL_SETTINGS.weightIncrement,
              timerSound: settings.timerSound ?? INITIAL_SETTINGS.timerSound,
              seedingDone: settings.seedingDone ?? INITIAL_SETTINGS.seedingDone,
            });
            await get().setTheme(settings.theme ?? INITIAL_SETTINGS.theme);
          } else {
            await ensureSettingsRow();
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      },

      /**
       * Full soft reset:
       * - Clears ALL Dexie tables (keeps DB/schema; auto IDs keep incrementing)
       * - Removes persisted Zustand slices
       * - Resets in-memory stores
       * - Clears local/session storage
       * - Re-seeds settings row and resets this store
       */
      resetData: async () => {
        try {
          // 1) Empty all tables atomically
          await db.transaction('rw', db.tables as any, async () => {
            for (const table of db.tables) {
              await table.clear();
            }
          });

          // 2) Recreate default settings row, but DO NOT allow seeding again
         try {
            await db.settings.add(DB_DEFAULT_SETTINGS as any);
          } catch {
            await db.settings.put(DB_DEFAULT_SETTINGS as any, 1 as any); // UPDATED: fixed 'await' typo
          }

          // 3) Remove any persisted slices if you use them
          for (const key of PERSIST_KEYS) {
            try { localStorage.removeItem(key); } catch { }
          }

          // 4) Reset in-memory stores so UI clears immediately
          try { useWorkoutsStore.getState().reset?.(); } catch { }
          try { useExercisesStore.getState().reset?.(); } catch { }

          // 5) Mark local guard so next cold boot won't seed
          markSeededGuard(); // NEW

          // 6) Reset this store to defaults (but with seedingDone true)
          set({ ...RESET_DEFAULTS });
        } catch (error) {
          console.error('Error resetting data:', error);
          throw error;
        }
      },
    }),
    {
      name: 'fitnotes-settings',
      partialize: (state) => ({
        theme: state.theme,
        units: state.units,
        weightIncrement: state.weightIncrement,
        timerSound: state.timerSound,
        seedingDone: state.seedingDone,
      }),
    }
  )
);
