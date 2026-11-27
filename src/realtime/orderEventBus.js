const { EventEmitter } = require('events');

/**
 * Bus event pesanan baru.
 *
 * Dipakai oleh endpoint SSE (`GET /notifications/orders/stream`) supaya layar
 * operasional (dapur, kasir, antrian) bisa langsung berbunyi saat ada pesanan
 * masuk tanpa perlu polling agresif.
 *
 * Sengaja process-local: satu instance Node = satu bus. Kalau nanti backend
 * dijalankan multi-instance, ganti bagian ini dengan Redis pub/sub tanpa
 * mengubah pemanggilnya.
 */
class OrderEventBus {
  constructor() {
    this.emitter = new EventEmitter();
    // Satu layar bisa membuka beberapa tab; jangan sampai kena warning.
    this.emitter.setMaxListeners(0);
  }

  /**
   * @param {(payload: object) => void} listener
   * @returns {() => void} fungsi untuk berhenti berlangganan
   */
  subscribe(listener) {
    this.emitter.on('order:created', listener);
    return () => this.emitter.off('order:created', listener);
  }

  publishOrderCreated(payload) {
    this.emitter.emit('order:created', payload);
  }
}

module.exports = new OrderEventBus();
