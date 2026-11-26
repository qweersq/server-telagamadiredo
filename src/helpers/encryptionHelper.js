require('dotenv').config();
const CryptoJS = require('crypto-js');

class EncryptionHelper {
    static ENCRYPT_KEY = process.env.ENCRYPT_KEY;

    static encryptID(id) {
        return CryptoJS.AES.encrypt(
            id.toString(),
            CryptoJS.enc.Hex.parse(this.ENCRYPT_KEY),
            { mode: CryptoJS.mode.ECB }
        ).toString();
    }

    static decryptID(encrypted) {
        return CryptoJS.AES.decrypt(
            encrypted,
            CryptoJS.enc.Hex.parse(this.ENCRYPT_KEY),
            { mode: CryptoJS.mode.ECB }
        ).toString(CryptoJS.enc.Utf8);
    }
}

module.exports = EncryptionHelper;