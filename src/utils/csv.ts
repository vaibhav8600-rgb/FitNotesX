import Papa from 'papaparse';
import { db, Workout, Exercise } from '@/db/dexie';
import { normalizeCategoryName, toCategoryDisplayName } from '@/utils/normalize';

type ExportCsvOptions = {
  dateStart?: Date | null;
  dateEnd?: Date | null;
  exerciseIds?: number[]; // optional: filter by specific exercises
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

export async function exportWorkoutsCSV(opts: ExportCsvOptions = {}): Promise<string> {
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
  categoriesMatched?: number;
  categoriesCreated?: number;
}

export async function importCSV(content: string): Promise<ImportSummary> {
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const errors: string[] = [];
  let createdExercises = 0;
  let setsAdded = 0;
  let duplicatesSkipped = 0;
  let categoriesMatched = 0;
  let categoriesCreated = 0;


  if (parsed.errors.length) errors.push(...parsed.errors.map(e => e.message));
  const rows = parsed.data as any[];

  // ---------- NEW: preload & build maps for idempotent, case-insensitive matching ----------
  const allExercises = await db.exercises.toArray();
  const exerciseByNameNorm = new Map<string, Exercise>();
  const categoryDisplayByNorm = new Map<string, string>();

  for (const ex of allExercises) {
    exerciseByNameNorm.set(ex.name.trim().toLowerCase(), ex);
    const cNorm = normalizeCategoryName(ex.category);
    if (!categoryDisplayByNorm.has(cNorm)) categoryDisplayByNorm.set(cNorm, ex.category);
  }
  // ----------------------------------------------------------------------------------------

  for (const row of rows) {
    try {
      const date = String(row.Date);
      if (!date) { errors.push('Missing Date'); continue; }

      // Resolve (optional) category from CSV
      // If present+non-empty -> use case-insensitive resolution; else will fallback to 'Imported'
      let categoryFromCsv: string | undefined;
      if (typeof row.Category !== 'undefined') {
        const raw = String(row.Category ?? '').trim();
        if (raw) {
          const norm = normalizeCategoryName(raw);
          const resolved = categoryDisplayByNorm.get(norm);
          if (resolved) {
            // existing category (case-insensitive match)
            categoryFromCsv = resolved;
            categoriesMatched += 1;
          } else {
            // create new display name once (Title Case), remember it
            const display = toCategoryDisplayName(raw);
            categoryDisplayByNorm.set(norm, display);
            categoryFromCsv = display;
            categoriesCreated += 1;
          }
        }
      }


      const nameCol = (row.Exercise ?? '').toString().trim();
      let exerciseId: number | undefined = row.ExerciseId ? Number(row.ExerciseId) : undefined;

      // Resolve workout by date
      let workout = await db.workouts.where('date').equals(date).first();
      if (!workout) {
        const id = await db.workouts.add({ date, exercises: [], createdAt: new Date() });
        workout = await db.workouts.get(id as number) as Workout;
      }

      // --- robust resolution of exerciseId ---
      // Robust resolution of exerciseId by id or name; create as needed
      if (exerciseId) {
        const byId = await db.exercises.get(exerciseId);
        if (!byId) {
          if (nameCol) {
            const byName = exerciseByNameNorm.get(nameCol.toLowerCase()) ||
              await db.exercises.where('name').equals(nameCol).first();
            if (byName) {
              exerciseId = byName.id!;
            } else {
              // CREATE with category honoring CSV if provided, else 'Imported'
              const category = categoryFromCsv ?? 'Imported'; // <— UPDATED HERE
              const newId = await db.exercises.add({
                name: nameCol,
                category,
                type: 'weight_reps',
                notes: '',
                custom: true,
                createdAt: new Date()
              } as any);
              exerciseId = newId as number;
              createdExercises += 1;

              // keep maps fresh
              exerciseByNameNorm.set(nameCol.toLowerCase(), { id: newId as number, name: nameCol, category } as any);
              const cNorm = normalizeCategoryName(category);
              if (!categoryDisplayByNorm.has(cNorm)) categoryDisplayByNorm.set(cNorm, category);
            }
          } else {
            // CREATE fallback
            const category = categoryFromCsv ?? 'Imported'; // <— UPDATED HERE
            const newId = await db.exercises.add({
              name: 'Imported Exercise',
              category,
              type: 'weight_reps',
              notes: '',
              custom: true,
              createdAt: new Date()
            } as any);
            exerciseId = newId as number;
            createdExercises += 1;

            // keep maps fresh
            exerciseByNameNorm.set('imported exercise', { id: newId as number, name: 'Imported Exercise', category } as any);
            const cNorm = normalizeCategoryName(category);
            if (!categoryDisplayByNorm.has(cNorm)) categoryDisplayByNorm.set(cNorm, category);
          }
        }
      } else {
        if (!nameCol) { errors.push(`Missing Exercise/ExerciseId on ${date}`); continue; }
        const byName = exerciseByNameNorm.get(nameCol.toLowerCase()) ||
          await db.exercises.where('name').equals(nameCol).first();
        if (byName) {
          exerciseId = byName.id!;
        } else {
          // CREATE with category honoring CSV if provided, else 'Imported'
          const category = categoryFromCsv ?? 'Imported'; // <— UPDATED HERE
          const newId = await db.exercises.add({
            name: nameCol,
            category,
            type: 'weight_reps',
            notes: '',
            custom: true,
            createdAt: new Date()
          } as any);
          exerciseId = newId as number;
          createdExercises += 1;

          // keep maps fresh
          exerciseByNameNorm.set(nameCol.toLowerCase(), { id: newId as number, name: nameCol, category } as any);
          const cNorm = normalizeCategoryName(category);
          if (!categoryDisplayByNorm.has(cNorm)) categoryDisplayByNorm.set(cNorm, category);
        }
      }
      // --- end robust resolution ---

      const weight = row.Weight ? Number(row.Weight) : undefined;
      const reps = row.Reps ? Number(row.Reps) : undefined;
      const distance = row.Distance ? Number(row.Distance) : undefined;
      const timeSec = row.TimeSec ? Number(row.TimeSec) : undefined;

      const exEntry = workout.exercises.find(e => e.exerciseId === exerciseId);
      const newSet = { id: `${Date.now()}-${Math.random()}`, weight, reps, distance, timeSec, note: row.Note ?? '', createdAt: new Date() }; // UPDATED

      if (exEntry) {
        const duplicate = exEntry.sets.some(s => s.weight === weight && s.reps === reps && s.distance === distance && s.timeSec === timeSec);
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

  // Ensure settings exist and prevent any future "first-run" seeding path
  // NEW: Guarantee settings row and mark as post-import state
  const hasSettings = await db.settings.get(1 as any);
  if (hasSettings) {
    await db.settings.update(1 as any, { seedingDone: true } as any);
  } else {
    await db.settings.add({ id: 1, theme: 'dark', units: 'metric', weightIncrement: 2.5, timerSound: true, seedingDone: true } as any);
  }

  return { createdExercises, setsAdded, duplicatesSkipped, errors, categoriesMatched, categoriesCreated };
}
