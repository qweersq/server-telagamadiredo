# Analisis OrderController.getAll & Rencana Refactor getAllNew

## Permasalahan pada getAll Saat Ini
- Banyak query param spesifik: `startDate`, `dueStartDate`, `paymentStartDate`, dst.
- Di service & repository, filter diterapkan dengan blok if terpisah untuk masing-masing field/relasi (Order, OrderDetail, PaymentDetail).
- Jika ingin menambah filter baru (misal status order detail), harus menambah blok baru → tidak scalable, banyak perulangan, dan sulit maintain.
- Tidak mendukung filter dinamis/multi-value (misal status order detail: ['on_progress', 'done']).

## Contoh Query Param Lama
```
{
  page: 1,
  pageSize: 10,
  startDate: '2024-07-01',
  endDate: '2024-07-31',
  dueStartDate: '2024-07-01',
  dueEndDate: '2024-07-31',
  paymentStartDate: '2024-07-01',
  paymentEndDate: '2024-07-31',
  search: 'John'
}
```

## Dampak
- Kode di service & repository penuh if/else untuk setiap filter.
- Menambah filter baru = tambah blok baru di banyak tempat.
- Tidak scalable untuk kebutuhan filter yang terus bertambah.

---

## Rencana Refactor: getAllNew
### Tujuan
- Query param filter lebih dinamis, misal: `filter[field]=value`, `filter[order_detail_status]=done`, `filter[status]=paid`, dst.
- Di repository, filter di-parse dan diterapkan ke model/relasi yang sesuai (Order, OrderDetail, Payment, dst) secara fleksibel.
- Mendukung filter multi-value (misal: `filter[order_detail_status]=on_progress,done`).
- Menambah filter status order detail (OrderDetail.status) jadi mudah.
- Return tetap sama persis dengan getAll lama (ada statistics, orders, pagination).

### Contoh Query Param Baru
```
{
  page: 1,
  pageSize: 10,
  filter: {
    entry_date: { gte: '2024-07-01', lte: '2024-07-31' },
    'order_details.status': ['on_progress', 'done'],
    'payment.status': 'paid',
    search: 'John'
  }
}
```

### Langkah Teknis
1. **Controller**: parsing query param filter jadi object dinamis.
2. **Service**: terima object filter, teruskan ke repository.
3. **Repository**: mapping filter ke where/include yang sesuai, support multi-level relasi.
4. **Statistics**: perhitungan tetap sama, hanya sumber data yang lebih fleksibel.
5. **Testing**: pastikan hasil response sama persis dengan getAll lama.

### Catatan Teknis
- Untuk filter relasi (misal order_details.status), perlu include + where di level relasi.
- Untuk filter multi-value, gunakan `[Op.in]`.
- Untuk filter range (tanggal), gunakan `[Op.gte]`, `[Op.lte]`.
- Pastikan pagination, sorting, dan statistik tetap berjalan.

---

## Kesimpulan
Dengan refactor ke getAllNew yang dinamis, penambahan filter baru (termasuk status order detail) akan jauh lebih mudah, scalable, dan maintainable. Kode di controller/service/repository jadi lebih clean dan siap untuk kebutuhan filter yang terus berkembang.

---

*Catatan: File ini dibuat otomatis oleh AI untuk dokumentasi internal pengembangan fitur order getAll yang lebih dinamis.* 