import { create } from 'zustand';
import { db, Exercise } from '@/db/dexie';

export interface ExercisesState {
  exercises: Exercise[];
  searchQuery: string;
  selectedCategory: string;
  
  loadExercises: () => Promise<void>;
  addExercise: (exercise: Omit<Exercise, 'id' | 'createdAt'>) => Promise<number>;
  updateExercise: (id: number, updates: Partial<Exercise>) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  getFilteredExercises: () => Exercise[];
  getCategories: () => string[];
  reset: () => void; // <— NEW
}

export const useExercisesStore = create<ExercisesState>((set, get) => ({
  exercises: [],
  searchQuery: '',
  selectedCategory: 'ALL',

  loadExercises: async () => {
    try {
      const exercises = await db.exercises.orderBy('name').toArray();
      set({ exercises });
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  },

  addExercise: async (exerciseData) => {
    try {
      const id = await db.exercises.add({
        ...exerciseData,
        createdAt: new Date()
      } as any);
      
      await get().loadExercises();
      return id as number;
    } catch (error) {
      console.error('Error adding exercise:', error);
      throw error;
    }
  },

  updateExercise: async (id, updates) => {
    try {
      await db.exercises.update(id, updates);
      await get().loadExercises();
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  },

  deleteExercise: async (id) => {
    try {
      await db.exercises.delete(id);
      await get().loadExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  setSelectedCategory: (selectedCategory) => {
    set({ selectedCategory });
  },

  getFilteredExercises: () => {
    const { exercises, searchQuery, selectedCategory } = get();
    
    let filtered = exercises;
    
    // Filter by category
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'CUSTOM') {
        filtered = filtered.filter(ex => ex.custom);
      } else {
        filtered = filtered.filter(ex => ex.category === selectedCategory);
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(query) ||
        ex.category.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  },

  getCategories: () => {
    const { exercises } = get();
    const categories = new Set<string>();
    
    exercises.forEach(exercise => {
      categories.add(exercise.category);
    });
    
    return ['ALL', 'CUSTOM', ...Array.from(categories).sort()];
  },

  reset: () => {
    set({
      exercises: [],
      searchQuery: '',
      selectedCategory: 'ALL',
    });
  },
}));