/** Shared HTTP method badge classes for connector action/trigger builders. */
export const HTTP_METHOD_BADGE_STYLES: Record<string, string> = {
    GET: 'bg-info-muted text-info border border-info/30',
    POST: 'bg-success-muted text-success border border-success/30',
    PUT: 'bg-warning-muted text-warning border border-warning/30',
    PATCH: 'bg-warning-muted text-warning border border-warning/30',
    DELETE: 'bg-danger-muted text-danger border border-danger/30',
};

export const HTTP_METHOD_BADGE_DEFAULT =
    'bg-muted text-muted-foreground border border-border';

export function httpMethodBadgeClass(method: string | undefined): string {
    if (!method) return HTTP_METHOD_BADGE_DEFAULT;
    return HTTP_METHOD_BADGE_STYLES[method] ?? HTTP_METHOD_BADGE_DEFAULT;
}
