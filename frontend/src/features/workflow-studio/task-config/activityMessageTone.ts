/** Log / activity line tone → semantic text color (task config panels). */
export function activityMessageToneClass(
  tone: 'success' | 'error' | 'default',
  base = 'text-xs font-mono',
): string {
  if (tone === 'success') return `${base} text-success`;
  if (tone === 'error') return `${base} text-destructive`;
  return `${base} text-muted-foreground`;
}
