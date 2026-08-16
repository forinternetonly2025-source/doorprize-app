# Mesin Undian Doorprize

Aplikasi web lokal untuk mengundi pemenang doorprize secara acak, dengan Google Sheets sebagai sumber data.

## Cara kerja

1. Sumber data: Google Sheets.
2. Setiap sesi mengambil **10 doorprize** dari sheet **`PUTAR`** (kolom A, mulai baris 2, header di baris 1).
3. Peserta diambil dari sheet **`DATA`** (kolom A, mulai baris 2, header di baris 1).
4. Setiap kali ada pemenang, namanya (beserta doorprize yang didapat) otomatis ditulis ke sheet baru **`MENANG`** (dibuat otomatis kalau belum ada).
5. Nama pemenang otomatis **dihapus** dari sheet `DATA` agar tidak menang dua kali.

## Setup

### 1. Siapkan Google Sheet

Buat/ pakai spreadsheet dengan minimal 2 sheet (tab):

- **`PUTAR`** — kolom A berisi daftar doorprize yang akan diundi. Baris 1 = header (misal `Doorprize`), baris berikutnya = nama/hadiah.
- **`DATA`** — kolom A berisi daftar nama peserta. Baris 1 = header (misal `Nama`), baris berikutnya = nama peserta.

Sheet `MENANG` **tidak perlu dibuat manual** — aplikasi akan membuatnya otomatis saat pemenang pertama keluar, dengan kolom `Doorprize | Nama Pemenang | Waktu`.

Catat **Spreadsheet ID** dari URL sheet:

```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_ADA_DI_SINI/edit
```

### 2. Buat Service Account (Google Cloud)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project baru (atau pakai yang sudah ada).
2. Aktifkan **Google Sheets API**: menu *APIs & Services* → *Library* → cari "Google Sheets API" → *Enable*.
3. Buat service account: *APIs & Services* → *Credentials* → *Create Credentials* → *Service Account*. Beri nama bebas (misal `doorprize-bot`), lanjut sampai selesai (role tidak perlu diisi).
4. Buka service account yang baru dibuat → tab *Keys* → *Add Key* → *Create new key* → pilih **JSON** → file akan terdownload.
5. Simpan file JSON tersebut sebagai:
   ```
   doorprize-app/credentials/service-account.json
   ```
6. Buka file JSON, cari field `client_email` (formatnya seperti `doorprize-bot@nama-project.iam.gserviceaccount.com`).
7. Buka Google Sheet Anda → tombol **Share** → tambahkan email tersebut dengan akses **Editor**.

### 3. Konfigurasi environment

```bash
cd doorprize-app
cp .env.example .env
```

Edit `.env` dan isi minimal:

```
SPREADSHEET_ID=isi_dengan_spreadsheet_id_anda
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json
```

Jika nama sheet/kolom Anda berbeda dari default (`PUTAR`, `DATA`, `MENANG`), sesuaikan juga di `.env`.

### 4. Install & jalankan

```bash
npm install
npm start
```

Buka browser ke [http://localhost:3000](http://localhost:3000).

## Menjalankan sesi undian

1. Klik **"Mulai Undian"** (klik pertama) — aplikasi mengambil 10 doorprize dari sheet `PUTAR` (kalau isi `PUTAR` lebih dari 10, dipilih 10 secara acak) dan menampilkan daftarnya. Undian belum berjalan.
2. Klik **"Mulai Undian"** sekali lagi (klik kedua) — undian berjalan otomatis berurutan dari doorprize 1 sampai 10, nama berputar (efek slot machine) lalu berhenti di pemenang.
3. Cek sheet `MENANG` di Google Sheets — otomatis terisi setiap kali ada pemenang, dan nama tersebut sudah hilang dari sheet `DATA`.
4. Tombol **"Layar Penuh"** memicu mode fullscreen browser, cocok untuk ditampilkan di proyektor/TV saat acara.

## Deploy online (GitHub + Vercel, gratis)

Supaya bisa diakses dari device lain (bukan cuma `localhost`), deploy ke [Vercel](https://vercel.com) lewat GitHub:

### 1. Push ke GitHub

1. Buat repo baru (kosong) di [github.com/new](https://github.com/new) — bisa **Private**.
2. Di folder project ini:
   ```bash
   git remote add origin https://github.com/USERNAME/NAMA_REPO.git
   git branch -M main
   git push -u origin main
   ```

### 2. Connect ke Vercel

1. Buka [vercel.com](https://vercel.com) → daftar/login pakai akun GitHub.
2. **Add New Project** → pilih repo yang baru di-push.
3. Framework preset: biarkan **Other** (tidak perlu build command).
4. Sebelum klik Deploy, buka bagian **Environment Variables** dan tambahkan:
   - `SPREADSHEET_ID` → isi spreadsheet ID Anda
   - `GOOGLE_SERVICE_ACCOUNT_JSON` → **isi keseluruhan** file JSON service account (buka file `credentials/service-account.json`, copy semua isinya apa adanya, paste di sini)
   - (opsional) `PUTAR_SHEET_NAME`, `DATA_SHEET_NAME`, `MENANG_SHEET_NAME`, `PRIZES_PER_SESSION` — hanya kalau berbeda dari default
5. Klik **Deploy**. Setelah selesai, Vercel kasih URL publik (misal `https://nama-project.vercel.app`).

Setiap kali `git push` ke `main`, Vercel otomatis deploy ulang versi terbaru.

### Catatan keamanan

Aplikasi ini **tidak punya proteksi login/PIN** — siapa pun yang tahu URL-nya bisa klik "Mulai Undian" dan itu **benar-benar** menghapus peserta dari `DATA` serta mencatat ke `MENANG`. Jangan sebar URL-nya sebelum saatnya, dan pertimbangkan untuk mematikan project di Vercel (atau redeploy dengan credentials baru) setelah acara selesai.

## Catatan

- Background/logo sudah memakai gambar `public/background.png` — ganti file ini kalau mau ubah tampilan.
- File kredensial (`credentials/*.json`) dan `.env` sudah masuk `.gitignore` — jangan pernah commit ke git/publikasikan. Untuk deploy online, kredensial dimasukkan lewat Environment Variable Vercel (`GOOGLE_SERVICE_ACCOUNT_JSON`), bukan file.
