import { createClient } from '@supabase/supabase-js';

// Ganti dengan URL & anon key dari Supabase dashboard lo
// https://supabase.com → Project Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

/** Cek apakah Supabase sudah dikonfigurasi */
export const isSupabaseConfigured = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON);
