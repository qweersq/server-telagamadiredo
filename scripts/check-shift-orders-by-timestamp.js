const mysql = require('mysql2/promise');

async function main() {
    const shiftId = process.argv[2];

    if (!shiftId) {
        console.error('Usage: node scripts/check-shift-orders-by-timestamp.js <shift_id>');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'notaapp',
        password: 'NotaApp123!',
        database: 'notasepatu_new',
    });

    const [orders] = await connection.execute(
        `SELECT 
            id AS order_id,
            shift_id,
            branch_id,
            tenant_id,
            payment_id,
            entry_date,
            createdAt,
            updatedAt
        FROM orders
        WHERE shift_id = ? AND deletedAt IS NULL
        ORDER BY createdAt ASC, id ASC;`,
        [shiftId]
    );

    if (orders.length === 0) {
        console.log(`No active orders found for shift_id ${shiftId}.`);
        await connection.end();
        return;
    }

    const [shiftRows] = await connection.execute(
        `SELECT id, branch_id, tenant_id, start_time, end_time, createdAt, updatedAt
         FROM shifts
         WHERE id = ?`,
        [shiftId]
    );

    const shift = shiftRows[0];

    console.log(`Shift ${shiftId} window:`);
    console.table([{
        id: shift?.id || shiftId,
        start_time: shift?.start_time || '(not found)',
        end_time: shift?.end_time || '(open)',
        createdAt: shift?.createdAt || '(not found)',
        updatedAt: shift?.updatedAt || '(not found)'
    }]);

    const startTime = shift?.start_time ? new Date(shift.start_time) : null;
    const endTime = shift?.end_time ? new Date(shift.end_time) : null;

    const categorized = orders.map(order => {
        const createdAt = new Date(order.createdAt);
        let status = 'inside';

        if (!startTime) {
            status = 'unknown (no shift start_time)';
        } else if (createdAt < startTime) {
            status = 'before shift start';
        } else if (endTime && createdAt > endTime) {
            status = 'after shift end';
        }

        return { ...order, status };
    });

    const totalOrders = categorized.length;
    const insideOrders = categorized.filter(o => o.status === 'inside').length;
    const outsideOrders = totalOrders - insideOrders;

    console.log('\nOrders currently tagged to shift:');
    console.table(categorized.map(o => ({
        order_id: o.order_id,
        createdAt: o.createdAt,
        entry_date: o.entry_date,
        status: o.status
    })));

    const timestampsMap = categorized.reduce((acc, order) => {
        const ts = new Date(order.createdAt).toISOString();
        acc[ts] = (acc[ts] || 0) + 1;
        return acc;
    }, {});

    console.log('\nSummary:');
    console.table([{
        shift_id: shiftId,
        current_orders: totalOrders,
        expected_inside: insideOrders,
        flagged_outside: outsideOrders,
        unique_createdAt: Object.keys(timestampsMap).length
    }]);

    if (outsideOrders > 0) {
        console.log('\nOrders potentially mis-tagged (outside shift window):');
        console.table(categorized.filter(o => o.status !== 'inside').map(o => ({
            order_id: o.order_id,
            createdAt: o.createdAt,
            status: o.status
        })));
    }

    console.log('\nCounts per createdAt timestamp:');
    Object.entries(timestampsMap)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .forEach(([timestamp, count]) => {
            console.log(`  ${timestamp} -> ${count} order(s)`);
        });

    await connection.end();
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});

