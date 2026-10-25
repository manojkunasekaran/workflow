/**
 * Resolves the backend API base URL.
 * Automatically aligns the API host with the browser's current window.location.hostname
 * (e.g. localhost vs 127.0.0.1) so requests are strictly same-site and browser cookies
 * are preserved across all development routes without cross-site blocking.
 */
export function getApiBaseUrl(): string {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) as string | undefined;

  // In non-browser environments (e.g. Vitest / Node.js SSR)
  if (typeof window === 'undefined' || !window.location) {
    return envUrl || 'http://localhost:8080/rest';
  }

  // If a relative path was specified (e.g. '/rest')
  if (envUrl && envUrl.startsWith('/')) {
    return envUrl;
  }

  // If an absolute URL was configured (e.g. 'http://localhost:8080/rest' or 'http://127.0.0.1:8080/rest')
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      // If connecting locally, always match the browser's active hostname (localhost vs 127.0.0.1)
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        const currentHost = window.location.hostname || 'localhost';
        parsed.hostname = currentHost;
        return parsed.origin + parsed.pathname.replace(/\/$/, '');
      }
      return envUrl.replace(/\/$/, '');
    } catch {
      return envUrl;
    }
  }

  // Default fallback: direct connection to backend port 8080 on the same host
  return `${window.location.protocol}//${window.location.hostname}:8080/rest`;
}

export const API_BASE_URL = getApiBaseUrl();

