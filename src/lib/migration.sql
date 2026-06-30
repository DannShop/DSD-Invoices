-- ═══════════════════════════════════════════════════════════
-- WildanInvoice — Supabase Schema Migration
-- Paste & run di: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── SETTINGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name    TEXT NOT NULL DEFAULT '',
  business_address TEXT DEFAULT '',
  business_email   TEXT DEFAULT '',
  business_phone   TEXT DEFAULT '',
  logo_base64      TEXT,
  default_tax_rate NUMERIC(5,2) DEFAULT 11,
  default_currency TEXT DEFAULT 'IDR',
  invoice_prefix   TEXT DEFAULT 'INV',
  payment_notes    TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLIENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  address    TEXT DEFAULT '',
  company    TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ITEM CATALOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_catalog (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  default_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit          TEXT DEFAULT '',
  category      TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVOICES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number      TEXT UNIQUE NOT NULL,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_snapshot     JSONB NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT','SENT','PAID','OVERDUE','CANCELLED')),
  invoice_date        DATE NOT NULL,
  due_date            DATE NOT NULL,
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_type       TEXT CHECK (discount_type IN ('FLAT','PERCENT')),
  discount_value      NUMERIC(15,2) DEFAULT 0,
  tax_rate            NUMERIC(5,2) DEFAULT 11,
  tax_amount          NUMERIC(15,2) DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency            TEXT DEFAULT 'IDR',
  notes               TEXT DEFAULT '',
  pdf_path            TEXT,
  recurring_id        UUID,              -- FK ke recurring_invoices (nullable)
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVOICE LINE ITEMS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  catalog_item_id  UUID REFERENCES item_catalog(id) ON DELETE SET NULL,
  description      TEXT NOT NULL,
  quantity         NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit             TEXT DEFAULT '',
  unit_price       NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total       NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order       INT DEFAULT 0
);

-- ─── RECURRING INVOICES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,               -- label template
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_snapshot  JSONB NOT NULL DEFAULT '{}',
  frequency        TEXT NOT NULL
                   CHECK (frequency IN ('WEEKLY','MONTHLY','QUARTERLY','YEARLY')),
  next_due_date    DATE NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  template_data    JSONB NOT NULL DEFAULT '{}', -- snapshot InvoiceFormValues
  currency         TEXT DEFAULT 'IDR',
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUTO updated_at TRIGGER ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_recurring_updated_at
  BEFORE UPDATE ON recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY (opsional, enable kalau pakai auth) ─
-- ALTER TABLE invoices    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE item_catalog ENABLE ROW LEVEL SECURITY;

-- ─── SAMPLE INDEXES ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date  ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);
