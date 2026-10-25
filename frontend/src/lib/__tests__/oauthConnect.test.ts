import { describe, expect, it, vi, beforeEach } from 'vitest';
import { API_BASE_URL } from '@/api/config';
import { getOAuthCallbackRedirectUrl } from '@/lib/oauthConnect';

describe('getOAuthCallbackRedirectUrl', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    });

    it('builds callback URL based on API base', () => {
        const expected = API_BASE_URL.startsWith('http')
            ? `${API_BASE_URL.replace(/\/$/, '')}/oauth/callback`
            : `http://localhost:5173${API_BASE_URL.replace(/\/$/, '')}/oauth/callback`;
        expect(getOAuthCallbackRedirectUrl()).toBe(expected);
    });
});
