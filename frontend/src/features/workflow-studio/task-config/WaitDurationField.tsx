import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import {
    msToWaitParts,
    WAIT_DURATION_UNITS,
    waitPartsToMs,
    type WaitDurationUnit,
} from '@/features/workflow-studio/task-config/waitDuration';

interface WaitDurationFieldProps {
    id: string;
    label: ReactNode;
    valueMs: unknown;
    onChange: (durationMs: number) => void;
    error?: string;
}

export function WaitDurationField({ id, label, valueMs, onChange, error }: WaitDurationFieldProps) {
    const numericMs = typeof valueMs === 'number' ? valueMs : Number(valueMs);
    const { amount, unit } = msToWaitParts(Number.isFinite(numericMs) ? numericMs : 1_000);

    const updateAmount = (raw: string) => {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        onChange(waitPartsToMs(parsed, unit));
    };

    const updateUnit = (nextUnit: string) => {
        onChange(waitPartsToMs(amount, nextUnit as WaitDurationUnit));
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
