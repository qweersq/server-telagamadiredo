class ItemDoneWaTemplate {
    static perItem({ customerName, itemName, orderNumber }) {
        return (
            `Halo Kak ${customerName}, 👋\n\n` +
            `Item *${itemName}* dari pesanan *#${orderNumber}* sudah selesai kami kerjakan dan siap diambil. 😊\n\n` +
            `Kakak mau ambil langsung ke toko atau ingin kami jadwalkan untuk pengantaran ke rumah?\n\n` +
            `Terima kasih sudah mempercayakan kami di *Katsikat*! 🙏`
        );
    }

    static allDone({ customerName, orderNumber }) {
        return (
            `Halo Kak ${customerName}, 👋\n\n` +
            `Semua item dari pesanan *#${orderNumber}* sudah selesai kami kerjakan dan siap diambil. 😊\n\n` +
            `Kakak mau ambil langsung ke toko atau ingin kami jadwalkan untuk pengantaran ke rumah?\n\n` +
            `Terima kasih sudah mempercayakan kami di *Katsikat*! 🙏`
        );
    }
}

module.exports = ItemDoneWaTemplate; 