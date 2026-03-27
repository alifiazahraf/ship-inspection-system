# Supabase Keep-Alive Setup Guide

## Overview
GitHub Actions workflow untuk mencegah Supabase project terpause karena inactivity (Free tier: pause setelah 7 hari tidak aktif).

## Schedule
- **Interval**: Setiap 3 hari
- **Time**: 09:00 UTC (16:00 WIB)
- **Safety Buffer**: 4 hari (sebelum batas 7 hari)

## Setup Instructions

### 1. Push ke GitHub
Pastikan folder `.github` sudah ter-commit dan push ke repository GitHub:
```bash
git add .github/
git commit -m "Add Supabase keep-alive workflow"
git push origin main
```

### 2. Setup GitHub Secrets
Buka repository GitHub Anda → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Tambahkan 2 secrets berikut:

| Secret Name | Value |
|-------------|-------|
| `REACT_APP_SUPABASE_URL` | `https://kpyvcuycgxfjaceyzees.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (key lengkap) |

> **Note**: Gunakan nama variable yang sama dengan `.env` file Anda untuk konsistensi.

### 3. Manual Trigger (Test)
Untuk testing, Anda bisa manual trigger workflow:
1. Buka GitHub repository → **Actions** tab
2. Klik **"Keep Supabase Alive"** di sidebar
3. Klik **"Run workflow"** dropdown → **"Run workflow"**
4. Tunggu hasil (sekitar 1-2 menit)

### 4. Verifikasi Berjalan
Workflow akan berjalan otomatis:
- **Pertama kali**: 3 hari setelah push ke main
- **Selanjutnya**: Setiap 3 hari sekali

Cek status di: GitHub → Actions → Keep Supabase Alive

## Monitoring

### Success
- Workflow menampilkan ✅ `Keep-alive ping completed successfully`
- Project activity terdeteksi oleh Supabase
- Pause timer (7 hari) di-reset

### Failure
- Workflow menampilkan ❌ dengan error detail
- **Action required**: Cek Supabase dashboard, resume project jika paused
- Workflow akan retry otomatis 3x sebelum mark as failed

## Struktur Files
```
.github/
├── workflows/
│   └── keep-supabase-alive.yml    # Workflow definition
├── scripts/
│   └── ping-supabase.js           # Ping logic (3 fallback methods)
└── KEEP_ALIVE_SETUP.md            # This file
```

## Fallback Methods
Script mencoba 3 metode secara berurutan:
1. **Auth Users Query** - Query table users
2. **Auth Health Check** - Get session status
3. **REST API Health** - Direct REST API call

Jika 1 gagal, otomatis coba method berikutnya (dengan 3 retry masing-masing).

## Resource Usage
- **Runs per month**: ~10 runs
- **Duration per run**: ~1 menit
- **Total minutes/month**: ~10 menit
- **GitHub Actions limit**: 2,000 menit/bulan (free tier)
- **Usage**: < 1% dari limit

## Troubleshooting

### Workflow tidak muncul di Actions tab
- Pastikan file sudah push ke branch `main`
- Cek path file: `.github/workflows/keep-supabase-alive.yml`

### Ping failed tapi Supabase aktif
- Cek GitHub Secrets sudah benar
- Pastikan `REACT_APP_SUPABASE_URL` dan `REACT_APP_SUPABASE_ANON_KEY` terisi

### Secrets tidak terbaca
- Secret name harus EXACT match (case-sensitive)
- Hapus dan buat ulang secret jika perlu

## Notes
- Workflow tidak mengganggu flow aplikasi apapun
- Zero changes ke kode existing
- Bisa di-disable kapan saja dengan hapus file workflow
