import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import {
    msToWaitParts,
    secondsToWaitParts,
    DEFAULT_WAIT_DURATION_MS,
    WAIT_DURATION_UNITS,
    waitPartsToMs,
    waitPartsToSeconds,
    type WaitDurationUnit,
} from '@/features/workflow-studio/task-config/waitDuration';

interface WaitDurationFieldProps {
    id: string;
    label: ReactNode;
    valueMs: unknown;
    onChange: (durationMs: number) => void;
    error?: string;
    /** When 'seconds', value/onChange use interval seconds instead of milliseconds. */
    storageUnit?: 'ms' | 'seconds';
}

export function WaitDurationField({
    id,
    label,
    valueMs,
    onChange,
    error,
    storageUnit = 'ms',
}: WaitDurationFieldProps) {
    const numericValue = typeof valueMs === 'number' ? valueMs : Number(valueMs);
    const fallback = storageUnit === 'seconds' ? 60 : DEFAULT_WAIT_DURATION_MS;
    const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
    const { amount, unit } = storageUnit === 'seconds'
        ? secondsToWaitParts(safeValue)
        : msToWaitParts(safeValue);

    const emitChange = (nextAmount: number, nextUnit: WaitDurationUnit) => {
        onChange(
            storageUnit === 'seconds'
                ? waitPartsToSeconds(nextAmount, nextUnit)
                : waitPartsToMs(nextAmount, nextUnit),
        );
    };

    const updateAmount = (raw: string) => {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        emitChange(parsed, unit);
    };

    const updateUnit = (nextUnit: string) => {
        emitChange(amount, nextUnit as WaitDurationUnit);
    };

    return (
        <div className="space-y-1.5">
            {label}
            <div className="flex gap-2">
                <Input
                    id={id}
                    type="number"
                    min={1}
                    step={1}
                    value={amount}
                    onChange={(e) => updateAmount(e.target.value)}
                    className="w-24 text-sm"
                />
                <SimpleSelect
                    value={unit}
                    onValueChange={updateUnit}
                    options={WAIT_DURATION_UNITS}
                    triggerClassName="flex-1"
                />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
