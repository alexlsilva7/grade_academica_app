export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const requestUrl = new URL(request?.url || input.toString(), typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  const method = (init.method || request?.method || 'GET').toUpperCase();
  const publicAcademicRead = method === 'GET' && /^\/api\/courses(?:\/[^/]+)?\/?$/.test(requestUrl.pathname);
  const headers = new Headers(init.headers || request?.headers || undefined);

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
  return fetch(input, { ...init, headers });
}
