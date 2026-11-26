const crypto = require('crypto');

const key = process.env.AES_SECRET_KEY;
if (!key || key.length !== 32) {
  throw new Error('AES_SECRET_KEY env harus ada dan 32 karakter (256 bit)');
}

function encryptAes(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  // Gabungkan iv dan encrypted, pisahkan dengan :
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptAes(encrypted) {
  const [ivHex, encryptedHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports = { encryptAes, decryptAes }; 