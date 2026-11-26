// Template WhatsApp untuk pengiriman invoice

const moment = require('moment-timezone');

function getGreeting() {
    const hour = moment().tz('Asia/Jakarta').hour();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
}

function formatRupiah(amount) {
    if (!amount || isNaN(amount)) return '-';
    return 'Rp' + Number(amount).toLocaleString('id-ID');
}

const BUSINESS_NAME = 'Katsikat';
const CONTACT_INFO = '+62 877-9545-2475';

module.exports = function invoiceWaTemplate({ customerName, orderNumber, amount, totalAmount, totalPaid, remainingAmount, paymentStatus, invoiceUrl, tenantName }) {
    const greeting = getGreeting();
    const status = paymentStatus || (Number(totalPaid || 0) <= 0 ? 'unpaid' : (Number(totalPaid || 0) < Number(totalAmount || amount || 0) ? 'partial' : 'paid'));

    let paymentSection = '';
    if (status === 'unpaid') {
        paymentSection = `
💵 Total Harga: ${formatRupiah(totalAmount || amount)}`;
    } else if (status === 'partial') {
        paymentSection = `
💵 Total Harga: ${formatRupiah(totalAmount || amount)}
✅ Pembayaran Diterima (DP): ${formatRupiah(totalPaid)}
🔁 Sisa: ${formatRupiah(remainingAmount)}

Mohon selesaikan pelunasan sebelum pengambilan/pengiriman barang ya Kak.`;
    } else if (status === 'paid') {
        paymentSection = `
✅ Status: Lunas
💵 Total Pembayaran: ${formatRupiah(totalPaid || totalAmount || amount)}

Terima kasih, tidak ada tagihan yang tersisa.`;
    }


    return `${greeting} Kak ${customerName || ''} 👋

Terima kasih banyak sudah mempercayakan kami di *${tenantName}*! 🙏  
Berikut kami kirimkan detail invoice untuk pesanan *#${orderNumber || '-'}*:
${paymentSection}

Kakak bisa cek detail lengkap pesanan melalui link berikut ya:  
${invoiceUrl}

Kalau ada pertanyaan atau butuh bantuan, silakan hubungi kami.

Semoga hari Kakak menyenangkan!✨

Salam hangat,  
*${tenantName}*`;
}; 