const OrderEventBus = require('../realtime/orderEventBus');

// Jeda heartbeat. Proxy/ponsel sering memutus koneksi diam; komentar SSE
// (`: ping`) cukup untuk menjaga socket tetap hidup tanpa mengirim data.
const HEARTBEAT_MS = 25000;

const toNumberSet = (values) => {
  const set = new Set();
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) set.add(num);
  });
  return set;
};

class NotificationController {
  /**
   * GET /notifications/orders/stream
   *
   * Server-Sent Events untuk notifikasi pesanan baru. Browser mengirim token
   * lewat query string (`?token=...`) karena `EventSource` tidak bisa
   * menetapkan header Authorization.
   */
  static streamOrderEvents(req, res) {
    const user = req.user;
    if (!user) {
      return res.status(401).send('Unauthorized');
    }

    const tenantId = Number(user.tenant_id);
    const branchId = Number(user.branch_id);
    // Supervisor sudah dinormalkan menjadi 'superadmin' oleh AuthMiddleware.
    const isTenantWide = user.role === 'superadmin' || user.role === 'supervisor';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // matikan buffering di nginx
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const send = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send('ready', { tenant_id: tenantId, branch_id: branchId, role: user.role });

    const unsubscribe = OrderEventBus.subscribe((payload) => {
      if (Number(payload.tenantId) !== tenantId) return;

      if (!isTenantWide) {
        // Bunyi hanya kalau cabang user ikut terlibat: sebagai cabang penjual
        // atau sebagai dapur produksi (mis. order Cafe 2 dimasak di Cafe 1).
        const involved = toNumberSet([
          payload.sellingBranchId,
          ...(payload.productionBranchIds || []),
        ]);
        if (!involved.has(branchId)) return;
      }

      send('order:created', payload);
    });

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, HEARTBEAT_MS);

    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
      try {
        res.end();
      } catch {
        // koneksi sudah putus, abaikan
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('error', cleanup);
  }
}

module.exports = NotificationController;
