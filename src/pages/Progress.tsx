import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useExercisesStore } from '@/store/exercisesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { epley1RM } from '@/utils/pr';
import { parseISO, addMonths, subMonths, isAfter } from 'date-fns';
import { colorVar } from '@/utils/theme';

const TIME_RANGES = [
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '6M', label: '6M' },
  { key: '1Y', label: '1Y' },
  { key: 'ALL', label: 'ALL' },
];

function getWeeksRange(selectedRange: string) {
  switch (selectedRange) {
    case '1M': return 4;
    case '3M': return 12;
    case '6M': return 26;
    case '1Y': return 52;
    default: return 104; // ALL ~2y
  }
}

function weekKey(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const year = d.getUTCFullYear();
  const week = getISOWeekNumber(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getISOWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

function buildWeeklyBuckets(workouts: any[]) {
  const map = new Map<string, { count: number; volume: number }>();
  workouts.forEach(w => {
    const key = weekKey(w.date);
    let entry = map.get(key);
    if (!entry) { entry = { count: 0, volume: 0 }; map.set(key, entry); }
    entry.count += 1;
    const volume = w.exercises.reduce((t: number, ex: any) => t + ex.sets.reduce((st: number, s: any) => st + ((s.weight||0) * (s.reps||0)), 0), 0);
    entry.volume += volume;
  });
  return map;
}

function getFrequencyData(workouts: any[], range: string) {
  const weeks = getWeeksRange(range);
  const buckets = buildWeeklyBuckets(workouts);
  const sortedKeys = Array.from(buckets.keys()).sort();
  const selectedKeys = sortedKeys.slice(-weeks);
  return {
    labels: selectedKeys,
    datasets: [{
      data: selectedKeys.map(k => buckets.get(k)?.count || 0),
      borderColor: colorVar('primary'),
      backgroundColor: colorVar('primary', 0.2),
      tension: 0.3,
      fill: true,
    }]
  };
}

function getVolumeData(workouts: any[], range: string) {
  const weeks = getWeeksRange(range);
  const buckets = buildWeeklyBuckets(workouts);
  const sortedKeys = Array.from(buckets.keys()).sort();
  const selectedKeys = sortedKeys.slice(-weeks);
  return {
    labels: selectedKeys,
    datasets: [{
      data: selectedKeys.map(k => Math.round(buckets.get(k)?.volume || 0)),
      backgroundColor: colorVar('primary'),
      borderRadius: 6,
    }]
  };
}

export default function Progress() {
  const [selectedRange, setSelectedRange] = useState('1M');
  const { workouts } = useWorkoutsStore();
  const { exercises } = useExercisesStore();
  const { units } = useSettingsStore();

  // Calculate stats
  const totalWorkouts = workouts.length;
  
  const totalVolume = useMemo(() => workouts.reduce((total, workout) => {
    return total + workout.exercises.reduce((workoutTotal, exercise) => {
      return workoutTotal + exercise.sets.reduce((setTotal, set) => {
        if (set.weight != null && set.reps != null) {
          return setTotal + (set.weight * set.reps);
        }
        return setTotal;
      }, 0);
    }, 0);
  }, 0), [workouts]);

  // Personal records: count unique PRs by exercise/date using est 1RM
  const personalRecords = useMemo(() => {
    let count = 0;
    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        let bestBefore = 0;
        ex.sets.forEach(s => {
          if (s.weight != null && s.reps != null) {
            const est = epley1RM(s.weight, s.reps);
            if (est > bestBefore) {
              count += 1;
              bestBefore = est;
            }
          }
        });
      });
    });
    return count;
  }, [workouts]);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Progress" />
      
      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalWorkouts}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">
                  Total Workouts
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Math.round(totalVolume).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">
                  Total Volume ({units === 'metric' ? 'KG' : 'LB'})
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{personalRecords}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">
                  Personal Records
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workout Frequency and Volume Charts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Training Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Time Range Buttons */}
            <div className="flex items-center space-x-1 mb-4">
              {TIME_RANGES.map(range => (
                <Button
                  key={range.key}
                  variant={selectedRange === range.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRange(range.key)}
                  className="text-xs"
                >
                  {range.label}
                </Button>
              ))}
            </div>
            
            <div className="space-y-6">
              <div className="h-48">
                <Line data={getFrequencyData(workouts, selectedRange)} options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { x: { ticks: { color: colorVar('muted-foreground') }, grid: { color: colorVar('chart-grid') }}, y: { ticks: { color: colorVar('muted-foreground') }, grid: { color: colorVar('chart-grid') }}}
                }} />
              </div>
              <div className="h-48">
                <Bar data={getVolumeData(workouts, selectedRange)} options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { x: { ticks: { color: colorVar('muted-foreground') }, grid: { color: colorVar('chart-grid') }}, y: { ticks: { color: colorVar('muted-foreground') }, grid: { color: colorVar('chart-grid') }}}
                }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Workouts */}
        {workouts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Workouts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workouts.slice(0, 5).map(workout => {
                  const exerciseNames = workout.exercises
                    .map(ex => {
                      const exercise = exercises.find(e => e.id === ex.exerciseId);
                      return exercise?.name || 'Unknown';
                    })
                    .slice(0, 3);
                  
                  const totalSets = workout.exercises.reduce((total, ex) => total + ex.sets.length, 0);

                  return (
                    <div key={workout.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <div>
                        <div className="font-medium">{workout.date}</div>
                        <div className="text-sm text-muted-foreground">
                          {exerciseNames.join(', ')}
                          {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {totalSets} sets
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}