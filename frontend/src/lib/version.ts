/** Lê ?v= da URL (cache-bust / pós-deploy). */
export function getQueryVersion(): string | null {
  const raw = new URLSearchParams(window.location.search).get("v");
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Se ?v= estiver presente, força fetch sem cache. */
export function fetchCacheMode(): RequestCache {
  return getQueryVersion() ? "no-store" : "default";
}
