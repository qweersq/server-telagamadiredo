# Reminder API Documentation

## 1. GET /reminders
Ambil daftar reminder customer (order yang perlu diingatkan admin).

### Endpoint
```
GET /reminders
```

### Query Parameters
- `category` _(optional)_: Filter kategori reminder
    - `belum-diambil` | `belum-lunas` | `keterlambatan` | `jadwal-antar`
- `search` _(optional)_: Cari berdasarkan nama customer atau nomor order

### Contoh Request
```
GET /reminders?category=belum-diambil&search=Bela
```

### Contoh Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-001",
      "customer": {
        "id": 2,
        "name": "Bela",
        ...
      },
      "status": "selesai",
      "due_date": "2025-07-22",
      "finished_at": "2025-07-19",
      "remaining_payment": 20000,
      "priority": "medium",
      "updatedAt": "2025-07-22T10:00:00.000Z"
    },
    ...
  ]
}
```

### Catatan
- Endpoint ini akan selalu diupdate jika ada perubahan route/fitur baru.
- Untuk request lain (preview, kirim, dsb) akan ditambahkan di bawah jika sudah tersedia.

---

_Last updated: 2025-07-29_ 