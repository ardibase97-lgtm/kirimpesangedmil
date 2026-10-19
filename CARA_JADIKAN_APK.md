# Panduan Lengkap: Menjadikan Aplikasi "KirimPesan" Sebagai APK Android

Aplikasi **KirimPesan** telah selesai dibangun dengan fitur chatting lengkap mirip WhatsApp (teks, status centang dua biru, indikator sedang mengetik, kirim foto, pesan suara, panggilan telepon, serta video call WebRTC).

Ada **3 cara mudah** untuk menginstalnya di HP Android Anda:

---

## CARA 1: Instal Langsung di HP Android (Paling Cepat / 1 Detik, Tanpa Compile)
Aplikasi ini sudah berstandar **PWA (Progressive Web App)** resmi Google Android:
1. Hubungkan HP Android dan laptop ke satu jaringan WiFi yang sama (atau upload folder ini ke hosting gratis seperti GitHub Pages / Vercel / Netlify).
2. Buka aplikasi di **Google Chrome HP Android Anda**.
3. Ketuk ikon **Titik Tiga (⋮)** di pojok kanan atas browser Chrome.
4. Pilih menu **"Tambahkan ke Layar Utama"** atau **"Instal Aplikasi"**.
5. Ikon **KirimPesan** hijau akan langsung terpasang di menu aplikasi HP Android Anda!
6. Buka aplikasinya — tampilannya akan berjalan **layar penuh (Full Screen)** tanpa bar browser, persis seperti aplikasi APK biasa, sangat ringan dan hemat RAM.

---

## CARA 2: Otomatis Jadi File `.apk` via Cloud GitHub (100% Gratis)
Folder proyek ini sudah dilengkapi konfigurasi **GitHub Actions** (`.github/workflows/build-apk.yml`) yang bisa meng-compile kode menjadi file `.apk` di server cloud gratis:
1. Buat repository baru di [GitHub.com](https://github.com) (gratis).
2. Upload semua file dari folder `aplikasi-chat-android` ini ke repository tersebut.
3. Masuk ke tab **"Actions"** di halaman GitHub Anda.
4. Server cloud akan otomatis merakit kodenya menjadi file **`KirimPesan-app-debug.apk`** dalam waktu sekitar 2–3 menit.
5. Unduh file `.apk` tersebut, kirim ke HP Android Anda lewat WhatsApp atau Bluetooth, lalu ketuk untuk instal langsung!

---

## CARA 3: Convert Langsung Jadi APK via PWABuilder (Alat Resmi Microsoft)
1. Kunjungi situs resmi gratis: [PWABuilder.com](https://www.pwabuilder.com)
2. Masukkan URL website aplikasi Anda (atau upload).
3. Klik **"Package for Android"**.
4. Situs akan langsung men-download paket file `.apk` siap pasang untuk Anda.

---

## Cara Mencoba Aplikasi di Laptop / Komputer Sekarang:
1. Buka folder `aplikasi-chat-android`.
2. Klik dua kali file **`Buka_Aplikasi_Chat.bat`**.
3. Aplikasi akan langsung terbuka di browser Anda dalam tampilan seluler WhatsApp yang rapi, lengkap dengan fitur chat, suara, dan video call!
