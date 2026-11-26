# Memorize: Invoice Digital (Tokenized Public Invoice)

## Ringkasan Fitur
- Invoice digital dapat diakses publik, tapi WAJIB pakai token unik.
- Token di-generate otomatis setiap order baru, disimpan di tabel invoice_tokens.
- Invoice diakses via endpoint dengan token, hanya data order terkait yang diambil.
- Jika order diubah, invoice ikut berubah (real-time, validasi di tempat lain).
- Pengiriman invoice ke customer hanya bisa di-trigger admin (setelah dicek).
- Tracking akses: setiap akses invoice dicatat di tabel invoice_access_logs (token, order_id, timestamp, ip, user_agent, customer_id/email jika login).
- Tidak ada pembayaran online.
- Token berlaku selamanya (tidak expired).
- Notifikasi otomatis dibuat ketika order_id baru dibuat.

## Struktur Tabel
- invoice_tokens: id, order_id, token, status, createdAt, updatedAt, deletedAt
- invoice_access_logs: id, invoice_token_id, order_id, accessed_at, ip_address, user_agent, customer_id, email, createdAt, updatedAt, deletedAt

## Flow Utama
1. Admin input order → sistem generate token & simpan ke invoice_tokens.
2. Admin bisa trigger kirim invoice ke customer (setelah dicek).
3. User/customer akses link invoice (GET /invoice/:token) → sistem validasi token, ambil data order, tampilkan invoice.
4. Setiap akses invoice, sistem insert log ke invoice_access_logs.
5. Invoice selalu update jika order berubah.

## Catatan
- Tracking akses bisa tahu berapa kali & siapa saja yang akses (jika login).
- Token harus cukup random/unik.
- Fitur lain (QR code, bulk invoice, dsb) bisa ditambah jika dibutuhkan. 

## Catatan Route

### Route Minimal (Wajib)
1. **GET /invoice/:token**  
   Tampilkan invoice digital (public, pakai token)
2. **POST /invoice/:token/send**  
   Kirim invoice ke customer (admin only)
3. **GET /invoice/:token/access-logs**  
   Lihat log akses invoice (admin only)

### Route Opsional
- **POST /invoice/generate/:orderId** (manual generate token)
- **GET /invoice/:token/access-count** (jumlah akses)
- **PATCH /invoice/:token/status** (update status token)
- **GET /invoice/:token/validate** (cek validitas token)
- **GET /invoice/:token/download** (download PDF)

> Untuk keamanan, route admin-only harus pakai middleware auth/admin. Semua akses invoice (GET /invoice/:token) harus otomatis insert log ke invoice_access_logs. 

## Catatan Implementasi
- Sudah dibuat:
  - **invoiceRepository.js** (findByToken, createAccessLog, getAccessLogsByToken)
  - **invoiceService.js** (getInvoiceByToken, logInvoiceAccess, getInvoiceAccessLogs)
  - **invoiceController.js** (getInvoiceByToken, sendInvoice, getInvoiceAccessLogs)
- Semua sudah siap untuk dihubungkan ke routes. 

## Catatan Grouping Order Detail (FE Response)
- Di database: 1 order detail = 1 layanan (treatment) + 1 item.
- Di response invoice (FE):
  - Order detail harus digrouping berdasarkan kombinasi: treatment/layanan, process time, dan diskon yang sama.
  - 1 group = 1 layanan (treatment) + 1 process time + 1 diskon, items = [item1, item2, ...] yang punya kombinasi sama.
  - Jadi, jika ada layanan sama tapi process time atau diskon beda, tetap dipisah group-nya.
- Tujuannya: tampilan invoice lebih ringkas, mudah dibaca, dan sesuai kebutuhan bisnis.
- Data di DB tetap granular (1 layanan 1 item), tapi response JSON sudah diolah agar grouping sesuai kebutuhan FE/invoice. 

## Catatan Penting Update (Juli 2024)
- Sudah ada route dan logic untuk trigger pengiriman invoice ke customer by order id:
  - **POST /invoice/send-by-order-id** (khusus admin, pakai AuthMiddleware)
  - Controller: sendInvoiceByOrderId
  - Service: findTokenByOrderId
- Sudah ada route dan logic untuk update status invoice token:
  - **PATCH /invoice/:token/status** (update status, misal: sent)
  - Controller: updateInvoiceStatus
  - Service: updateInvoiceTokenStatus
- Semua endpoint sensitif sudah pakai AuthMiddleware dan role admin (role 1).
- Pengiriman invoice ke customer bisa di-trigger dari web admin hanya dengan order id. 
- Admin bisa cek/preview url invoice digital sebelum dikirim ke customer:
  - **GET /invoice/url-by-order-id?order_id=123** (khusus admin)
  - Controller: getInvoiceUrlByOrderId
  - Service: findTokenByOrderId
- Seluruh flow utama (create order, cek url, kirim invoice, fetch data, logging) sudah tercover di backend. 

## Catatan Keamanan Response (AES Encryption)
- Response endpoint GET /invoice/:token sekarang di-encrypt dengan AES-256 (CBC) sebelum dikirim ke FE.
- Menggunakan helper: encryptAesHelper.js (fungsi encryptAes, decryptAes)
- Kunci diambil dari env: AES_SECRET_KEY (harus 32 karakter/256 bit)
- Contoh di .env:
  AES_SECRET_KEY=12345678901234567890123456789012
- Frontend WAJIB melakukan dekripsi dengan kunci yang sama untuk mendapatkan data asli.
- Tujuan: mencegah data invoice mudah di-inspect di network tab/browser.
- Untuk keamanan maksimal, jangan share kunci ke publik dan gunakan kunci random di production. 