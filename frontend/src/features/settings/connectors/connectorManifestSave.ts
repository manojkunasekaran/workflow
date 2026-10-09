import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';
import { slugifyConnectorId } from './connectorFormShared';

export function normalizeConnectorManifest(manifest: ConnectorManifest): ConnectorManifest {
    const payload = { ...manifest };

    if (payload.actions) {
        payload.actions = payload.actions.map((a, idx) => {
            const actionId = a.actionId || slugifyConnectorId(a.displayName) || `action_${idx + 1}`;
            const inputSchema = (a.inputSchema || []).map((f, fIdx) => ({
                ...f,
                key: f.key || slugifyConnectorId(f.label) || `field_${fIdx + 1}`,
            }));
            return { ...a, actionId, inputSchema };
        });
    }

    if (payload.triggers) {
        payload.triggers = payload.triggers.map((t, idx) => {
            const triggerId = t.triggerId || slugifyConnectorId(t.displayName) || `trigger_${idx + 1}`;
            const inputSchema = (t.inputSchema || []).map((f, fIdx) => ({
                ...f,
                key: f.key || slugifyConnectorId(f.label) || `field_${fIdx + 1}`,
            }));
            const preset = t.preset
                ? {
                      ...t.preset,
                      webhook: t.preset.webhook
                          ? { ...t.preset.webhook, deliveryMode: 'SUBSCRIBE' as const }
                          : undefined,
                  }
                : undefined;
            return { ...t, triggerId, inputSchema, preset };
        });
    }

    return payload;
}

export async function persistConnectorManifest(
    manifest: ConnectorManifest,
    scope: 'SYSTEM' | 'TENANT',
): Promise<ConnectorManifest> {
    const payload = normalizeConnectorManifest(manifest);
    const effectiveScope = manifest.scope || scope;

    if (effectiveScope === 'SYSTEM') {
        await connectorApi.adminUpdate(payload.connectorId, payload);
    } else {
        await connectorApi.update(payload.connectorId, payload);
    }

    return payload;
}
