# OAuth connectors & credentials setup

## Flow

1. User picks an **Apps** connector (OAuth2) in **Credentials** or from a workflow connection field.
2. Frontend opens `{API}/oauth/{connectorId}/authorize?organizationId=...` (managed) or POSTs custom client details, then opens the returned provider URL.
3. Provider redirects to **`{workflow.api.base-url}/rest/oauth/callback`** with `code` + `state`.
4. API exchanges the code (form-urlencoded), saves an encrypted credential, runs **Verify** when the connector defines a verify action, then redirects to **`/oauth-callback`** on the frontend (popup).

## Local development

| Setting | Typical value |
|---------|----------------|
| `workflow.api.base-url` | `http://localhost:8080` |
| `workflow.frontend.base-url` | `http://localhost:5173` |
| Redirect URI in Google/Slack/etc. | `http://localhost:8080/rest/oauth/callback` |
| Vite proxy | `/rest` → API (already in `vite.config.ts`) |

**Managed OAuth:** platform admin sets **Client ID** and **Client secret** under **Apps → {app} → Platform managed OAuth** (stored encrypted in MongoDB). No properties-file client IDs.

**Custom OAuth:** end users use “Bring your own app” — client secret is sent via POST and stored encrypted on their credential for token refresh.

## Organization

OAuth authorize requires a valid `organizationId` (from the org switcher). The OAuth callback path is excluded from the `X-Organization-Id` header requirement.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Popup 404 | URL must be `/rest/oauth/...`, not `/api/v1/oauth/...` |
| “Managed OAuth is not configured” | Platform admin saves OAuth app under Apps, or use Custom OAuth2 |
| Token exchange failed | Redirect URI must match exactly; client secret correct |
| Popup blocked | Allow popups for the SPA origin |
