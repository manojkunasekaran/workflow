/** Blank optional task wiring refs are stored as null in saved workflow definitions. */
export function normalizeOptionalTaskRef(value: unknown): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
}

export function isUnsetTaskRef(value: unknown): boolean {
    return normalizeOptionalTaskRef(value) == null;
}
