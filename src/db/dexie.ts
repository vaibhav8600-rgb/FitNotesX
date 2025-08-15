import Dexie, { Table } from 'dexie';

export interface Exercise {
  id?: number;
  name: string;
  category: string;
  type: 'weight_reps' | 'distance_time' | 'time_only' | 'reps_only' | 'bodyweight';
  notes?: string;
  custom: boolean;
  createdAt: Date;
}

export interface Set {
  id: string;
  weight?: number;
  reps?: number;
  distance?: number;
  timeSec?: number;
  note?: string;
  createdAt: Date;
}

export interface WorkoutExercise {
  exerciseId: number;
  sets: Set[];
}

export interface Workout {
  id?: number;
  date: string; // YYYY-MM-DD
  exercises: WorkoutExercise[];
  createdAt: Date;
}

export interface Measurement {
  id?: number;
  type: 'weight' | 'body_fat' | 'muscle_mass' | 'waist' | 'chest' | 'arms' | 'thighs';
  value: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: Date;
}

export interface RoutineExercise {
  exerciseId: number;
  template?: Partial<Set>;
}

export interface Routine {
  id?: number;
  name: string;
  description?: string;
  color: string;
  exercises: RoutineExercise[];
  createdAt: Date;
}

export interface Settings {
  id?: number;
  theme: 'light' | 'dark' | 'auto';
  units: 'metric' | 'imperial';
  weightIncrement: number;
  timerSound: boolean;
  seedingDone: boolean;
}

export class FitNotesDB extends Dexie {
  exercises!: Table<Exercise>;
  workouts!: Table<Workout>;
  measurements!: Table<Measurement>;
  routines!: Table<Routine>;
  settings!: Table<Settings>;

  constructor() {
    super('FitNotesDB');
    
    this.version(1).stores({
      exercises: '++id, name, category, type, custom, createdAt',
      workouts: '++id, date, createdAt',
      measurements: '++id, type, date, createdAt',
      routines: '++id, name, createdAt',
      settings: '++id'
    });

    // Hooks for data validation and defaults
    this.exercises.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
    });

    this.workouts.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
    });

    this.measurements.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
    });

    this.routines.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
    });
  }
}

export const db = new FitNotesDB();

// Initialize default settings
db.on('ready', async () => {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      theme: 'dark',
      units: 'metric',
      weightIncrement: 2.5,
      timerSound: true,
      seedingDone: false
    });
  }
});