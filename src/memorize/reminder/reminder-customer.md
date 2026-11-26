buat planning fitur Reminder Customer di Admin (Mobile Friendly) dengan konsep trigger manual (ada tombol kirim), supaya tetap ada kontrol & double-check sebelum pesan terkirim ke WA.

Tujuan Fitur
Memberikan daftar pengingat yang otomatis di-generate sistem (berdasarkan kondisi order).

Admin tetap punya kontrol penuh → bisa cek dulu sebelum mengirimkan pesan WA.

Mobile friendly agar admin bisa akses kapan saja (misalnya dari HP).

Struktur & Komponen Utama
1. Halaman: "Reminder Customer"
Tampilan utama: List card (mobile friendly).

Filter & Kategori:

Belum Diambil → Pesanan selesai > 3 hari, belum diambil.

Belum Lunas → Status selesai tapi masih ada sisa pembayaran.

Keterlambatan Order → Pesanan masih diproses tapi sudah lewat due date estimasi.

Jadwal Antar → Order yang harus dikirim (berdasarkan jadwal kirim).

Search → by nama pelanggan / nomor order.

2. Elemen List Item
Setiap card/list item:

Nama Pelanggan (Bela)

No Order & Status (#ORD-001 / Selesai)

Alasan Reminder (misal: "Sudah 3 hari belum diambil")

Due Date / Tanggal terakhir update

Button kirim pesan WA → (pakai template WA sesuai kategori).

Button detail order → buka detail order jika perlu cek dulu.

3. Prioritas Reminder
Beri indikator warna atau icon:

Merah (High) → Keterlambatan parah, pesanan overdue > 2 hari atau pembayaran tertunda lama.

Kuning (Medium) → Belum diambil > 3 hari, belum lunas tapi baru lewat 1–2 hari.

Hijau (Normal) → Reminder untuk pengambilan hari ini (misalnya jadwal antar).

4. Workflow Manual Trigger
Sistem auto-generate list berdasarkan kondisi order.

Admin masuk halaman Reminder → lihat list (diurutkan dari prioritas tinggi ke rendah).

Klik tombol WA → pop-up muncul (preview pesan WA).

Admin bisa edit (optional) → lalu klik "Kirim".

Sistem buka link WA API ke nomor pelanggan → pesan terkirim.

Kategori Pesan (Template)
Pengingat Ambil Sepatu
"Halo Kak ${name}, sepatu pesanan #${orderNumber} sudah selesai sejak ${dateFinish}, namun belum diambil. Mau dijadwalkan antar atau ambil ke toko? 🙏"

Pengingat Pelunasan
"Halo Kak ${name}, kami mengingatkan pesanan #${orderNumber} masih ada sisa pembayaran ${amount}. Mohon segera dilunasi agar sepatu bisa segera diambil 🙏"

Konfirmasi Keterlambatan
"Halo Kak ${name}, mohon maaf, pesanan #${orderNumber} mengalami keterlambatan karena ${reason}. Estimasi selesai ${newDate}. Apakah Kakak berkenan menunggu?"

Jadwal Antar
"Halo Kak ${name}, kami mau mengantarkan pesanan #${orderNumber} sesuai jadwal hari ini. Apakah lokasi dan jam pengiriman masih sama?"

Tampilan Mobile (Wireframe Sederhana)
Tab Menu (Bottom Navigation)
Dashboard | Order | Reminder | Profile

Reminder Page
Filter (Dropdown): Semua | Belum Diambil | Belum Lunas | Keterlambatan | Jadwal Antar

List Card:

yaml
Copy
Edit
[ICON PRIORITAS]  Bela (ORD-001)
Alasan: Sudah 3 hari belum diambil
Status: Selesai, Total: Rp120.000
Due: 22 Juli 2025
[Detail]   [Kirim Pesan WA]
Keuntungan
Kontrol penuh: admin bisa review dulu.

Hemat waktu: tidak harus cek order satu-satu.

Profesional: pelanggan merasa diingatkan secara personal tapi cepat.