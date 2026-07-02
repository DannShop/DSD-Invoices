import { createClient } from '@supabase/supabase-js';

// Ganti dengan URL & anon key dari Supabase dashboard lo
// https://supabase.com → Project Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Cek apakah Supabase sudah dikonfigurasi */
export const isSupabaseConfigured = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON);

// PENTING: createClient() akan throw error kalau URL kosong/invalid.
// Supabase itu opsional (Phase 3), jadi kita pakai placeholder URL valid
// supaya app TIDAK crash saat belum di-setup. Semua pemanggilan Supabase
// di syncService.ts sudah dibungkus isSupabaseConfigured() check duluan,
// jadi placeholder ini tidak akan pernah benar-benar dipakai untuk request.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON || 'placeholder-anon-key'
);

