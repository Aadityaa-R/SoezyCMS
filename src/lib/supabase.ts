import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Disconnected in strictly local mode
export const isSupabaseConfigured = false;

export const supabase: SupabaseClient | null = null;

/**
 * Checks connectivity to the configured Supabase project.
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  error?: string;
}> {
  return {
    connected: false,
    message: 'Supabase is disconnected (strictly local offline mode)',
  };
}
