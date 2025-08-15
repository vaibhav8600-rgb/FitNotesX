export function colorVar(name: string, alpha?: number) {
  if (typeof window === 'undefined') return '#000';
  const root = getComputedStyle(document.documentElement);
  const val = root.getPropertyValue(`--${name}`).trim();
  if (!val) return '#000';
  return alpha !== undefined ? `hsl(${val} / ${alpha})` : `hsl(${val})`;
}
