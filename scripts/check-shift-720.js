const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'hadad123',
        database: 'notasepatu',
    });

    const [rows] = await connection.execute(
        `SELECT 
            o.id AS order_id,
            o.branch_id,
            o.tenant_id,
            o.shift_id,
            o.payment_id,
            p.final_price
        FROM orders o
        LEFT JOIN payments p ON p.id = o.payment_id
        WHERE o.shift_id = ? AND o.tenant_id = ? AND o.branch_id = ? AND o.deletedAt IS NULL
        ORDER BY o.id;`,
        [shiftId, tenantId, branchId]
    );

    console.table(rows);

    const totalRevenue = rows.reduce((sum, row) => sum + parseFloat(row.final_price || 0), 0);
    console.log(`Total revenue: ${totalRevenue.toFixed(2)}`);

    const ordersWithoutPayment = rows.filter(row => !row.payment_id).map(row => row.order_id);
    if (ordersWithoutPayment.length) {
        console.log('Orders tanpa payment_id:', ordersWithoutPayment.join(', '));
    }

    await connection.end();
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});

