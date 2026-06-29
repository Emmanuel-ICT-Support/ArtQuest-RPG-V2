const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

const stripPublicPrefix = (path: string): string => (
  path
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/^public\//, '')
);

export const publicAssetUrl = (path: string): string => {
  if (!path || EXTERNAL_URL_PATTERN.test(path)) return path;
  return `${import.meta.env.BASE_URL}${stripPublicPrefix(path)}`;
};

export const publicAssetLookupKey = (path: string): string => {
  if (!path) return path;

  let normalizedPath = path;
  try {
    normalizedPath = new URL(path, window.location.href).pathname;
  } catch {
    normalizedPath = path;
  }

  try {
    normalizedPath = decodeURI(normalizedPath);
  } catch {
    // Keep the original path if it contains malformed escape sequences.
  }

  const basePath = stripPublicPrefix(import.meta.env.BASE_URL).replace(/\/+$/, '');
  let assetPath = stripPublicPrefix(normalizedPath);

  if (basePath && assetPath.startsWith(`${basePath}/`)) {
    assetPath = assetPath.slice(basePath.length + 1);
  }

  return `./public/${stripPublicPrefix(assetPath)}`;
};

export const isPublicImageAssetUrl = (path: string | null): boolean => (
  !!path && publicAssetLookupKey(path).startsWith('./public/images/')
);
