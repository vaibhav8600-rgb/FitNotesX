import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, Trophy, Clock } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useExercisesStore } from '@/store/exercisesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Exercise, Set } from '@/db/dexie';
import { epley1RM, best1RMFromSets, isWeightRepsPR, isRepsPR } from '@/utils/pr';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { colorVar } from '@/utils/theme';

const TIMER_PRESETS = [60, 90, 120, 180]; // 1m, 1.5m, 2m, 3m

export default function Training() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const [activeTab, setActiveTab] = useState<'TRACK' | 'HISTORY' | 'GRAPH'>('TRACK');
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const {
    workouts,
    currentWorkout,
    currentDate,
    addSetToExercise,
    updateSet,
    deleteSet,
    createWorkout,
  } = useWorkoutsStore();
  const { exercises } = useExercisesStore();
  const { units, weightIncrement } = useSettingsStore();

  const [newSet, setNewSet] = useState<Partial<Set>>({});

  // ---------- Timer ----------
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsTimerOpen(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // ---------- Resolve selected exercise via route param (authoritative) ----------
  const workoutExercises = currentWorkout?.exercises || [];

  const selectedExerciseId = useMemo(() => {
    const idFromRoute = exerciseId ? Number(exerciseId) : undefined;
    if (Number.isFinite(idFromRoute as number)) return idFromRoute as number;
    return currentWorkout?.exercises?.[0]?.exerciseId;
  }, [exerciseId, currentWorkout?.exercises]);

  // If there is no :exerciseId but we have exercises, normalize URL once
  useEffect(() => {
    if (!currentWorkout) return;
    if (!exerciseId && currentWorkout.exercises?.length) {
      navigate(`/training/${currentWorkout.exercises[0].exerciseId}`, { replace: true });
    }
  }, [exerciseId, currentWorkout, navigate]);

  const exerciseInWorkout = useMemo(
    () => workoutExercises.find((ex) => ex.exerciseId === selectedExerciseId),
    [workoutExercises, selectedExerciseId]
  );

  const exercise = useMemo(
    () => (selectedExerciseId ? exercises.find((ex) => ex.id === selectedExerciseId) ?? null : null),
    [exercises, selectedExerciseId]
  );

  // If URL has a bad id (not in this workout), normalize to the first exercise (if any)
  useEffect(() => {
    if (!currentWorkout) return;
    if (selectedExerciseId && !exerciseInWorkout && currentWorkout.exercises.length > 0) {
      navigate(`/training/${currentWorkout.exercises[0].exerciseId}`, { replace: true });
    }
  }, [currentWorkout, selectedExerciseId, exerciseInWorkout, navigate]);

  // Reset per-exercise UI state when exercise changes
  useEffect(() => {
    setNewSet({});
    setActiveTab('TRACK');
  }, [exercise?.id]);

  // ---------- History & Graph ----------
  const historyItems = useMemo(() => {
    if (!exercise) return [] as typeof workouts;
    const items = workouts
      .filter((w) => w.exercises.some((ex) => ex.exerciseId === exercise.id))
      .sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }, [workouts, exercise?.id]);

  const graphData = useMemo(() => {
    if (!exercise) return null as null | { labels: string[]; datasets: any[] };

    const points: { date: string; value: number }[] = [];
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));

    for (const w of sorted) {
      const ex = w.exercises.find((e) => e.exerciseId === exercise.id);
      if (!ex || ex.sets.length === 0) continue;

      let value = 0;
      if (exercise.type === 'weight_reps') {
        value = best1RMFromSets(ex.sets);
      } else if (exercise.type === 'reps_only' || exercise.type === 'bodyweight') {
        value = ex.sets.reduce((m, s) => Math.max(m, s.reps || 0), 0);
      } else if (exercise.type === 'time_only') {
        value = ex.sets.reduce((m, s) => Math.max(m, s.timeSec || 0), 0);
      }
      // Optional:
      // else if (exercise.type === 'distance_time') {
      //   // Define a metric, e.g., best (distance / time) or just max distance
      // }

      if (value > 0) points.push({ date: w.date, value });
    }

    if (points.length === 0) return null;

    const labels = points.map((p) => p.date);
    const data = points.map((p) => Math.round(p.value * 100) / 100);

    return {
      labels,
      datasets: [
        {
          data,
          borderColor: colorVar('primary'),
          backgroundColor: colorVar('primary', 0.2),
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [workouts, exercise?.id, exercise?.type]);

  // ---------- Handlers ----------
  const handleAddSet = async () => {
    if (!currentWorkout?.id || !exercise?.id) return;

    try {
      await addSetToExercise(currentWorkout.id, exercise.id, newSet);
      setNewSet({});
    } catch (error) {
      console.error('Error adding set:', error);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAddSet();
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!currentWorkout?.id || !exercise?.id) return;

    try {
      await deleteSet(currentWorkout.id, exercise.id, setId);
    } catch (error) {
      console.error('Error deleting set:', error);
    }
  };

  const handleStartTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
    setIsTimerOpen(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------- UI builders ----------
  const renderSetInput = () => {
    if (!exercise) return null;

    switch (exercise.type) {
      case 'weight_reps':
        return (
          <div className="flex flex-col w-full gap-2">
            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewSet((prev) => ({
                    ...prev,
                    weight: Math.max((prev.weight || 0) - weightIncrement, 0),
                  }))
                }
              >
                <Minus size={16} />
              </Button>
              <Input
                type="number"
                value={newSet.weight ?? ''}
                onChange={(e) =>
                  setNewSet((prev) => ({
                    ...prev,
                    weight: Number.isFinite(parseFloat(e.target.value))
                      ? parseFloat(e.target.value)
                      : 0,
                  }))
                }
                onKeyDown={handleKeyDown}
                className="w-20 mx-2 text-center"
                placeholder="0"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewSet((prev) => ({
                    ...prev,
                    weight: (prev.weight || 0) + weightIncrement,
                  }))
                }
              >
                <Plus size={16} />
              </Button>
              <span className="ml-2 text-sm text-muted-foreground">
                {units === 'metric' ? 'kg' : 'lb'}
              </span>
            </div>

            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewSet((prev) => ({
                    ...prev,
                    reps: Math.max((prev.reps || 0) - 1, 0),
                  }))
                }
              >
                <Minus size={16} />
              </Button>
              <Input
                type="number"
                value={newSet.reps ?? ''}
                onChange={(e) =>
                  setNewSet((prev) => ({
                    ...prev,
                    reps: Number.isFinite(parseInt(e.target.value)) ? parseInt(e.target.value) : 0,
                  }))
                }
                onKeyDown={handleKeyDown}
                className="w-16 mx-2 text-center"
                placeholder="0"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewSet((prev) => ({
                    ...prev,
                    reps: (prev.reps || 0) + 1,
                  }))
                }
              >
                <Plus size={16} />
              </Button>
              <span className="ml-2 text-sm text-muted-foreground">reps</span>
            </div>
          </div>
        );

      case 'bodyweight':
      case 'reps_only':
        return (
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setNewSet((prev) => ({
                  ...prev,
                  reps: Math.max((prev.reps || 0) - 1, 0),
                }))
              }
            >
              <Minus size={16} />
            </Button>
            <Input
              type="number"
              value={newSet.reps ?? ''}
              onChange={(e) =>
                setNewSet((prev) => ({
                  ...prev,
                  reps: Number.isFinite(parseInt(e.target.value)) ? parseInt(e.target.value) : 0,
                }))
              }
              onKeyDown={handleKeyDown}
              className="w-20 mx-2 text-center"
              placeholder="0"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setNewSet((prev) => ({
                  ...prev,
                  reps: (prev.reps || 0) + 1,
                }))
              }
            >
              <Plus size={16} />
            </Button>
            <span className="ml-2 text-sm text-muted-foreground">reps</span>
          </div>
        );

      case 'time_only':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={newSet.timeSec ? Math.floor(newSet.timeSec / 60) : ''}
              onChange={(e) => {
                const minutes = parseInt(e.target.value) || 0;
                const seconds = (newSet.timeSec || 0) % 60;
                setNewSet((prev) => ({ ...prev, timeSec: minutes * 60 + seconds }));
              }}
              className="w-16 text-center"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">min</span>
            <Input
              type="number"
              value={newSet.timeSec ? newSet.timeSec % 60 : ''}
              onChange={(e) => {
                const seconds = parseInt(e.target.value) || 0;
                const minutes = Math.floor((newSet.timeSec || 0) / 60);
                setNewSet((prev) => ({ ...prev, timeSec: minutes * 60 + seconds }));
              }}
              className="w-16 text-center"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">sec</span>
          </div>
        );

      // Optional placeholder if you support it later:
      // case 'distance_time':
      //   return (
      //     <div className="flex items-center space-x-2">
      //       <Input
      //         type="number"
      //         value={newSet.distance ?? ''}
      //         onChange={(e) =>
      //           setNewSet((prev) => ({
      //             ...prev,
      //             distance: Number.isFinite(parseFloat(e.target.value))
      //               ? parseFloat(e.target.value)
      //               : 0,
      //           }))
      //         }
      //         className="w-24 text-center"
      //         placeholder="0"
      //       />
      //       <span className="text-sm text-muted-foreground">km</span>
      //       {/* reuse the time inputs above */}
      //     </div>
      //   );

      default:
        return null;
    }
  };

  if (!currentWorkout || workoutExercises.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Training" onMenuClick={() => navigate(-1)} />
        <div className="p-4 text-center">
          <p className="text-muted-foreground">No exercises in workout</p>
          <Button onClick={() => navigate('/exercises')} className="mt-4">
            Add Exercises
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title={exercise?.name || 'Training'} onMenuClick={() => navigate(-1)} />

      {/* Tabs */}
      <div className="bg-surface border-b border-border">
        <div className="flex items-center px-4">
          {(['TRACK', 'HISTORY', 'GRAPH'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'TRACK' && (
          <>
            {/* Set Input */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-center">{renderSetInput()}</div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleAddSet}
                      className="flex-1"
                      disabled={
                        !exercise ||
                        (exercise?.type === 'weight_reps' &&
                          (!newSet.weight || !newSet.reps)) ||
                        ((exercise?.type === 'reps_only' || exercise?.type === 'bodyweight') &&
                          !newSet.reps) ||
                        (exercise?.type === 'time_only' && !newSet.timeSec)
                      }
                    >
                      Add Set
                    </Button>

                    <Button variant="outline" onClick={() => setIsTimerOpen(true)} aria-label="Open rest timer">
                      <Clock size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sets List */}
            {exerciseInWorkout && exerciseInWorkout.sets.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Sets</h3>
                {exerciseInWorkout.sets.map((set, index) => (
                  <Card key={set.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <div className="text-sm">
                            {set.weight != null && `${set.weight} ${units === 'metric' ? 'kg' : 'lb'}`}
                            {set.weight != null && set.reps != null && ' × '}
                            {set.reps != null && `${set.reps} reps`}
                            {set.timeSec != null && formatTime(set.timeSec)}
                            {exercise?.type === 'weight_reps' &&
                              set.weight != null &&
                              set.reps != null && (
                                <span className="ml-2 text-muted-foreground">
                                  (1RM {epley1RM(set.weight, set.reps)})
                                </span>
                              )}
                          </div>
                          {/* PR Badge */}
                          {(() => {
                            if (!exercise || !exerciseInWorkout) return null;
                            if (exercise.type === 'weight_reps' && set.weight != null && set.reps != null) {
                              const priorSets = exerciseInWorkout.sets.slice(0, index);
                              const prevBest = best1RMFromSets(priorSets);
                              return isWeightRepsPR(prevBest, set.weight, set.reps) ? (
                                <Badge variant="default">
                                  <Trophy size={12} className="mr-1" />
                                  PR
                                </Badge>
                              ) : null;
                            }
                            if (
                              (exercise.type === 'reps_only' || exercise.type === 'bodyweight') &&
                              set.reps != null
                            ) {
                              const priorSets = exerciseInWorkout.sets
                                .slice(0, index)
                                .map((s) => ({ reps: s.reps }));
                              const prevBest = priorSets.reduce((m, s) => Math.max(m, s.reps || 0), 0);
                              return isRepsPR(prevBest, set.reps) ? (
                                <Badge variant="default">
                                  <Trophy size={12} className="mr-1" />
                                  PR
                                </Badge>
                              ) : null;
                            }
                            return null;
                          })()}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSet(set.id)} aria-label="Delete set">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-2">
            {!exercise || historyItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No history yet</div>
            ) : (
              historyItems.slice(0, 20).map((w) => {
                const ex = w.exercises.find((e) => e.exerciseId === exercise.id);
                if (!ex) return null;
                const summary = (() => {
                  if (exercise.type === 'weight_reps') {
                    return ex.sets
                      .map((s) => `${s.weight ?? 0} ${units === 'metric' ? 'kg' : 'lb'} × ${s.reps ?? 0}`)
                      .join(', ');
                  }
                  if (exercise.type === 'reps_only' || exercise.type === 'bodyweight') {
                    return ex.sets.map((s) => `${s.reps ?? 0} reps`).join(', ');
                  }
                  if (exercise.type === 'time_only') {
                    return ex.sets.map((s) => `${formatTime(s.timeSec ?? 0)}`).join(', ');
                  }
                  return '';
                })();
                return (
                  <Card key={`${w.id}-${w.date}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{w.date}</div>
                          <div className="text-sm text-muted-foreground truncate">{summary}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'GRAPH' && (
          <div className="py-4">
            {graphData ? (
              <div className="h-56">
                <Line
                  data={graphData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { color: colorVar('muted-foreground') },
                        grid: { color: colorVar('chart-grid') },
                      },
                      y: {
                        ticks: { color: colorVar('muted-foreground') },
                        grid: { color: colorVar('chart-grid') },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No data to display</div>
            )}
          </div>
        )}
      </div>

      {/* Rest Timer Modal */}
      <Dialog open={isTimerOpen} onOpenChange={setIsTimerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rest Timer</DialogTitle>
            <DialogDescription>Countdown between sets</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!isTimerRunning ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {TIMER_PRESETS.map((seconds) => (
                    <Button key={seconds} variant="outline" onClick={() => handleStartTimer(seconds)}>
                      {formatTime(seconds)}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={() => setIsTimerOpen(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold">{formatTime(timerSeconds)}</div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsTimerRunning(false)} className="flex-1">
                    Pause
                  </Button>
                  <Button
                    onClick={() => {
                      setIsTimerRunning(false);
                      setIsTimerOpen(false);
                      setTimerSeconds(0);
                    }}
                    className="flex-1"
                  >
                    Stop
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
