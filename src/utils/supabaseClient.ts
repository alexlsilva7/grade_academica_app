import { createClient } from '@supabase/supabase-js';

const viteEnv: Record<string, string | undefined> = (import.meta as any).env || {};
const url = viteEnv.VITE_SUPABASE_URL?.trim();
const key = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseBrowser = url && key ? createClient(url, key) : null;
export const hasSupabaseBrowserConfig = Boolean(supabaseBrowser);
