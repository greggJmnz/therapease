const normalizeBaseUrl = (value) => {
  if (!value) return '';

  const trimmedValue = value.trim().replace(/\/$/, '');

  if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith('/')) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
};

export const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  const configuredHost = import.meta.env.VITE_API_HOST;
  if (configuredHost) {
    return `${normalizeBaseUrl(configuredHost)}/api`;
  }

  if (import.meta.env.DEV) {
    console.warn('⚠️ No API env var set. Falling back to relative /api for development.');
  }

  return '/api';
};

export const getApiOrigin = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    const normalizedUrl = normalizeBaseUrl(configuredUrl);
    if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
      return normalizedUrl.replace(/\/$/, '').replace(/\/api$/, '');
    }
  }

  const configuredHost = import.meta.env.VITE_API_HOST;
  if (configuredHost) {
    return normalizeBaseUrl(configuredHost);
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  return window.location.origin;
};

export const buildApiUrl = (path = '') => {
  if (!path) return getApiBaseUrl();

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedPath.startsWith('/api')) {
    return `${baseUrl}${normalizedPath.slice(4)}`;
  }

  return `${baseUrl}${normalizedPath}`;
};