-- ═══════════════════════════════════════════════════════════
-- DSD-Invoices — Fix RLS Policy (Personal Use, No Auth)
-- Jalankan ini di SQL Editor kalau Push masih gagal/0 data
-- ═══════════════════════════════════════════════════════════

-- Supabase project baru kadang otomatis enable RLS bawaan.
-- Karena app ini personal tool tanpa sistem login, kita matikan
-- RLS supaya anon key bisa baca/tulis semua tabel.

ALTER TABLE settings           DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients            DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_catalog       DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices DISABLE ROW LEVEL SECURITY;

-- Setelah ini, coba Push lagi dari halaman Cloud Sync.
-- Kalau masih gagal, buka Console (F12) saat klik Push,
-- error detailnya sekarang akan muncul jelas di sana.
