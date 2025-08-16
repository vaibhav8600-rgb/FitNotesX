import { z } from 'zod';
import { db, Workout, Exercise, Measurement, Routine, Settings } from '@/db/dexie';

const BackupSchema = z.object({
  version: z.literal(1),
  workouts: z.array(z.any()),
  exercises: z.array(z.any()),
  measurements: z.array(z.any()),
  routines: z.array(z.any()),
  settings: z.any()
});

export type Backup = z.infer<typeof BackupSchema>;

export async function exportBackup(): Promise<Backup> {
  const [workouts, exercises, measurements, routines, settings] = await Promise.all([
    db.workouts.toArray(),
    db.exercises.toArray(),
    db.measurements.toArray(),
    db.routines.toArray(),
    db.settings.toArray()
  ]);
  return { version: 1, workouts, exercises, measurements, routines, settings: settings[0] };
}

export async function importBackup(json: unknown): Promise<{ errors: string[] }> {
  const parsed = BackupSchema.safeParse(json);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map(i => i.message) };
  }
  const data = parsed.data;

  await db.transaction('rw', [db.workouts, db.exercises, db.measurements, db.routines, db.settings], async () => {
    await db.workouts.clear();
    await db.exercises.clear();
    await db.measurements.clear();
    await db.routines.clear();

    if (Array.isArray(data.exercises)) await db.exercises.bulkAdd(data.exercises as Exercise[]);
    if (Array.isArray(data.workouts)) await db.workouts.bulkAdd(data.workouts as Workout[]);
    if (Array.isArray(data.measurements)) await db.measurements.bulkAdd(data.measurements as Measurement[]);
    if (Array.isArray(data.routines)) await db.routines.bulkAdd(data.routines as Routine[]);

    // Ensure settings exist and seeding can never re-trigger after an import
    const sFromBackup = (data.settings as Settings) || ({} as Settings);
    const s: Settings = {
      id: 1,
      theme: sFromBackup.theme ?? 'dark',
      units: sFromBackup.units ?? 'metric',
      weightIncrement: sFromBackup.weightIncrement ?? 2.5,
      timerSound: sFromBackup.timerSound ?? true,
      seedingDone: true, // <<— force post-import state
    };

    const existing = await db.settings.get(1 as any);
    if (existing?.id) {
      await db.settings.update(1, s as any);
    } else {
      await db.settings.add({ ...s, id: 1 } as any);
    }
  });

  return { errors: [] };
}
