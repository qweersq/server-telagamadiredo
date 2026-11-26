# Catatan Best Practice Pengambilan Data Status Order Detail (Untuk Frontend)

## 1. **Operasional Harian (Dashboard Teknisi, Kasir, Kurir, dll)**
- **Ambil data berdasarkan status TERKINI order detail**
- **Gunakan filter:**
  - `filter[order_details.status]=not_yet` (untuk antrian/teknisi)
  - `filter[order_details.status]=pengeringan` (untuk kasir)
  - `filter[order_details.status]=siap` (untuk kurir/pengambilan)
- **Endpoint:**
  - `GET /api/orders/getAllNew?filter[order_details.status]=<status>`
- **Kelebihan:**
  - Cepat, simple, dan langsung dapat kondisi sekarang (real-time)
  - Tidak perlu join ke log/status history

## 2. **Tracking/History Perubahan Status (Audit, Laporan, Monitoring)**
- **Ambil data dari log perubahan status**
- **Gunakan endpoint khusus log:**
  - `GET /api/order-detail-status-log?filter[new_status]=<status>&filter[created_at][gte]=<tanggal>`
- **Kelebihan:**
  - Bisa tahu siapa yang update, kapan, dan histori perubahan status
  - Cocok untuk laporan harian, audit, atau monitoring perubahan

## 3. **Filter Tanggal (Opsional)**
- Untuk dashboard harian, bisa tambahkan filter tanggal jika perlu:
  - `filter[entry_date]=2025-07-23` (order masuk tanggal tertentu)
  - `filter[order_details.due_date]=2025-07-23` (deadline pengerjaan)
- Untuk log, gunakan `created_at` di log status

## 4. **Multi-value Status**
- Bisa ambil banyak status sekaligus:
  - `filter[order_details.status]=not_yet,on_progress`

## 5. **Kesimpulan**
- **FE cukup filter status order detail di endpoint utama untuk kebutuhan operasional.**
- **Untuk kebutuhan tracking perubahan, gunakan endpoint log status.**
- **Backend sudah support filter dinamis, tinggal manfaatkan query param sesuai kebutuhan.**

---

*Catatan: File ini untuk dokumentasi komunikasi ke frontend agar pengambilan data status order detail lebih optimal dan efisien sesuai fitur backend terbaru.* 