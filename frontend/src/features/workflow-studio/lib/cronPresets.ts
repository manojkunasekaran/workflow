export const CRON_PRESETS = [
    { label: 'Every 1 minute', value: '0 */1 * * * *' },
    { label: 'Every 5 minutes', value: '0 */5 * * * *' },
    { label: 'Every 15 minutes', value: '0 */15 * * * *' },
    { label: 'Every 30 minutes', value: '0 */30 * * * *' },
    { label: 'Every hour', value: '0 0 * * * *' },
    { label: 'Every 12 hours', value: '0 0 */12 * * *' },
    { label: 'Every day at midnight', value: '0 0 0 * * *' },
    { label: 'Every Monday at 9:00 AM', value: '0 0 9 * * 1' },
];
