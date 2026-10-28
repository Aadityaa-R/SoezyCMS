import type { SupabaseClient } from '@supabase/supabase-js';

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
