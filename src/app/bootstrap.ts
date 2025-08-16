// src/app/bootstrap.ts
// NEW: Tiny guard to prevent accidental reseeding across reloads.

export const SEED_GUARD_KEY = 'fx.hasSeeded.v1'; // NEW

export function hasSeededGuard(): boolean { // NEW
  try { return localStorage.getItem(SEED_GUARD_KEY) === '1'; } catch { return false; }
}

export function markSeededGuard(): void { // NEW
  try { localStorage.setItem(SEED_GUARD_KEY, '1'); } catch {}
}

export function clearSeedGuard(): void { // NEW
  try { localStorage.removeItem(SEED_GUARD_KEY); } catch {}
}