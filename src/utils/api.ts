const ACADEMIC_CACHE_TTL_MS = 30_000;
const ACADEMIC_CACHE_MAX_ENTRIES = 20;
const academicCache = new Map<string, { response: Response; expiresAt: number }>();
const academicRequests = new Map<string, Promise<Response>>();
let academicCacheGeneration = 0;

function clearAcademicCache(): void {
  academicCacheGeneration += 1;
  academicCache.clear();
  academicRequests.clear();
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const requestUrl = new URL(request?.url || input.toString(), typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  const method = (init.method || request?.method || 'GET').toUpperCase();
  const publicAcademicRead = method === 'GET' && /^\/api\/courses(?:\/[^/]+)?\/?$/.test(requestUrl.pathname);
  const headers = new Headers(init.headers || request?.headers || undefined);
  const cacheMode = init.cache || request?.cache;
  const cacheable = publicAcademicRead && requestUrl.origin === (typeof window === 'undefined' ? 'http://localhost' : window.location.origin)
    && !headers.has('Authorization') && !request && !init.signal
    && cacheMode !== 'no-store' && cacheMode !== 'reload';

  if (cacheable) {
    const key = requestUrl.href;
    const cached = academicCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.response.clone();
    if (cached) academicCache.delete(key);

    const pending = academicRequests.get(key);
    if (pending) return (await pending).clone();

    const generation = academicCacheGeneration;
    let requestPromise: Promise<Response>;
    requestPromise = fetch(input, { ...init, headers }).then(response => {
      if (response.ok && generation === academicCacheGeneration) {
        if (academicCache.size >= ACADEMIC_CACHE_MAX_ENTRIES) {
          academicCache.delete(academicCache.keys().next().value!);
        }
        academicCache.set(key, { response: response.clone(), expiresAt: Date.now() + ACADEMIC_CACHE_TTL_MS });
      }
      return response;
    }).finally(() => {
      if (academicRequests.get(key) === requestPromise) academicRequests.delete(key);
    });
    academicRequests.set(key, requestPromise);
    return requestPromise;
  }

  // Course catalog and academic data reads are public; defer the Supabase Auth
  // client until an administrative or otherwise protected API needs a token.
  if (requestUrl.pathname.startsWith('/api/') && !publicAcademicRead) {
    const { supabaseBrowser } = await import('./supabaseClient');
    if (supabaseBrowser) {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
  }
  const response = await fetch(input, { ...init, headers });
  if (method !== 'GET' && requestUrl.pathname.startsWith('/api/') && response.ok) clearAcademicCache();
  return response;
}
