import { cn } from '@/lib/utils';

/** Neutral ghost icon button — close, back, toolbar icons. */
export const STUDIO_GHOST_ICON_BUTTON_CLASS = cn(
    'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
);

/** Ghost delete/remove — gray default, red on hover. */
export const STUDIO_GHOST_DESTRUCTIVE_CLASS = cn(
    'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
);

/** Inline “add branch / add action” text actions. */
export const STUDIO_TEXT_LINK_CLASS = cn(
    'inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline',
);

/** Compact inline link (e.g. “+ Add row”). */
export const STUDIO_TEXT_LINK_INLINE_CLASS =
    'text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline';

export const STUDIO_INPUT_FOCUS_CLASS =
    'focus:border-[#94a3b8] focus:bg-background focus:ring-2 focus:ring-[#94a3b8]/25';

export const STUDIO_OUTLINE_BUTTON_CLASS =
    'hover:border-border hover:bg-muted/60 hover:text-foreground';
