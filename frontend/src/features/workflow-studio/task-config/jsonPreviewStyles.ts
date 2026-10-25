/** Semantic classes for inline JSON / debug tree previews in task config panels. */
export function jsonBooleanClass(value: boolean): string {
  return value ? 'text-success' : 'text-danger';
}

export const JSON_PREVIEW_NUMBER = 'text-info';
export const JSON_PREVIEW_STRING = 'text-warning';

export const CALLOUT_WARNING =
  'rounded-md border border-warning/30 bg-warning-muted p-3 text-sm text-warning';

export const CALLOUT_WARNING_SM =
  'text-xs text-warning bg-warning-muted/80 border border-warning/30 rounded-md p-2';

export const CALLOUT_WARNING_INLINE =
  'flex items-start gap-2 rounded-md bg-warning-muted border border-warning/30 p-3 text-sm text-warning';
