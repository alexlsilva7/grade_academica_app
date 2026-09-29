export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

export function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    !isLocalhost() ||
    window.location.hostname === 'bcc-ufape.vercel.app' ||
    window.location.href.includes('bcc-ufape.vercel.app')
  );
}

export function canAccessAdmin(): boolean {
  return isLocalhost() || hasSupabaseBrowserConfig;
}

export function canManageHomeCourses(): boolean {
  return isLocalhost() && !hasSupabaseBrowserConfig;
}
const browserEnv: Record<string, string | undefined> = (import.meta as any).env || {};
const hasSupabaseBrowserConfig = Boolean(browserEnv.VITE_SUPABASE_URL?.trim() && browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY?.trim());
