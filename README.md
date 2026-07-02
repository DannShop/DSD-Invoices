# 💼 WildanInvoice

Invoice generator personal — offline-first, ringan di RAM 4GB, bisa cloud sync ke Supabase.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Bundler | Vite 5 |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| Forms | React Hook Form + Zod |
| PDF | jsPDF + html2canvas |
| Storage | localStorage (Phase 1-2) + Supabase (Phase 3) |
| Import/Export | xlsx (SheetJS) + custom CSV parser |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Jalankan dev server
npm run dev
# → Buka browser: http://localhost:5173

# 3. Build untuk production
npm run build
```

---

## ☁️ Setup Cloud Sync (Opsional — Phase 3)

### 1. Buat Supabase Project
- Daftar di [supabase.com](https://supabase.com) (free tier)
- Buat project baru, pilih region Singapore

### 2. Jalankan SQL Migration
- Buka **SQL Editor** di Supabase dashboard
- Copy-paste isi file `src/lib/migration.sql`
- Klik **Run**

### 3. Setup Environment Variables
```bash
# Copy file contoh
cp .env.example .env

# Edit .env dengan kredensial dari Supabase
# Project Settings → API → copy URL dan anon key
```

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### 4. Restart Dev Server
```bash
# Ctrl+C lalu:
npm run dev
```

Sekarang buka menu **Cloud Sync** di sidebar — kalau hijau berarti sudah terhubung!

---

## 📁 Struktur Folder

```
src/
├── types/          → TypeScript interfaces (Invoice, Client, dll)
├── schemas/        → Zod validation schemas
├── store/          → Zustand stores (invoice, client, item, recurring)
├── utils/          → format, storage, pdfGenerator, importExport, recurringUtils
├── lib/            → supabase client, syncService, migration.sql
├── components/
│   ├── layout/     → Sidebar
│   └── ui/         → Modal, StatusBadge, ConfirmDialog, EmptyState, FormModals
└── pages/
    ├── Dashboard.tsx
    ├── CreateInvoice.tsx
    ├── InvoiceDetail.tsx
    ├── HistoryPage.tsx
    ├── ClientsPage.tsx
    ├── ItemCatalogPage.tsx
    ├── RecurringPage.tsx
    ├── ImportExportPage.tsx
    ├── CloudSyncPage.tsx
    └── Settings.tsx
```

---

## 🗺️ Roadmap

| Phase | Status | Fitur |
|-------|--------|-------|
| Phase 1 | ✅ Done | Form invoice, PDF export, Settings, localStorage |
| Phase 2 | ✅ Done | Client CRUD, Item Catalog, Invoice History, Filter |
| Phase 3 | ✅ Done | Recurring invoice, Import CSV/Excel, Export, Cloud Sync |

---

## 💡 Tips RAM 4GB

- Pakai Vite (bukan CRA) — jauh lebih ringan
- Tutup tab browser yang tidak perlu saat develop
- Disable VS Code extension yang tidak dipakai
- localStorage untuk storage utama = zero RAM overhead dari server
- Import `xlsx` di-lazy load hanya saat dibutuhkan

---

Dibuat dengan ❤️ + Claude AI
