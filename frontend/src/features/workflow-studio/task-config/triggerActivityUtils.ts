import axios from 'axios';

/** Trigger ops endpoints return 400 when the saved workflow trigger type does not match yet. */
export function isTriggerNotReadyError(err: unknown): boolean {
    if (!axios.isAxiosError(err)) {
        return false;
    }
    const status = err.response?.status;
    return status === 400 || status === 404;
}
