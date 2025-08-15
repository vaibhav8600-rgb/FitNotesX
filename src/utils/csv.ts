import Papa from 'papaparse';
import { db, Workout, Exercise } from '@/db/dexie';

export async function exportWorkoutsCSV(): Promise<string> {
  const workouts = await db.workouts.orderBy('date').toArray();
  const rows: any[] = [];
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        rows.push({
          Date: w.date,
          ExerciseId: ex.exerciseId,
          Weight: s.weight ?? '',
          Reps: s.reps ?? '',
          Distance: s.distance ?? '',
          TimeSec: s.timeSec ?? '',
          Note: s.note ?? ''
        });
      });
    });
  });
  return Papa.unparse(rows);
}

export interface ImportSummary {
  createdExercises: number;
  setsAdded: number;
  duplicatesSkipped: number;
  errors: string[];
}

export async function importCSV(content: string): Promise<ImportSummary> {
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const errors: string[] = [];
  let createdExercises = 0;
  let setsAdded = 0;
  let duplicatesSkipped = 0;

  if (parsed.errors.length) errors.push(...parsed.errors.map(e => e.message));
  const rows = parsed.data as any[];

  for (const row of rows) {
    try {
      const date = String(row.Date);
      const name = String(row.Exercise || '');
      let exerciseId: number | undefined = row.ExerciseId ? Number(row.ExerciseId) : undefined;

      if (!exerciseId) {
        if (!name) { errors.push(`Missing Exercise/ExerciseId on ${date}`); continue; }
        let ex = await db.exercises.where('name').equals(name).first();
        if (!ex) {
          exerciseId = await db.exercises.add({ name, category: 'Imported', type: 'weight_reps', notes: '', custom: true, createdAt: new Date() });
          createdExercises += 1;
        } else {
          exerciseId = ex.id!;
        }
      }

      let workout = await db.workouts.where('date').equals(date).first();
      if (!workout) {
        const id = await db.workouts.add({ date, exercises: [], createdAt: new Date() });
        workout = await db.workouts.get(id as number) as Workout;
      }

      const weight = row.Weight ? Number(row.Weight) : undefined;
      const reps = row.Reps ? Number(row.Reps) : undefined;
      const distance = row.Distance ? Number(row.Distance) : undefined;
      const timeSec = row.TimeSec ? Number(row.TimeSec) : undefined;

      const exEntry = workout.exercises.find(e => e.exerciseId === exerciseId);
      const newSet = { id: `${Date.now()}-${Math.random()}`, weight, reps, distance, timeSec, createdAt: new Date() };

      if (exEntry) {
        const duplicate = exEntry.sets.some(s => s.weight===weight && s.reps===reps && s.distance===distance && s.timeSec===timeSec);
        if (duplicate) { duplicatesSkipped += 1; continue; }
        exEntry.sets.push(newSet as any);
      } else {
        workout.exercises.push({ exerciseId: exerciseId!, sets: [newSet as any] });
      }

      await db.workouts.update(workout.id!, { exercises: workout.exercises });
      setsAdded += 1;
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  return { createdExercises, setsAdded, duplicatesSkipped, errors };
}
