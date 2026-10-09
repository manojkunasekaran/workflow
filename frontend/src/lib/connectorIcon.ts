/** Resolve connector manifest `icon` field to an image URL, if applicable. */
export function resolveConnectorIconSrc(icon?: string): string | null {
    if (!icon?.trim()) return null;

    const value = icon.trim();

    if (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('/') ||
        value.startsWith('data:image/')
    ) {
        return value;
    }

    if (/\.(svg|png|jpe?g|webp|gif)$/i.test(value)) {
        return value.startsWith('connectors/') ? `/${value}` : `/connectors/${value}`;
    }

    return null;
}

export function isInlineSvgIcon(icon?: string): boolean {
    if (!icon?.trim()) return false;
    const value = icon.trim();
    return value.startsWith('<') || value.includes('<svg');
}

export function connectorIconInitials(name: string): string {
    return (name || 'App')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}
