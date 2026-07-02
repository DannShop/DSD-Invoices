#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# WildanInvoice — Update Script
# Extract ZIP baru dan timpa ke project yang sudah ada
# ═══════════════════════════════════════════════════════════════
#
# CARA PAKAI:
# 1. Taruh file ZIP (wildan-invoice-FINAL-v4.zip) di folder yang
#    SAMA dengan file update.sh ini
# 2. Buka terminal di VS Code, arahkan ke folder project lo
#    (folder yang ada package.json, src/, dll)
# 3. Copy file update.sh ini ke ROOT folder project lo
# 4. Jalankan:
#      bash update.sh
#
# APA YANG DILAKUKAN SCRIPT INI:
# - Backup semua file project lo saat ini ke folder .backup-TIMESTAMP/
# - Extract ZIP baru ke folder sementara
# - Timpa HANYA file source code (src/, config files)
# - TIDAK menyentuh: node_modules/, .env, .git/, .gitignore lo sendiri
# - Kasih ringkasan file apa aja yang berubah
#
# ═══════════════════════════════════════════════════════════════

set -e  # Stop kalau ada error

# ── Warna buat output biar enak dibaca ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  WildanInvoice — Update Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# ── 1. Cari file ZIP di folder ini ──
ZIP_FILE=$(find . -maxdepth 1 -name "wildan-invoice*.zip" | head -n 1)

if [ -z "$ZIP_FILE" ]; then
  echo -e "${RED}❌ Tidak ditemukan file ZIP (wildan-invoice*.zip) di folder ini.${NC}"
  echo -e "${YELLOW}   Pastikan file ZIP ada di folder yang sama dengan update.sh${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Ditemukan ZIP: ${ZIP_FILE}${NC}"

# ── 2. Validasi ini folder project yang benar ──
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ File package.json tidak ditemukan.${NC}"
  echo -e "${YELLOW}   Pastikan kamu menjalankan script ini dari ROOT folder project${NC}"
  echo -e "${YELLOW}   (folder yang sama dengan package.json, src/, dll)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Folder project valid (package.json ditemukan)${NC}"
echo ""

# ── 3. Backup dulu sebelum timpa apapun ──
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR=".backup-${TIMESTAMP}"

echo -e "${YELLOW}📦 Membuat backup ke ${BACKUP_DIR}/ ...${NC}"
mkdir -p "$BACKUP_DIR"

# Backup semua source code (bukan node_modules, .git, backup lama)
for item in src index.html package.json tailwind.config.ts tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js README.md; do
  if [ -e "$item" ]; then
    cp -r "$item" "$BACKUP_DIR/" 2>/dev/null || true
  fi
done

echo -e "${GREEN}✅ Backup selesai${NC}"
echo ""

# ── 4. Extract ZIP ke folder temporary ──
TEMP_DIR=".update-temp"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo -e "${YELLOW}📂 Mengekstrak ZIP...${NC}"
unzip -q "$ZIP_FILE" -d "$TEMP_DIR"

# Cari folder root hasil ekstrak (biasanya wildan-invoice-code/)
EXTRACTED_ROOT=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "wildan-invoice*" | head -n 1)

if [ -z "$EXTRACTED_ROOT" ]; then
  echo -e "${RED}❌ Struktur ZIP tidak sesuai — tidak ditemukan folder wildan-invoice-code/${NC}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo -e "${GREEN}✅ Ekstrak selesai${NC}"
echo ""

# ── 5. Timpa file — HANYA source code, BUKAN node_modules/.env/.git ──
echo -e "${YELLOW}🔄 Menimpa file project...${NC}"
echo ""

CHANGED_FILES=()

# Fungsi untuk copy dan track perubahan
sync_item() {
  local src="$1"
  local name="$2"

  if [ -e "$EXTRACTED_ROOT/$src" ]; then
    rm -rf "./$src"
    cp -r "$EXTRACTED_ROOT/$src" "./$src"
    CHANGED_FILES+=("$name")
  fi
}

# Folder src/ — semua source code React/TS
sync_item "src" "src/ (semua komponen, pages, utils, store)"

# Config files
sync_item "index.html" "index.html"
sync_item "package.json" "package.json"
sync_item "tailwind.config.ts" "tailwind.config.ts"
sync_item "tsconfig.json" "tsconfig.json"
sync_item "tsconfig.node.json" "tsconfig.node.json"
sync_item "vite.config.ts" "vite.config.ts"
sync_item "postcss.config.js" "postcss.config.js"
sync_item "README.md" "README.md"

# ── PENTING: .env dan .gitignore TIDAK ditimpa ──
if [ -f "$EXTRACTED_ROOT/.env.example" ] && [ ! -f "./.env.example" ]; then
  cp "$EXTRACTED_ROOT/.env.example" "./.env.example"
  CHANGED_FILES+=(".env.example (baru ditambahkan)")
fi

echo -e "${GREEN}✅ File berhasil ditimpa${NC}"
echo ""

# ── 6. Bersihkan folder temporary ──
rm -rf "$TEMP_DIR"

# ── 7. Ringkasan ──
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  RINGKASAN UPDATE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}File/folder yang diupdate:${NC}"
for f in "${CHANGED_FILES[@]}"; do
  echo -e "  ${GREEN}✓${NC} $f"
done
echo ""
echo -e "${YELLOW}TIDAK disentuh (aman):${NC}"
echo -e "  ${YELLOW}•${NC} node_modules/"
echo -e "  ${YELLOW}•${NC} .env (kredensial Supabase/Resend kamu)"
echo -e "  ${YELLOW}•${NC} .git/ (history commit)"
echo -e "  ${YELLOW}•${NC} .gitignore"
echo ""
echo -e "${BLUE}Backup tersimpan di:${NC} ${BACKUP_DIR}/"
echo -e "${YELLOW}(Kalau ada masalah, restore manual dari folder ini)${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Langkah selanjutnya:${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "  1. npm install    ${YELLOW}(kalau ada dependency baru)${NC}"
echo -e "  2. npm run dev"
echo -e "  3. Cek app di localhost:5173"
echo ""
echo -e "${BLUE}Kalau semua OK, hapus folder backup:${NC}"
echo -e "  rm -rf ${BACKUP_DIR}"
echo ""
echo -e "${BLUE}Kalau mau commit ke GitHub:${NC}"
echo -e "  git add ."
echo -e "  git commit -m \"Update: Apple UI style + QRIS semi-dinamis + email\""
echo -e "  git push"
echo ""