Follow up customer lama dan bautin beberapa penawaran atau reminder sepatu kotor, atau lem dll

ANALISIS FITUR FOLLOW-UP CUSTOMER
1. KONSEP UTAMA
Fitur ini bertujuan untuk:
Meningkatkan retensi customer lama
Mendorong repeat order dengan penawaran yang relevan
Tracking efektivitas follow-up
Mengoptimalkan timing follow-up (1 bulan setelah cuci terakhir)
2. STRUKTUR DATABASE YANG DIBUTUHKAN
Berdasarkan analisis tabel yang ada, saya sarankan membuat tabel baru:

-- Tabel untuk tracking follow-up customer
CREATE TABLE customer_followups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    last_order_id INT NOT NULL,
    last_order_date DATE NOT NULL,
    followup_date DATE NOT NULL,
    followup_type ENUM('cuci', 'reparasi', 'promo', 'reminder') NOT NULL,
    message TEXT,
    status ENUM('pending', 'sent', 'responded', 'converted', 'failed') DEFAULT 'pending',
    response_type ENUM('positive', 'negative', 'neutral', 'no_response') DEFAULT 'no_response',
    converted_order_id INT NULL,
    admin_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (last_order_id) REFERENCES orders(id),
    FOREIGN KEY (converted_order_id) REFERENCES orders(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

3. LOGIKA BISNIS
A. Kriteria Customer untuk Follow-up:
Customer yang sudah 1 bulan tidak cuci (berdasarkan entry_date di tabel orders)
Customer dengan riwayat order minimal 2x (untuk memastikan bukan customer one-time)
Customer dengan status order 'completed' (sudah selesai dan diambil)
B. Jenis Follow-up:
Cuci Regular - Untuk customer yang biasanya cuci sepatu
Reparasi - Untuk customer yang pernah reparasi
Promo Spesial - Penawaran diskon atau paket
Reminder Kondisi - Mengingatkan kondisi sepatu
C. Timing Follow-up:
1 bulan setelah cuci terakhir
2 bulan jika tidak ada response
3 bulan untuk follow-up terakhir

4. IMPLEMENTASI FITUR
A. Backend API Endpoints:
// 1. Get Customer untuk Follow-up
GET /api/followup/customers
- Query: branch_id, followup_type, status

// 2. Create Follow-up
POST /api/followup
- Body: customer_id, followup_type, message, admin_id

// 3. Update Follow-up Status
PUT /api/followup/:id
- Body: status, response_type, converted_order_id

// 4. Get Follow-up History
GET /api/followup/history/:customer_id

// 5. Get Follow-up Statistics
GET /api/followup/statistics


B. Frontend Components:
// 1. Follow-up Dashboard
- List customer yang perlu di-follow-up
- Filter berdasarkan kriteria
- Quick action untuk kirim follow-up

// 2. Follow-up Form
- Pilih customer
- Pilih jenis follow-up
- Custom message
- Preview sebelum kirim

// 3. Follow-up History
- Timeline follow-up per customer
- Response tracking
- Conversion rate