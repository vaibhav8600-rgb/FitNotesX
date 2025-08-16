// src/utils/normalize.ts
// ✅ Named exports exactly as used by csv.ts

/** normalize for matching: trim, collapse spaces, lowercase */
export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** pretty display for UI: Title Case with single spaces */
export function toCategoryDisplayName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ');
  return s
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
