import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
};

function getProjectUrl(): string | undefined {
  return process.env.VITE_SUPABASE_URL?.trim() || undefined;
}

function getPublishableKey(): string | undefined {
  return process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || undefined;
}

export function hasSupabaseAuthConfig(): boolean {
  return Boolean(getProjectUrl() && getPublishableKey());
}

export function hasSupabaseAdminConfig(): boolean {
  return Boolean(hasSupabaseAuthConfig() && process.env.SUPABASE_SECRET_KEY?.trim());
}

let authClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabaseAuthClient(): SupabaseClient {
  const url = getProjectUrl();
  const key = getPublishableKey();
  if (!url || !key) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
  if (!authClient) authClient = createClient(url, key, authOptions);
  return authClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  const url = getProjectUrl();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error('Configure VITE_SUPABASE_URL e SUPABASE_SECRET_KEY no servidor.');
  if (!adminClient) adminClient = createClient(url, key, authOptions);
  return adminClient;
}
