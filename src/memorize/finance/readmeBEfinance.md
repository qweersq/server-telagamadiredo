# Backend Finance Feature - Implementation Steps

## 1. API Endpoints yang Dibutuhkan

### Daily Transactions API (Menggunakan FinanceTransaction)
- `GET /api/finance/daily-transactions` - Ambil semua transaksi harian (income + expense)
- Query params: `type=income|expense|all`, `date`, `start_date`, `end_date`, `period`
- Include source details (order info untuk income, expense info untuk expense)

### Daily Summary API
- `GET /api/finance/daily-summary` - Ringkasan harian (total income, expense, profit)
- Support daily, weekly, monthly view
- Kalkulasi otomatis dari FinanceTransaction

### Expense Management API
- `POST /api/finance/expense` - Tambah pengeluaran baru (otomatis create FinanceTransaction)
- `PUT /api/finance/expense/:id` - Edit pengeluaran
- `DELETE /api/finance/expense/:id` - Hapus pengeluaran

### Period Selection API
- `GET /api/finance/periods` - Data untuk calendar picker (daily/weekly/monthly)

### Transaction Detail API
- `GET /api/finance/transaction/:id/detail` - Detail lengkap transaksi + source info

## 2. Files yang Perlu Dibuat

### Controllers
- `financeController.js` - Handle semua logic finance

### Services  
- `financeService.js` - Business logic untuk kalkulasi dan query FinanceTransaction

### Repositories
- `financeRepository.js` - Database queries untuk FinanceTransaction dengan joins

### Routes
- `financeRoutes.js` - Define semua finance endpoints

## 3. Database Queries (Menggunakan FinanceTransaction)

### Income Transactions Query
```sql
SELECT 
  ft.id, ft.final_amount, ft.date, ft.description,
  fc.name as category_name, fa.name as account_name,
  pd.method as payment_method,
  o.id as order_id, o.entry_date, o.order_type,
  c.name as customer_name, c.phone as customer_phone
FROM finance_transactions ft
JOIN finance_categories fc ON ft.category_id = fc.id
JOIN finance_accounts fa ON ft.account_id = fa.id
LEFT JOIN payment_details pd ON ft.id = pd.transaction_id
LEFT JOIN payments p ON pd.payment_id = p.id
LEFT JOIN orders o ON p.id = o.payment_id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE fc.type = 'credit' 
AND DATE(ft.date) = :date
ORDER BY ft.date DESC
```

### Expense Transactions Query
```sql
SELECT 
  ft.id, ft.final_amount, ft.date, ft.description,
  fc.name as category_name, fa.name as account_name,
  e.name as expense_name, e.payment_method
FROM finance_transactions ft
JOIN finance_categories fc ON ft.category_id = fc.id
JOIN finance_accounts fa ON ft.account_id = fa.id
LEFT JOIN expenses e ON ft.id = e.transaction_id
WHERE fc.type = 'debit'
AND DATE(ft.date) = :date
ORDER BY ft.date DESC
```

### Profit Calculation
- Sum final_amount dari FinanceTransaction dengan category type 'credit' = Income
- Sum final_amount dari FinanceTransaction dengan category type 'debit' = Expense
- Income - Expense = Profit

## 4. Response Format

### Daily Transactions Response
```json
{
  "success": true,
  "data": {
    "period": "daily",
    "date": "2025-01-15",
    "transactions": [
      {
        "id": 1,
        "type": "income",
        "amount": 500000,
        "date": "2025-01-15T10:30:00Z",
        "description": "Pembayaran order #123",
        "category_name": "Pendapatan Order",
        "account_name": "Cash",
        "source": {
          "order_id": 123,
          "customer_name": "John Doe",
          "order_type": "reparasi",
          "payment_method": "cash"
        }
      },
      {
        "id": 2,
        "type": "expense", 
        "amount": 100000,
        "date": "2025-01-15T14:20:00Z",
        "description": "Bayar listrik",
        "category_name": "Operasional",
        "account_name": "Bank BCA",
        "source": {
          "expense_name": "Bayar Listrik",
          "payment_method": "bank_transfer"
        }
      }
    ]
  }
}
```

### Daily Summary Response
```json
{
  "success": true,
  "data": {
    "period": "daily",
    "date": "2025-01-15",
    "total_income": 2500000,
    "total_expense": 800000,
    "profit": 1700000,
    "profit_percentage": 68,
    "transaction_count": {
      "income": 5,
      "expense": 3
    }
  }
}
```

## 5. Implementation Priority

1. **Phase 1**: Query FinanceTransaction + daily summary calculation
2. **Phase 2**: Transaction detail dengan source info (order/expense)
3. **Phase 3**: Period filtering + calendar API
4. **Phase 4**: Optimization + caching

## 6. Keunggulan Menggunakan FinanceTransaction

- **Single Source of Truth**: Semua transaksi di satu tempat
- **Otomatis Terintegrasi**: Payment & Expense sudah create FinanceTransaction
- **Kategorisasi Otomatis**: Income/Expense berdasarkan category type
- **Audit Trail Lengkap**: History transaksi lengkap
- **Balance Tracking**: Saldo account otomatis terupdate
- **Source Tracking**: Bisa lihat asal transaksi (order mana, expense apa)

## 7. Notes

- Gunakan existing FinanceTransaction model sebagai basis
- Income = FinanceTransaction dengan category type 'credit'
- Expense = FinanceTransaction dengan category type 'debit'  
- Include source details untuk tracking asal transaksi
- Support mobile-first dengan response yang simple
- Focus pada performance untuk query yang sering dipanggil
- jika membaut file service, atau controller, sesuaikan dengan resposne di file service atau controller yang lain, jangan buat sendiri

