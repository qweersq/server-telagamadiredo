/**
 * Helper functions for phone number formatting and validation
 */

/**
 * Clean and format Indonesian phone number for WhatsApp
 * Normalize to international format (62XXXXXXXXX)
 * @param {string} phone - Raw phone number (can be 08XX, 628XX, +628XX, etc)
 * @returns {string} - Normalized phone number (62XXXXXXXXX) or empty string if invalid
 */
function cleanPhoneNumber(phone) {
    if (!phone) return '';
    
    // Convert to string and trim
    let cleaned = String(phone).trim();
    
    // Remove spaces, dashes, parentheses
    cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
    
    // Handle +62 prefix before removing non-digits
    if (cleaned.startsWith('+62')) {
        cleaned = cleaned.replace('+', '');
    }
    
    // Remove all non-digit characters (except already handled +)
    cleaned = cleaned.replace(/[^0-9]/g, '');
    
    // Normalize Indonesian phone number to 62XXXXXXXXX format
    if (cleaned.startsWith('08')) {
        // 08XX → 628XX
        cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8') && cleaned.length >= 9) {
        // 8XX → 628XX (if at least 9 digits)
        cleaned = '62' + cleaned;
    } else if (cleaned.startsWith('62')) {
        // Already in 62XX format, keep as is
        // Already formatted correctly
    } else if (cleaned.length >= 9) {
        // If doesn't start with 0, 8, or 62 but has enough digits, assume it's missing country code
        // Add 62 prefix
        cleaned = '62' + cleaned;
    }
    
    return cleaned;
}

/**
 * Normalize referral phone number for searching and saving
 * Ensures consistent format for database lookup and storage
 * @param {string} phone - Referral phone number (can be any format)
 * @returns {string|null} - Normalized phone number (62XXXXXXXXX) or null if invalid
 */
function normalizeReferralPhone(phone) {
    if (!phone) return null;
    
    const normalized = cleanPhoneNumber(phone);
    
    // Validate: Indonesian phone should be 62 + 8-12 digits = 10-14 total digits
    if (normalized.length >= 10 && normalized.length <= 14 && normalized.startsWith('62')) {
        return normalized;
    }
    
    // Return null if invalid format
    return null;
}

/**
 * Validate Indonesian phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function validatePhoneNumber(phone) {
    if (!phone) return false;
    
    // Clean the phone number first
    const cleaned = cleanPhoneNumber(phone);
    
    // Indonesian phone numbers should be 10-13 digits after country code
    // 62 + 8-12 digits = 10-14 total digits
    const phoneRegex = /^62[0-9]{8,12}$/;
    
    return phoneRegex.test(cleaned);
}

/**
 * Format phone number for display (add spaces for readability)
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number for display
 */
function formatPhoneForDisplay(phone) {
    const cleaned = cleanPhoneNumber(phone);
    
    if (cleaned.length >= 10) {
        // Format: +62 812 3456 7890
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`;
    }
    
    return `+${cleaned}`;
}

module.exports = {
    cleanPhoneNumber,
    normalizeReferralPhone,
    validatePhoneNumber,
    formatPhoneForDisplay
};
