export function epley1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function isWeightRepsPR(prevBest: number, weight?: number, reps?: number): boolean {
  if (weight == null || reps == null) return false;
  const est = epley1RM(weight, reps);
  return est > (prevBest || 0);
}

export function best1RMFromSets(sets: Array<{weight?: number; reps?: number}>): number {
  return sets.reduce((best, s) => {
    if (s.weight != null && s.reps != null) {
      const est = epley1RM(s.weight, s.reps);
      return Math.max(best, est);
    }
    return best;
  }, 0);
}

export function isRepsPR(prevBest: number, reps?: number): boolean {
  if (reps == null) return false;
  return reps > (prevBest || 0);
}
