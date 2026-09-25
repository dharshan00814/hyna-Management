import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-anon-public-key-here'
  );
};

if (!isSupabaseConfigured()) {
  console.warn(
    '[Supabase] Missing or default VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Please add your Supabase credentials in .env to connect to your live database.'
  );
}

// Fallback URL and Key so createClient doesn't crash the frontend build or runtime on load
const safeUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
