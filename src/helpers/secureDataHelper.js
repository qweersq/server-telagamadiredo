const crypto = require('crypto');

// Secret key untuk signature (harus sama dengan frontend)
const SIGNATURE_SECRET = process.env.SIGNATURE_SECRET || 'notaapp5740-secure-signature-2024-ultra-secure-key-for-hmac-sha256-encryption';

if (!SIGNATURE_SECRET || SIGNATURE_SECRET.length < 32) {
  throw new Error('SIGNATURE_SECRET env harus ada dan minimal 32 karakter (256 bit)');
}
/**
 * Generate signature untuk data
 * @param {object} data - Data yang akan di-sign
 * @returns {string} - Signature
 */
const generateSignature = (data) => {
  const dataString = JSON.stringify(data);
  return crypto.createHmac('sha256', SIGNATURE_SECRET).update(dataString).digest('hex');
};

/**
 * Verify signature
 * @param {object} data - Data yang akan di-verify
 * @param {string} signature - Signature yang diberikan
 * @returns {boolean} - True jika signature valid
 */
const verifySignature = (data, signature) => {
  try {
    const expectedSignature = generateSignature(data);
    return expectedSignature === signature;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
};

/**
 * Encrypt data dengan signature
 * @param {object} data - Data yang akan di-encrypt
 * @returns {string} - Encrypted data dengan signature
 */
const encryptSecureData = (data) => {
  try {
    // Generate signature
    const signature = generateSignature(data);
    
    // Tambahkan signature ke data
    const dataWithSignature = {
      ...data,
      signature: signature,
      timestamp: Date.now()
    };
    
    // Encrypt data dengan signature menggunakan AES (compatible dengan CryptoJS)
    const dataString = JSON.stringify(dataWithSignature);
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(SIGNATURE_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(dataString, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // Convert to URL-safe Base64 untuk menghindari masalah URL
    encrypted = encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    // Combine IV and encrypted data (format: iv|encrypted untuk menghindari konflik dengan Base64)
    encrypted = iv.toString('hex') + '|' + encrypted;
    
    console.log('🔐 Backend - Data encrypted with signature:', {
      originalData: data,
      signature: signature,
      encrypted: encrypted.substring(0, 50) + '...'
    });
    
    return encrypted;
  } catch (error) {
    console.error('❌ Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data dan verify signature
 * @param {string} encryptedData - Encrypted data
 * @returns {object|null} - Decrypted data jika valid, null jika tidak valid
 */
const decryptSecureData = (encryptedData) => {
  try {
    // Decrypt data (compatible dengan CryptoJS)
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(SIGNATURE_SECRET).digest();
    const parts = encryptedData.split('|');
    const iv = Buffer.from(parts[0], 'hex');
    let encrypted = parts[1];
    // Convert from URL-safe Base64 back to regular Base64
    encrypted = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (encrypted.length % 4) {
      encrypted += '=';
    }
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    const dataWithSignature = JSON.parse(decrypted);
    
    // Extract signature dan data
    const { signature, timestamp, ...originalData } = dataWithSignature;
    
    // Verify signature
    if (!verifySignature(originalData, signature)) {
      console.error('❌ Invalid signature');
      return null;
    }
    
    // Check timestamp (optional: expire after 1 hour)
    const now = Date.now();
    const dataAge = now - timestamp;
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    if (dataAge > maxAge) {
      console.error('❌ Data expired');
      return null;
    }
    
    console.log('✅ Backend - Data decrypted and verified:', {
      originalData: originalData,
      signature: signature,
      timestamp: new Date(timestamp).toISOString(),
      age: Math.round(dataAge / 1000) + ' seconds'
    });
    
    return originalData;
  } catch (error) {
    console.error('❌ Error decrypting data:', error);
    return null;
  }
};

module.exports = {
  encryptSecureData,
  decryptSecureData,
  verifySignature,
  generateSignature
};
