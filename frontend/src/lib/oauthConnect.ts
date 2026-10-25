import { API_BASE_URL } from '@/api/config';

/** Redirect URI to register in the provider's OAuth app (API callback, not the SPA route). */
export function getOAuthCallbackRedirectUrl(): string {
    if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
        return `${API_BASE_URL.replace(/\/$/, '')}/oauth/callback`;
    }
    return `${window.location.origin}${API_BASE_URL.replace(/\/$/, '')}/oauth/callback`;
}

export type OAuthConnectMode = 'MANAGED' | 'CUSTOM';

export interface OAuthCustomConfig {
    clientId: string;
    clientSecret?: string;
    scopes?: string;
    allowedDomains?: string;
}

export interface OAuthConnectResult {
    credentialId?: string;
    connector?: string;
}

export interface OAuthConnectOptions {
    connectorId: string;
    mode: OAuthConnectMode;
    custom?: OAuthCustomConfig;
    onSuccess?: (result: OAuthConnectResult) => void;
    onError?: (message: string) => void;
}

async function resolveAuthorizationUrl(
    connectorId: string,
    mode: OAuthConnectMode,
    custom?: OAuthCustomConfig,
): Promise<string> {
    if (mode === 'CUSTOM') {
        if (!custom?.clientId?.trim()) {
            throw new Error('Client ID is required for Custom OAuth2.');
        }
        const response = await fetch(`${API_BASE_URL}/oauth/${connectorId}/authorize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                clientId: custom.clientId.trim(),
                clientSecret: custom.clientSecret?.trim() || undefined,
                scopes: custom.scopes?.trim() || undefined,
                allowedDomains: custom.allowedDomains?.trim() || undefined,
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Failed to start OAuth (${response.status})`);
        }
        const payload = (await response.json()) as { authorizationUrl: string };
        if (!payload.authorizationUrl) {
            throw new Error('Server did not return an authorization URL.');
        }
        return payload.authorizationUrl;
    }

    return `${API_BASE_URL}/oauth/${connectorId}/authorize`;
}

/**
 * Opens the provider consent screen in a popup and resolves when OAuthCallbackPage posts a result.
 */
export function connectOAuthInPopup(options: OAuthConnectOptions): void {
    const { connectorId, mode, custom, onSuccess, onError } = options;

    void (async () => {
        let popupUrl: string;
        try {
            popupUrl = await resolveAuthorizationUrl(connectorId, mode, custom);
        } catch (err) {
            onError?.(err instanceof Error ? err.message : 'Failed to start OAuth flow.');
            return;
        }

        const width = 600;
        const height = 700;
        const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
        const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
        const popup = window.open(
            popupUrl,
            `oauth_${connectorId}`,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
        );

        if (!popup) {
            onError?.('Popup blocked. Allow popups for this site and try again.');
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.type === 'OAUTH_SUCCESS') {
                window.removeEventListener('message', handleMessage);
                clearInterval(pollClosed);
                popup.close();
                onSuccess?.({
                    credentialId: data.credentialId ?? undefined,
                    connector: data.connector ?? undefined,
                });
            } else if (data?.type === 'OAUTH_ERROR') {
                window.removeEventListener('message', handleMessage);
                clearInterval(pollClosed);
                popup.close();
                onError?.(data.message ?? 'Authorization failed.');
            }
        };

        window.addEventListener('message', handleMessage);

        const pollClosed = window.setInterval(() => {
            if (popup.closed) {
                clearInterval(pollClosed);
                window.removeEventListener('message', handleMessage);
            }
        }, 500);
    })();
}
