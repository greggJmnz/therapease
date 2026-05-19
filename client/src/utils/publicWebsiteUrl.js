const normalizeUrl = (value) => {
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

export const getPublicWebsiteUrl = () => {
  const sameOriginUrl = `${window.location.origin}/public-website`;
  const configuredUrl = normalizeUrl(import.meta.env.VITE_PUBLIC_WEBSITE_URL || '');

  if (!configuredUrl) {
    return import.meta.env.DEV ? 'http://localhost:8000/public-website' : sameOriginUrl;
  }

  try {
    const configuredOrigin = new URL(configuredUrl, window.location.origin).origin;
    if (configuredOrigin === window.location.origin) {
      return configuredUrl;
    }
  } catch {
    return sameOriginUrl;
  }

  return sameOriginUrl;
};