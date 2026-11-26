/**
 * Script untuk fix final_price di order_details yang lama
 * Menghitung ulang berdasarkan price dan discount
 */

require('dotenv').config({ path: '.env' });
const { Sequelize } = require('sequelize');

// Setup database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
);

async function fixFinalPrices() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected!\n');

    // Query semua order_details dengan JOIN ke discounts
    console.log('📊 Fetching order_details with discounts...');
    const [orderDetails] = await sequelize.query(`
      SELECT 
        od.id,
        od.price,
        od.final_price,
        od.discount_id,
        d.type as discount_type,
        d.discount as discount_value
      FROM order_details od
      LEFT JOIN discounts d ON od.discount_id = d.id
      WHERE od.deletedAt IS NULL
      ORDER BY od.id DESC
    `);

    console.log(`📦 Found ${orderDetails.length} order_details\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    console.log('🔧 Processing order_details...\n');

    for (const od of orderDetails) {
      const basePrice = parseFloat(od.price) || 0;
      let discountAmount = 0;
      let newFinalPrice = basePrice;

      // Calculate discount
      if (od.discount_id && od.discount_type && od.discount_value) {
        const discountValue = parseFloat(od.discount_value) || 0;
        
        if (od.discount_type === 'percent') {
          discountAmount = basePrice * (discountValue / 100);
        } else if (od.discount_type === 'nominal') {
          discountAmount = discountValue;
        }
        
        newFinalPrice = Math.max(basePrice - discountAmount, 0);
      }

      const currentFinalPrice = parseFloat(od.final_price) || 0;

      // Update jika final_price berbeda (toleransi 0.01 untuk floating point)
      if (Math.abs(currentFinalPrice - newFinalPrice) > 0.01) {
        await sequelize.query(`
          UPDATE order_details 
          SET final_price = :newFinalPrice 
          WHERE id = :id
        `, {
          replacements: { newFinalPrice, id: od.id }
        });

        console.log(`✅ ID ${od.id}: ${currentFinalPrice} → ${newFinalPrice} (discount: ${discountAmount})`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   Total records: ${orderDetails.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run script
fixFinalPrices();

