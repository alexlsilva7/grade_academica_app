export function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'bcc-ufape.vercel.app' || window.location.href.includes('bcc-ufape.vercel.app');
}
