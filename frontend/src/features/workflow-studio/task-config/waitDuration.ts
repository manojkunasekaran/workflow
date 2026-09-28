export type WaitDurationUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export const MIN_WAIT_DURATION_MS = 1_000;
export const DEFAULT_WAIT_DURATION_MS = 60_000;

const MS_PER_UNIT: Record<WaitDurationUnit, number> = {
    seconds: 1_000,
    minutes: 60_000,
    hours: 3_600_000,
    days: 86_400_000,
};

const SECONDS_PER_UNIT: Record<WaitDurationUnit, number> = {
    seconds: 1,
    minutes: 60,
    hours: 3_600,
    days: 86_400,
};

export const WAIT_DURATION_UNITS: Array<{ label: string; value: WaitDurationUnit }> = [
    { label: 'Seconds', value: 'seconds' },
    { label: 'Minutes', value: 'minutes' },
    { label: 'Hours', value: 'hours' },
    { label: 'Days', value: 'days' },
];

export function waitPartsToMs(amount: number, unit: WaitDurationUnit): number {
    return Math.round(amount * MS_PER_UNIT[unit]);
}

export function waitPartsToSeconds(amount: number, unit: WaitDurationUnit): number {
    return Math.round(amount * SECONDS_PER_UNIT[unit]);
}

export function msToWaitParts(ms: number): { amount: number; unit: WaitDurationUnit } {
    const safe = Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_WAIT_DURATION_MS;
    if (safe % MS_PER_UNIT.days === 0 && safe >= MS_PER_UNIT.days) {
        return { amount: safe / MS_PER_UNIT.days, unit: 'days' };
    }
    if (safe % MS_PER_UNIT.hours === 0 && safe >= MS_PER_UNIT.hours) {
        return { amount: safe / MS_PER_UNIT.hours, unit: 'hours' };
    }
    if (safe % MS_PER_UNIT.minutes === 0 && safe >= MS_PER_UNIT.minutes) {
        return { amount: safe / MS_PER_UNIT.minutes, unit: 'minutes' };
    }
    return { amount: safe / MS_PER_UNIT.seconds, unit: 'seconds' };
}

export function secondsToWaitParts(seconds: number): { amount: number; unit: WaitDurationUnit } {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
    if (safe % SECONDS_PER_UNIT.days === 0 && safe >= SECONDS_PER_UNIT.days) {
        return { amount: safe / SECONDS_PER_UNIT.days, unit: 'days' };
    }
    if (safe % SECONDS_PER_UNIT.hours === 0 && safe >= SECONDS_PER_UNIT.hours) {
        return { amount: safe / SECONDS_PER_UNIT.hours, unit: 'hours' };
    }
    if (safe % SECONDS_PER_UNIT.minutes === 0 && safe >= SECONDS_PER_UNIT.minutes) {
        return { amount: safe / SECONDS_PER_UNIT.minutes, unit: 'minutes' };
    }
    return { amount: safe / SECONDS_PER_UNIT.seconds, unit: 'seconds' };
}

function unitShortLabel(unit: WaitDurationUnit): string {
    if (unit === 'seconds') return 'sec';
    if (unit === 'minutes') return 'min';
    if (unit === 'hours') return 'hr';
    return 'day';
}

export function formatWaitPreview(ms: unknown): string {
    const value = typeof ms === 'number' ? ms : Number(ms);
    if (!Number.isFinite(value) || value <= 0) return '—';
    const { amount, unit } = msToWaitParts(value);
    const label = unitShortLabel(unit);
    return `${amount} ${label}${unit === 'days' && amount !== 1 ? 's' : ''}`;
}

export function formatIntervalSecondsPreview(seconds: unknown): string {
    const value = typeof seconds === 'number' ? seconds : Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '—';
    const { amount, unit } = secondsToWaitParts(value);
    const label = unitShortLabel(unit);
    const plural = unit === 'days' && amount !== 1 ? 's' : '';
    return `Approximately every ${amount} ${label}${plural}`;
}
