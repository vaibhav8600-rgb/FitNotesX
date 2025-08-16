import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useExercisesStore } from '@/store/exercisesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { epley1RM } from '@/utils/pr';
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

function getISOWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

function weekKey(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const year = d.getUTCFullYear();
  const week = getISOWeekNumber(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function buildWeeklyBuckets(workouts: any[]) {
  const map = new Map<string, { count: number; volume: number }>();
  workouts.forEach(w => {
    const key = weekKey(w.date);
    let entry = map.get(key);
    if (!entry) { entry = { count: 0, volume: 0 }; map.set(key, entry); }
    entry.count += 1;
    const volume = w.exercises.reduce(
      (t: number, ex: any) =>
        t + ex.sets.reduce((st: number, s: any) => st + ((s.weight || 0) * (s.reps || 0)), 0),
      0
    );
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

// filter workouts to the selected time range (by weeks)
function filterWorkoutsByRange(workouts: any[], range: string) {
  if (range === 'ALL') return workouts;
  const weeks = getWeeksRange(range);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  return workouts.filter(w => new Date(w.date + 'T00:00:00') >= cutoff);
}

// stable 32-bit hash for category names (deterministic)
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/** 
 * Build a **unique** theme palette:
 * - Start with brand/theme tokens
 * - Remove duplicates (some tokens map to identical HSL)
 * - If still too short, append distinct fallback HSL colors
 */
function buildThemePalette() {
  const TOKENS: (keyof any)[] = [
    'chart-primary',
    'chart-secondary',
    'chart-tertiary',
    'chart-quaternary',
    'success',
    'info',
    'warning',
    'primary',
    'accent',
    // optional brand tokens
    'fitnotes-teal',
    'fitnotes-teal-light',
    'fitnotes-teal-dark',
  ];

  const seen = new Set<string>();
  const palette: string[] = [];

  for (const t of TOKENS) {
    const c = colorVar(t as any, 0.95);
    if (c && !seen.has(c)) {
      seen.add(c);
      palette.push(c);
    }
  }

  // Fallbacks to guarantee enough **distinct** hues
  const FALLBACKS = [
    'hsl(270 70% 55% / 0.95)', // violet
    'hsl(320 70% 55% / 0.95)', // magenta
    'hsl(10 75% 55% / 0.95)',  // red-orange
    'hsl(200 70% 45% / 0.95)', // azure
    'hsl(100 65% 45% / 0.95)', // lime
    'hsl(240 60% 55% / 0.95)', // indigo
    'hsl(28 78% 52% / 0.95)',  // amber
    'hsl(340 65% 55% / 0.95)', // rose
  ];

  for (const c of FALLBACKS) {
    if (!seen.has(c)) {
      seen.add(c);
      palette.push(c);
    }
  }

  // Ensure at least one color
  if (!palette.length) palette.push(colorVar('primary', 0.95));

  return palette;
}

// assign unique colors to labels with collision handling
function assignColors(labels: string[]) {
  const palette = buildThemePalette();
  const used = new Set<number>();
  const usedColorStrings = new Set<string>();
  const colors: string[] = [];
  let overflowCount = 0;

  for (const raw of labels) {
    const label = raw.trim();
    const low = label.toLowerCase();

    if (low === 'no data') { colors.push(colorVar('muted-foreground', 0.2)); continue; }
    if (low === 'other')   { colors.push(colorVar('muted-foreground', 0.35)); continue; }

    let idx = Math.abs(hash(low)) % palette.length;

    // linear probe on indices OR color string duplicates
    const start = idx;
    while (used.has(idx) || usedColorStrings.has(palette[idx])) {
      idx = (idx + 1) % palette.length;
      if (idx === start) break; // palette exhausted
    }

    if (!used.has(idx) && !usedColorStrings.has(palette[idx])) {
      used.add(idx);
      usedColorStrings.add(palette[idx]);
      colors.push(palette[idx]);
    } else {
      // palette exhausted: vary alpha (still distinct visually)
      const alpha = 0.85 - (overflowCount * 0.08);
      overflowCount++;
      colors.push(colorVar('primary', Math.max(0.4, alpha)));
    }
  }

  return colors;
}

// compute doughnut data: total volume by category with “Other” merge (no duplicates)
function getCategorySplitData(workouts: any[], exercises: any[], range: string) {
  const inRange = filterWorkoutsByRange(workouts, range);
  if (!inRange.length || !exercises.length) {
    return { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: [colorVar('muted-foreground', 0.2)] }] };
  }

  const byId = new Map<number, any>(exercises.map((e: any) => [e.id, e]));
  const totals = new Map<string, number>();

  for (const w of inRange) {
    for (const ex of (w.exercises || [])) {
      const meta = byId.get(ex.exerciseId);
      const cat = (meta?.category || 'Other') as string;
      const vol = (ex.sets || []).reduce((sum: number, s: any) => sum + ((s.weight || 0) * (s.reps || 0)), 0);
      totals.set(cat, (totals.get(cat) || 0) + vol);
    }
  }

  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const MAX = 6;
  const top = entries.slice(0, MAX);
  const rest = entries.slice(MAX);

  const labels = top.map(([k]) => k);
  const data = top.map(([, v]) => Math.round(v));

  // merge remainder into "Other"
  const otherTotal = rest.reduce((a, [, v]) => a + v, 0);
  if (otherTotal > 0) {
    const otherIdx = labels.findIndex(l => l.trim().toLowerCase() === 'other');
    if (otherIdx >= 0) data[otherIdx] += Math.round(otherTotal);
    else { labels.push('Other'); data.push(Math.round(otherTotal)); }
  }

  const backgroundColor = assignColors(labels);

  return {
    labels,
    datasets: [{
      data,
      backgroundColor,
      borderWidth: 0
    }]
  };
}

export default function Progress() {
  const [selectedRange, setSelectedRange] = useState('1M');
  const { workouts } = useWorkoutsStore();
  const { exercises } = useExercisesStore();
  const { units } = useSettingsStore();

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

  const categorySplitData = useMemo(
    () => getCategorySplitData(workouts, exercises, selectedRange),
    [workouts, exercises, selectedRange]
  );

  const axisText = colorVar('chart-text');
  const gridColor = colorVar('chart-grid');

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

        {/* Training Overview */}
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
              <div className="h-50">
                <Line
                  data={getFrequencyData(workouts, selectedRange)}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: axisText }, grid: { color: gridColor } },
                      y: { ticks: { color: axisText }, grid: { color: gridColor } }
                    }
                  }}
                />
              </div>
              <div className="h-50">
                <Bar
                  data={getVolumeData(workouts, selectedRange)}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: axisText }, grid: { color: gridColor } },
                      y: { ticks: { color: axisText }, grid: { color: gridColor } }
                    }
                  }}
                />
              </div>

              {/* Doughnut: Volume by Category */}
              <div className="h-50">
                <Doughnut
                  data={categorySplitData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                      legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                          color: axisText,
                          boxWidth: 18,
                          boxHeight: 10,
                          useBorderRadius: true,
                          borderRadius: 4
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const value = ctx.parsed || 0;
                            const total = ctx.dataset.data.reduce((a: number, b: number) => a + (b as number), 0);
                            const pct = total ? Math.round((value / total) * 100) : 0;
                            return `${ctx.label}: ${value.toLocaleString()} (${pct}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
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
                {workouts.slice(0, 5).map((workout: any) => {
                  const exerciseNames = workout.exercises
                    .map((ex: any) => {
                      const exercise = exercises.find((e: any) => e.id === ex.exerciseId);
                      return exercise?.name || 'Unknown';
                    })
                    .slice(0, 3);
                  
                  const totalSets = workout.exercises.reduce((total: number, ex: any) => total + ex.sets.length, 0);

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
