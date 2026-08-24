import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Lightweight standalone page opened in a popup window during OAuth2 flows.
 *
 * After the backend completes the authorization code exchange, it redirects
 * to this page with status and credentialId query params. This page posts a
 * message to the opener (the CredentialDialog) and then closes itself.
 *
 * URL params:
 *  - status: "success" | "error"
 *  - credentialId: the saved credential ID (on success)
 *  - connector: display name of the connector (on success)
 *  - message: error description (on error)
 */
export default function OAuthCallbackPage() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');

        if (status === 'success') {
            window.opener?.postMessage(
                {
                    type: 'OAUTH_SUCCESS',
                    credentialId: params.get('credentialId'),
                    connector: params.get('connector') ?? 'Service',
                },
                window.location.origin,
            );
        } else {
            window.opener?.postMessage(
                {
                    type: 'OAUTH_ERROR',
                    message: params.get('message') ?? 'Authorization failed. Please try again.',
                },
                window.location.origin,
            );
        }

        // Close the popup after posting the message
        const timer = setTimeout(() => window.close(), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Completing authorization…</p>
        </div>
    );
}
