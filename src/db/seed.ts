import { db } from './dexie';
import { format, subDays, startOfDay } from 'date-fns';

const DEFAULT_EXERCISES = [
  // Chest
  { name: 'Flat Barbell Bench Press', category: 'Chest', type: 'weight_reps' as const },
  { name: 'Incline Barbell Bench Press', category: 'Chest', type: 'weight_reps' as const },
  { name: 'Flat Dumbbell Bench Press', category: 'Chest', type: 'weight_reps' as const },
  { name: 'Incline Dumbbell Bench Press', category: 'Chest', type: 'weight_reps' as const },
  { name: 'Dumbbell Flyes', category: 'Chest', type: 'weight_reps' as const },
  { name: 'Push-ups', category: 'Chest', type: 'bodyweight' as const },

  // Back
  { name: 'Deadlifts', category: 'Back', type: 'weight_reps' as const },
  { name: 'Pull-ups', category: 'Back', type: 'bodyweight' as const },
  { name: 'Barbell Rows', category: 'Back', type: 'weight_reps' as const },
  { name: 'Dumbbell Rows', category: 'Back', type: 'weight_reps' as const },
  { name: 'Lat Pulldowns', category: 'Back', type: 'weight_reps' as const },
  { name: 'T-Bar Rows', category: 'Back', type: 'weight_reps' as const },

  // Shoulders
  { name: 'Overhead Press', category: 'Shoulders', type: 'weight_reps' as const },
  { name: 'Dumbbell Shoulder Press', category: 'Shoulders', type: 'weight_reps' as const },
  { name: 'Lateral Raises', category: 'Shoulders', type: 'weight_reps' as const },
  { name: 'Front Raises', category: 'Shoulders', type: 'weight_reps' as const },
  { name: 'Rear Delt Flyes', category: 'Shoulders', type: 'weight_reps' as const },

  // Arms
  { name: 'Barbell Curls', category: 'Arms', type: 'weight_reps' as const },
  { name: 'Dumbbell Curls', category: 'Arms', type: 'weight_reps' as const },
  { name: 'Hammer Curls', category: 'Arms', type: 'weight_reps' as const },
  { name: 'Tricep Dips', category: 'Arms', type: 'bodyweight' as const },
  { name: 'Close-Grip Bench Press', category: 'Arms', type: 'weight_reps' as const },
  { name: 'Tricep Extensions', category: 'Arms', type: 'weight_reps' as const },

  // Legs
  { name: 'Squats', category: 'Legs', type: 'weight_reps' as const },
  { name: 'Romanian Deadlifts', category: 'Legs', type: 'weight_reps' as const },
  { name: 'Leg Press', category: 'Legs', type: 'weight_reps' as const },
  { name: 'Leg Curls', category: 'Legs', type: 'weight_reps' as const },
  { name: 'Leg Extensions', category: 'Legs', type: 'weight_reps' as const },
  { name: 'Calf Raises', category: 'Legs', type: 'weight_reps' as const },
  { name: 'Lunges', category: 'Legs', type: 'bodyweight' as const },

  // Core
  { name: 'Planks', category: 'Core', type: 'time_only' as const },
  { name: 'Crunches', category: 'Core', type: 'reps_only' as const },
  { name: 'Russian Twists', category: 'Core', type: 'reps_only' as const },
  { name: 'Hanging Leg Raises', category: 'Core', type: 'reps_only' as const },

  // Cardio
  { name: 'Running', category: 'Cardio', type: 'distance_time' as const },
  { name: 'Cycling', category: 'Cardio', type: 'distance_time' as const },
  { name: 'Walking', category: 'Cardio', type: 'distance_time' as const },
  { name: 'Elliptical', category: 'Cardio', type: 'time_only' as const },
];

// NEW: Only seed if DB is truly empty
async function isEffectivelyEmpty(): Promise<boolean> { // NEW
  const [exCount, woCount, mCount] = await Promise.all([
    db.exercises.count(),
    db.workouts.count(),
    db.measurements.count(),
  ]);
  return exCount === 0 && woCount === 0 && mCount === 0;
}

function generateRandomSets(exercise: typeof DEFAULT_EXERCISES[0], workoutIndex: number) {
  const sets = [];
  const numSets = Math.floor(Math.random() * 3) + 2; // 2-4 sets

  for (let i = 0; i < numSets; i++) {
    const setId = `${Date.now()}-${Math.random()}`;
    const set: any = {
      id: setId,
      createdAt: new Date()
    };

    switch (exercise.type) {
      case 'weight_reps':
        // Progressive overload simulation
        const baseWeight = exercise.name.includes('Bench') ? 80 :
          exercise.name.includes('Squat') ? 100 :
            exercise.name.includes('Deadlift') ? 120 :
              exercise.name.includes('Row') ? 70 : 50;

        set.weight = baseWeight + (workoutIndex * 2.5) + (Math.random() * 10 - 5);
        set.reps = Math.floor(Math.random() * 5) + 6; // 6-10 reps
        break;

      case 'bodyweight':
        set.reps = Math.floor(Math.random() * 10) + 10; // 10-19 reps
        break;

      case 'time_only':
        set.timeSec = Math.floor(Math.random() * 120) + 30; // 30-150 seconds
        break;

      case 'reps_only':
        set.reps = Math.floor(Math.random() * 20) + 15; // 15-34 reps
        break;

      case 'distance_time':
        set.distance = Math.floor(Math.random() * 5000) + 1000; // 1-6km
        set.timeSec = Math.floor(Math.random() * 1800) + 600; // 10-40 minutes
        break;
    }

    sets.push(set);
  }

  return sets;
}

export async function seedDatabase() {
  try {
   // UPDATED: Do NOT clear existing data here. Only seed an empty DB.
    const empty = await isEffectivelyEmpty(); // NEW
    if (!empty) return; // NEW

    // Seed exercises
    const exercisePromises = DEFAULT_EXERCISES.map(exercise =>
      db.exercises.add({
        ...exercise,
        custom: false,
        createdAt: new Date()
      })
    );

    const exerciseIds = await Promise.all(exercisePromises);

    // Seed workouts for the last 30 days
    const workoutPromises = [];
    for (let i = 0; i < 25; i++) { // Not every day
      if (Math.random() > 0.3) { // 70% chance of workout
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');

        // Select 3-6 random exercises
        const workoutExercises = [];
        const numExercises = Math.floor(Math.random() * 4) + 3;
        const selectedExercises = [...DEFAULT_EXERCISES]
          .sort(() => 0.5 - Math.random())
          .slice(0, numExercises);

        for (const exercise of selectedExercises) {
          const exerciseIndex = DEFAULT_EXERCISES.indexOf(exercise);
          const exerciseId = exerciseIds[exerciseIndex];

          workoutExercises.push({
            exerciseId,
            sets: generateRandomSets(exercise, i)
          });
        }

        workoutPromises.push(db.workouts.add({
          date,
          exercises: workoutExercises,
          createdAt: subDays(new Date(), i)
        }));
      }
    }

    await Promise.all(workoutPromises);

    // Seed body measurements (weight every 2-3 days)
    const measurementPromises = [];
    let baseWeight = 75; // Starting weight

    for (let i = 0; i < 30; i += Math.floor(Math.random() * 3) + 2) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const weightChange = (Math.random() - 0.5) * 0.5; // ±0.25kg variation
      baseWeight += weightChange;

      measurementPromises.push(db.measurements.add({
        type: 'weight',
        value: Math.round(baseWeight * 10) / 10,
        date,
        createdAt: subDays(new Date(), i)
      }));
    }

    await Promise.all(measurementPromises);

    // Mark seeding as done
     await db.settings.update(1 as any, { seedingDone: true } as any); // UPDATED

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}