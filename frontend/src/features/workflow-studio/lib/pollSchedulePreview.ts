import { CRON_PRESETS } from '@/features/workflow-studio/lib/cronPresets';
import { formatIntervalSecondsPreview } from '@/features/workflow-studio/task-config/waitDuration';
import type { PollScheduleConfig } from '@/types/api';

export function describePollSchedule(schedule: PollScheduleConfig | undefined): string {
    if (!schedule) return '—';

    if (schedule.mode === 'FIXED_INTERVAL') {
        return formatIntervalSecondsPreview(schedule.intervalSeconds);
    }

    const preset = CRON_PRESETS.find((item) => item.value === schedule.cronExpression);
    const cronLabel = preset?.label ?? schedule.cronExpression?.trim();
    if (!cronLabel) return 'Configure a cron expression';

    const timezone = schedule.timezone || 'UTC';
    return `${cronLabel} (${timezone})`;
}
