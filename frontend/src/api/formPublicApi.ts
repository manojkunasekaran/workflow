import { API_BASE_URL } from '@/api/config';
import type { FormPublicView, FormSubmitRequest, FormSubmitResponse } from '@/types/form';

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
            const body = JSON.parse(text) as { message?: string };
            message = body.message ?? text;
        } catch {
            // keep raw text
        }
        throw new Error(message || `Request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
}

export async function fetchPublicForm(slug: string, testMode: boolean): Promise<FormPublicView> {
    const prefix = testMode ? `${API_BASE_URL}/forms/public/test` : `${API_BASE_URL}/forms/public`;
    const response = await fetch(`${prefix}/${encodeURIComponent(slug)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });
    return parseJson(response);
}

export async function submitPublicForm(
    slug: string,
    testMode: boolean,
    body: FormSubmitRequest,
): Promise<FormSubmitResponse> {
    const prefix = testMode ? `${API_BASE_URL}/forms/public/test` : `${API_BASE_URL}/forms/public`;
    const response = await fetch(`${prefix}/${encodeURIComponent(slug)}/submit`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    return parseJson(response);
}
