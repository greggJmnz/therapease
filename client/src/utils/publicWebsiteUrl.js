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
  const configuredUrl = import.meta.env.VITE_PUBLIC_WEBSITE_URL;
  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8000/public-website';
  }

  return `${window.location.origin}/public-website`;
};