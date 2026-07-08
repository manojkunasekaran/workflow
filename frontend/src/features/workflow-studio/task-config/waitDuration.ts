export type WaitDurationUnit = 'seconds' | 'minutes' | 'hours';

const MS_PER_UNIT: Record<WaitDurationUnit, number> = {
    seconds: 1_000,
    minutes: 60_000,
    hours: 3_600_000,
};

export const WAIT_DURATION_UNITS: Array<{ label: string; value: WaitDurationUnit }> = [
    { label: 'Seconds', value: 'seconds' },
    { label: 'Minutes', value: 'minutes' },
    { label: 'Hours', value: 'hours' },
];

export function waitPartsToMs(amount: number, unit: WaitDurationUnit): number {
    return Math.round(amount * MS_PER_UNIT[unit]);
}

export function msToWaitParts(ms: number): { amount: number; unit: WaitDurationUnit } {
    const safe = Number.isFinite(ms) && ms > 0 ? ms : 1_000;
    if (safe % MS_PER_UNIT.hours === 0 && safe >= MS_PER_UNIT.hours) {
        return { amount: safe / MS_PER_UNIT.hours, unit: 'hours' };
    }
    if (safe % MS_PER_UNIT.minutes === 0 && safe >= MS_PER_UNIT.minutes) {
        return { amount: safe / MS_PER_UNIT.minutes, unit: 'minutes' };
    }
    return { amount: safe / MS_PER_UNIT.seconds, unit: 'seconds' };
}

export function formatWaitPreview(ms: unknown): string {
    const value = typeof ms === 'number' ? ms : Number(ms);
    if (!Number.isFinite(value) || value <= 0) return '—';
    const { amount, unit } = msToWaitParts(value);
    const label = unit === 'seconds' ? 'sec' : unit === 'minutes' ? 'min' : 'hr';
    return `${amount} ${label}`;
}
