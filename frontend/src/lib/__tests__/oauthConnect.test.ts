import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getOAuthCallbackRedirectUrl } from '@/lib/oauthConnect';

describe('getOAuthCallbackRedirectUrl', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    });

    it('builds callback URL from relative API base', () => {
        expect(getOAuthCallbackRedirectUrl()).toBe('http://localhost:5173/rest/oauth/callback');
    });
});
