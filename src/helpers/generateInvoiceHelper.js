require('dotenv').config();
const MD5 = require('crypto-js/md5');

class GenerateInvoiceHelper {
    static FORMAT_CODE = process.env.FORMAT_CODE || 'KAT';

    static generateOrderCode(customerId, entryDate) {
        const currentDate = entryDate ? new Date(entryDate) : new Date();
        // Format date as YYMMDD (6 digits)
        const year = currentDate.getFullYear().toString().slice(-2);
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}${month}${day}`;
        
        // Much shorter random number (3 digits)
        const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        // Shorter customer hash (first 2 characters)
        const customerHash = MD5(customerId).toString().substring(0, 2);
        
        const orderCode = `${this.FORMAT_CODE}${formattedDate}${randomNumber}${customerHash}`.toUpperCase();
        return orderCode;
    }
}

module.exports = GenerateInvoiceHelper;
