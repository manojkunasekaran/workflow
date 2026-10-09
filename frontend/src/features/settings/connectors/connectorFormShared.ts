import type { ConnectorAuthType } from '@/api/connectorApi';

export const CONNECTOR_CATEGORIES = [
    'Communication',
    'Productivity',
    'CRM',
    'Developer Tools',
    'Finance',
    'Marketing',
    'Analytics',
    'Storage',
    'Custom',
] as const;

export const CONNECTOR_AUTH_LABELS: Record<ConnectorAuthType, string> = {
    BEARER_TOKEN: 'API Key / Token',
    API_KEY: 'API Key (Custom Header)',
    BASIC_AUTH: 'Basic Auth',
    CUSTOM_HEADER: 'Custom Header',
    OAUTH2: 'OAuth 2.0',
    NONE: 'No Authentication',
};

export function slugifyConnectorId(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
