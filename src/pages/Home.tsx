import { useEffect } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Copy } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useExercisesStore } from '@/store/exercisesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const {
    currentWorkout,
    workouts,
    loadWorkoutByDate,
    createWorkout,
    setCurrentDate: setStoreCurrentDate,
    currentDate,
  } = useWorkoutsStore();

  const { exercises, loadExercises } = useExercisesStore();
  const { units } = useSettingsStore(); // for kg/lb display

  useEffect(() => {
    loadWorkoutByDate(currentDate);
    setStoreCurrentDate(currentDate);
    loadExercises();
  }, [currentDate, loadWorkoutByDate, setStoreCurrentDate, loadExercises]);

  const handlePrevDay = () => {
    const prevDate = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd');
    setStoreCurrentDate(prevDate);
  };

  const handleNextDay = () => {
    const nextDate = format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd');
    setStoreCurrentDate(nextDate);
  };

  const handleStartNewWorkout = async () => {
    try {
      await createWorkout(currentDate);
      navigate('/exercises');
    } catch (error) {
      console.error('Error creating workout:', error);
    }
  };

  const handleCopyPreviousWorkout = async () => {
    try {
      // Find the most recent workout strictly before currentDate
      const previousWorkout = workouts
        .filter((w) => w.date < currentDate)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (previousWorkout) {
        // Copy exercise list only (no sets)
        const exercisesToCopy = previousWorkout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: [],
        }));

        await createWorkout(currentDate, exercisesToCopy);

        const firstCopiedId = exercisesToCopy[0]?.exerciseId;
        if (firstCopiedId) {
          navigate(`/training/${firstCopiedId}`);
          navigate('/home');
        } else {
          // no exercises got copied for some reason — go add some
          navigate('/exercises');
        }
      }
    } catch (error) {
      console.error('Error copying previous workout:', error);
    }
  };

  const formatDateDisplay = (date: string) => {
    const dateObj = new Date(date + 'T12:00:00'); // avoid timezone skew
    if (isToday(dateObj)) {
      return 'TODAY';
    }
    return format(dateObj, 'EEE, MMM d');
  };

  const getExerciseName = (exerciseId: number) => {
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    return exercise?.name || 'Unknown Exercise';
  };

  const getSetsSummary = (sets: any[]) => {
    if (sets.length === 0) return '0 sets';
    return sets.length === 1 ? '1 set' : `${sets.length} sets`;
  };

  const continueToTraining = () => {
    const firstId = currentWorkout?.exercises?.[0]?.exerciseId;
    if (firstId) {
      navigate(`/training/${firstId}`);
    } else {
      navigate('/exercises');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="FitNotesX" />

      {/* Date Navigation */}
      <div className="bg-surface border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevDay}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft size={20} />
          </Button>

          <div className="text-center">
            <h2 className="text-lg font-semibold">{formatDateDisplay(currentDate)}</h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextDay}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!currentWorkout ? (
          /* Empty State */
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-6 text-muted-foreground">
              No workout for this day
            </h3>

            <div className="space-y-3 max-w-xs mx-auto">
              <Button onClick={handleStartNewWorkout} className="w-full" size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Start New Workout
              </Button>

              {workouts.length > 0 && (
                <Button
                  onClick={handleCopyPreviousWorkout}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Previous Workout
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Workout Exists */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {currentWorkout.exercises.length} exercise
                {currentWorkout.exercises.length !== 1 ? 's' : ''}
              </h3>
              <Button variant="outline" size="sm" onClick={continueToTraining}>
                Continue
              </Button>
            </div>

            {currentWorkout.exercises.map((workoutExercise, index) => {
              const last = workoutExercise.sets[workoutExercise.sets.length - 1];
              const unitLabel = units === 'metric' ? 'kg' : 'lb';

              return (
                <Card
                  key={`${workoutExercise.exerciseId}-${index}`}
                  className="cursor-pointer hover:bg-surface-secondary transition-colors"
                  onClick={() => navigate(`/training/${workoutExercise.exerciseId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">
                          {getExerciseName(workoutExercise.exerciseId)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {getSetsSummary(workoutExercise.sets)}
                        </p>
                      </div>

                      {last && (
                        <div className="text-right text-sm text-muted-foreground">
                          <div>
                            {last.weight != null && `${last.weight} ${unitLabel}`}
                            {last.weight != null && last.reps != null && ' × '}
                            {last.reps != null && `${last.reps}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button onClick={() => navigate('/exercises')} variant="outline" className="w-full" size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
