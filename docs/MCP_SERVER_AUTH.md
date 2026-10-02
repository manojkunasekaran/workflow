# MCP Server Authentication

How external clients authenticate when calling **our** platform's MCP server (Streamable HTTP at `globalEndpointPath`). Implemented in `McpServerAuthFilter` + `McpSettingsService` (token stored encrypted in `Organization.settings.mcp`).

---

## Scope

| Direction | Auth model | Status |
|-----------|------------|--------|
| **Inbound** — AI client → our MCP server | Bearer token (org-scoped, DB-backed) | Implemented |
| **Outbound** — our Agents task → external MCP server | Credential on `IntegrationCredential` (`MCP_SERVER`) | Phase 1 |

This doc covers **inbound** auth only.

---

## Goals

1. Only holders of a valid token can list tools or invoke workflow-backed MCP tools.
2. Token is managed from the **Settings** page (stored in DB, not `application.properties`).
3. Token can be rotated without redeploying the app.
4. Failed auth is logged; no workflow execution on invalid token.

---

## Storage

Stored on [Organization.settings](../backend/modules/common/src/main/java/com/app/common/entity/Organization.java) under key `mcp`:

```json
{
  "mcp": {
    "enabled": true,
    "exposureMode": "BOTH",
    "globalEndpointPath": "/mcp",
    "authTokenEncrypted": "<AES-GCM ciphertext via EncryptionService>"
  }
}
```

- **Never** return the decrypted token on `GET`; only show masked value (`mcp_****last4`) and a "Regenerate" action.
- On regenerate: new random token, encrypt, save, invalidate previous token immediately.
- Bootstrap: if MCP server is enabled but no token exists, reject all inbound calls until admin generates one in Settings.

---

## Request validation

All inbound MCP requests to `{publicBaseUrl}{globalEndpointPath}` (default `/rest/mcp`):

```
Authorization: Bearer <token>
```

| Check | On failure |
|-------|------------|
| Header present | `401 Unauthorized` |
| Token matches decrypted org token | `401 Unauthorized` |
| MCP server `enabled` in settings | `403 Forbidden` |
| Rate limit (future) | `429 Too Many Requests` |

Use constant-time comparison for the bearer value.

---

## Endpoint

Single MCP Streamable HTTP servlet at `{publicBaseUrl}{globalEndpointPath}` (default `{publicBaseUrl}/mcp`). One org bearer token gates all inbound MCP access.

---

## Settings UI

Section on Settings page:

- Enable / disable MCP server
- MCP endpoint path (default `/mcp`)
- Auth token: masked display, Copy (one-time reveal on generate), Regenerate
- Copy-paste block for Cursor/Claude MCP config JSON

---

## Audit (Phase 3 backlog)

Log every inbound MCP request:

- timestamp, orgId, endpoint, tool name (if tool call), auth result, executionId (if triggered)

Mirror pattern of `TriggerWebhookLog`.

---

## Explicitly out of scope (v1)

- SSRF protection for outbound MCP client calls (deferred)
- Per-workflow tokens
- OAuth for MCP clients
- mTLS
- IP allowlists

---

## Implementation checklist

- [x] `McpSettingsService` — read/write `Organization.settings.mcp`
- [x] `GET/PUT /rest/settings/mcp` API
- [x] Settings page MCP section (token regenerate, audit logs)
- [x] `McpServerAuthFilter` on `/mcp/**`
- [x] Token generate / rotate / mask
- [x] Audit log on auth failure and successful tool invocation (`TriggerMcpLog`)

**Still open:** native MCP protocol server (Streamable HTTP JSON-RPC), rate limiting, per-workflow tokens.
