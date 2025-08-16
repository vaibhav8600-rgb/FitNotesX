import { create } from 'zustand';
import { db, Workout, Set, WorkoutExercise } from '@/db/dexie';
import { format } from 'date-fns';

export interface WorkoutsState {
  workouts: Workout[];
  currentDate: string;
  currentWorkout: Workout | null;

  loadWorkouts: () => Promise<void>;
  loadWorkoutByDate: (date: string) => Promise<void>;
  createWorkout: (date: string, exercises?: WorkoutExercise[]) => Promise<number>;
  updateWorkout: (id: number, updates: Partial<Workout>) => Promise<void>;
  deleteWorkout: (id: number) => Promise<void>;

  addExerciseToWorkout: (workoutId: number, exerciseId: number) => Promise<void>;
  removeExerciseFromWorkout: (workoutId: number, exerciseId: number) => Promise<void>;

  addSetToExercise: (workoutId: number, exerciseId: number, set: Omit<Set, 'id' | 'createdAt'>) => Promise<void>;
  updateSet: (workoutId: number, exerciseId: number, setId: string, updates: Partial<Set>) => Promise<void>;
  deleteSet: (workoutId: number, exerciseId: number, setId: string) => Promise<void>;

  setCurrentDate: (date: string) => void;
  getCurrentWorkout: () => Workout | null;
  getWorkoutByDate: (date: string) => Workout | undefined;
  getWorkoutDates: () => string[];
  reset: () => void; // <— NEW
}

export const useWorkoutsStore = create<WorkoutsState>((set, get) => ({
  workouts: [],
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  currentWorkout: null,

  loadWorkouts: async () => {
    try {
      const workouts = await db.workouts.orderBy('date').reverse().toArray();
      set({ workouts });
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  },

  loadWorkoutByDate: async (date) => {
    try {
      const workout = await db.workouts.where('date').equals(date).first();
      set({ currentWorkout: workout || null, currentDate: date });
    } catch (error) {
      console.error('Error loading workout by date:', error);
    }
  },

  createWorkout: async (date, exercises = []) => {
    try {
      const id = await db.workouts.add({
        date,
        exercises,
        createdAt: new Date()
      });

      await get().loadWorkouts();
      await get().loadWorkoutByDate(date);

      return id as number;
    } catch (error) {
      console.error('Error creating workout:', error);
      throw error;
    }
  },

  updateWorkout: async (id, updates) => {
    try {
      await db.workouts.update(id, updates);
      await get().loadWorkouts();

      const { currentDate } = get();
      await get().loadWorkoutByDate(currentDate);
    } catch (error) {
      console.error('Error updating workout:', error);
      throw error;
    }
  },

  deleteWorkout: async (id) => {
    try {
      await db.workouts.delete(id);
      await get().loadWorkouts();

      const { currentDate } = get();
      await get().loadWorkoutByDate(currentDate);
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  },

  addExerciseToWorkout: async (workoutId, exerciseId) => {
    try {
      const workout = await db.workouts.get(workoutId);
      if (!workout) throw new Error('Workout not found');

      // Check if exercise already exists in workout
      const existingExercise = workout.exercises.find(ex => ex.exerciseId === exerciseId);
      if (existingExercise) return;

      const updatedExercises = [
        ...workout.exercises,
        { exerciseId, sets: [] }
      ];

      await db.workouts.update(workoutId, { exercises: updatedExercises });
      await get().loadWorkouts();

      const { currentDate } = get();
      await get().loadWorkoutByDate(currentDate);
    } catch (error) {
      console.error('Error adding exercise to workout:', error);
      throw error;
    }
  },

  removeExerciseFromWorkout: async (workoutId, exerciseId) => {
    try {
      const workout = await db.workouts.get(workoutId);
      if (!workout) throw new Error('Workout not found');

      const updatedExercises = workout.exercises.filter(ex => ex.exerciseId !== exerciseId);

      await db.workouts.update(workoutId, { exercises: updatedExercises });
      await get().loadWorkouts();

      const { currentDate } = get();
      await get().loadWorkoutByDate(currentDate);
    } catch (error) {
      console.error('Error removing exercise from workout:', error);
      throw error;
    }
  },

  addSetToExercise: async (workoutId, exerciseId, setData) => {
    try {
      const workout = await db.workouts.get(workoutId);
      if (!workout) throw new Error('Workout not found');

      const set: Set = {
        ...setData,
        id: `${Date.now()}-${Math.random()}`,
        createdAt: new Date()
      };

      const updatedExercises = workout.exercises.map(ex => {
        if (ex.exerciseId === exerciseId) {
          return {
            ...ex,
            sets: [...ex.sets, set]
          };
        }
        return ex;
      });

      await db.workouts.update(workoutId, { exercises: updatedExercises });
      await get().loadWorkouts();

      const { currentDate } = get();
      await get().loadWorkoutByDate(currentDate);
    } catch (error) {
      console.error('Error adding set to exercise:', error);
      throw error;
    }
  },

  updateSet: async (workoutId, exerciseId, setId, updates) => {
    try {
      const workout = await db.workouts.get(workoutId);
      if (!workout) throw new Error('Workout not found');

      const updatedExercises = workout.exercises.map(ex => {
        if (ex.exerciseId === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map(set =>
              set.id === setId ? { ...set, ...updates } : set
            )
          };
        }
        return ex;
      });

      await db.workouts.update(workoutId, { exercises: updatedExercises });
      await get().loadWorkouts();

      const { currentDate } = get();
      await get().loadWorkoutByDate(currentDate);
    } catch (error) {
      console.error('Error updating set:', error);
      throw error;
    }
  },

  deleteSet: async (workoutId, exerciseId, setId) => {
    try {
      const workout = await db.workouts.get(workoutId);
      if (!workout) throw new Error('Workout not found');

      const updatedExercises = workout.exercises.map(ex => {
        if (ex.exerciseId === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.filter(set => set.id !== setId)
          };
        }
        return ex;
      });

      await db.workouts.update(workoutId, { exercises: updatedExercises });
      await get().loadWorkouts();

      const { currentDate } = get();
      await get().loadWorkoutByDate(currentDate);
    } catch (error) {
      console.error('Error deleting set:', error);
      throw error;
    }
  },

  setCurrentDate: (date) => {
    set({ currentDate: date });
  },

  getCurrentWorkout: () => {
    return get().currentWorkout;
  },

  getWorkoutByDate: (date) => {
    const { workouts } = get();
    return workouts.find(workout => workout.date === date);
  },

  getWorkoutDates: () => {
    const { workouts } = get();
    return workouts.map(workout => workout.date);
  },
  // in the store create call, add:
  reset: () => {
    set({
      workouts: [],
      currentWorkout: null,
      currentDate: format(new Date(), 'yyyy-MM-dd'),
    });
  },
}));