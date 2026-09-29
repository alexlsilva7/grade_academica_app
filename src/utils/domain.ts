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
import { hasSupabaseBrowserConfig } from './supabaseClient';
