import Papa from 'papaparse';
import { db, Workout, Exercise } from '@/db/dexie';

type ExportCsvOptions = {
  dateStart?: Date | null;
  dateEnd?: Date | null;
  exerciseIds?: number[]; // optional: filter by specific exercises
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

export async function exportWorkoutsCSV( opts: ExportCsvOptions = {}): Promise<string> {
  const dateStart = opts.dateStart ? startOfDay(opts.dateStart) : null;
  const dateEnd = opts.dateEnd ? endOfDay(opts.dateEnd) : null;
  const exerciseFilterSet = opts.exerciseIds ? new Set(opts.exerciseIds) : null;
  //const workouts = await db.workouts.orderBy('date').toArray();
   // 1) Load exercise names for join
  const exercises = await db.exercises.toArray();
  const nameById = new Map<number, string>(
    exercises.map((e: any) => [e.id as number, e.name as string])
  );

  // 2) Load workouts (ordered), then filter by date inclusively
  // NOTE: If you have an index on 'date', you can switch to a Dexie .where().between(...) query.
  let workouts = await db.workouts.orderBy('date').toArray();

  if (dateStart || dateEnd) {
    workouts = workouts.filter((w: any) => {
      // Your schema shows w.date as a string; parse to Date for comparison
      const d = new Date(w.date);
      if (dateStart && d < dateStart) return false;
      if (dateEnd && d > dateEnd) return false;
      return true;
    });
  }

  // 3) Build rows with Exercise name (and optional exercise filter)
  const rows: any[] = [];
  workouts.forEach((w: any) => {
    (w.exercises || []).forEach((ex: any) => {
      const exId = ex.exerciseId as number;
      if (exerciseFilterSet && !exerciseFilterSet.has(exId)) return;

      const exName = nameById.get(exId) ?? '';
      (ex.sets || []).forEach((s: any) => {
        rows.push({
          // Columns kept compatible with your importer (+ Exercise added)
          Date: w.date,                       // string (e.g., 'YYYY-MM-DD')
          ExerciseId: exId,                   // number
          Exercise: exName,                   // <-- ✅ add exercise name
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
      const nameCol = (row.Exercise ?? '').toString().trim();
      let exerciseId: number | undefined = row.ExerciseId ? Number(row.ExerciseId) : undefined;

      // --- robust resolution of exerciseId ---
      if (exerciseId) {
        // If the id doesn't exist, try to resolve by name or create one
        const byId = await db.exercises.get(exerciseId);
        if (!byId) {
          if (nameCol) {
            const byName = await db.exercises.where('name').equals(nameCol).first();
            if (byName) {
              exerciseId = byName.id!;
            } else {
              exerciseId = await db.exercises.add({
                name: nameCol,
                category: 'Imported',
                type: 'weight_reps',
                notes: '',
                custom: true,
                createdAt: new Date()
              });
              createdExercises += 1;
            }
          } else {
            // No name provided either; create a generic imported exercise
            exerciseId = await db.exercises.add({
              name: 'Imported Exercise',
              category: 'Imported',
              type: 'weight_reps',
              notes: '',
              custom: true,
              createdAt: new Date()
            });
            createdExercises += 1;
          }
        }
      } else {
        // No ExerciseId: resolve or create by name
        if (!nameCol) { errors.push(`Missing Exercise/ExerciseId on ${date}`); continue; }
        const byName = await db.exercises.where('name').equals(nameCol).first();
        if (!byName) {
          exerciseId = await db.exercises.add({
            name: nameCol,
            category: 'Imported',
            type: 'weight_reps',
            notes: '',
            custom: true,
            createdAt: new Date()
          });
          createdExercises += 1;
        } else {
          exerciseId = byName.id!;
        }
      }
      // --- end robust resolution ---

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
      const newSet = {
        id: `${Date.now()}-${Math.random()}`,
        weight, reps, distance, timeSec,
        note: row.Note ?? '',
        createdAt: new Date()
      };

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
