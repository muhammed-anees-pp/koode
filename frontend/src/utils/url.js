export const getBackendBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return `http://${window.location.hostname}:8000`;
  }

  return window.location.origin;
};

export const resolveMediaUrl = (path) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
};
