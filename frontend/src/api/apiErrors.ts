import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === 'object' && 'message' in data) {
            const message = (data as { message?: unknown }).message;
            if (typeof message === 'string' && message.trim()) {
                return message;
            }
        }
    }
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return fallback;
}
