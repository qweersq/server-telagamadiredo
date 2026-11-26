const bcrypt = require('bcrypt');

// Get password from command line argument
const password = process.argv[2];

if (!password) {
    console.log('❌ Usage: node generate-password-hash.js <password>');
    console.log('Example: node generate-password-hash.js password123');
    process.exit(1);
}

async function generateHash() {
    try {
        // Trim whitespace dari password
        const cleanPassword = password.trim();
        const saltRounds = 10;
        
        // Generate hash (sama seperti di UserService.create dan UserService.update)
        const hash = await bcrypt.hash(cleanPassword, saltRounds);
        
        // VERIFY: Test compare untuk memastikan hash benar
        const isValid = await bcrypt.compare(cleanPassword, hash);
        
        if (!isValid) {
            console.error('❌ ERROR: Hash verification failed! Hash tidak valid.');
            process.exit(1);
        }
        
        console.log('\n✅ Password Hash Generated & Verified:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Password (plain):', cleanPassword);
        console.log('Password length:', cleanPassword.length);
        console.log('Hash (bcrypt):', hash);
        console.log('Hash length:', hash.length);
        console.log('Salt rounds:', saltRounds);
        console.log('✅ Verification: PASSED (hash bisa di-compare dengan password)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Escape single quote untuk SQL
        const escapedHash = hash.replace(/'/g, "''");
        
        console.log('📋 SQL Query untuk update:');
        console.log(`UPDATE users SET password = '${escapedHash}' WHERE email = 'EMAIL_TENANT@example.com';\n`);
        
        console.log('💡 Tips:');
        console.log('   1. Ganti EMAIL_TENANT@example.com dengan email tenant yang benar');
        console.log('   2. Pastikan tidak ada whitespace di password saat login');
        console.log('   3. Setelah update, coba login dengan password:', cleanPassword);
        console.log('');
        
    } catch (error) {
        console.error('❌ Error generating hash:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

generateHash();

