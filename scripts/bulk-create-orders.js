const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3002';
const API_URL = `${API_BASE_URL}/orders`;
const TOTAL_ORDERS = 49; // Create 49 orders (1 already exists, total will be 50)

// Authentication options - choose one:
// Option 1: Login with email and password (recommended)
const LOGIN_EMAIL = 'your-email@example.com'; // ⚠️ SET YOUR EMAIL HERE
const LOGIN_PASSWORD = 'your-password'; // ⚠️ SET YOUR PASSWORD HERE

// Option 2: Use existing token directly (if you have one)
// Uncomment and set your token if you already have one
let AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjB6cXF5K3gyOXN2cjRQRy82bUxYcGc9PSIsImlhdCI6MTc2Mjk2MDg3MCwiZXhwIjoxNzYzMDQ3MjcwfQ.4bW01-fZ2I-FfYdwqmIcTZ5uQM2spvP_KqJIYjijFZo"; // Set this if you have a token: AUTH_TOKEN = 'your-token-here';

// Option 3: Use special token (if available)
// AUTH_TOKEN = 'katsikatid5740';

// Payload template
const orderPayload = {
    "customer_id": 2638,
    "branch_id": 66,
    "entry_date": "2025-11-12",
    "quantity": 1,
    "order_type": "offline",
    "shift_id": 759,
    "created_by": 113,
    "tenant_id": 151,
    "order_details": [
        {
            "employee_id": 113,
            "treatment_id": 321,
            "item_id": null,
            "discount_id": null,
            "process_time": "regular",
            "process_time_cost": 0,
            "due_date": "2025-11-14",
            "price": 40000,
            "custom_price": null,
            "custom_price_reason": null,
            "final_price": 40000,
            "status": "antrian",
            "description": "",
            "shoes_photos": [],
            "pickup_method": null,
            "delivery_status": "not_yet",
            "delivery_date": null,
            "delivery_time": null
        }
    ],
    "payment": {
        "status": "unpaid",
        "method": "cash",
        "total_discount": 0,
        "final_price": 40000,
        "subtotal": 40000,
        "total_service": 40000,
        "paid_amount": 0,
        "remaining_amount": 40000,
        "additional_cost": 0,
        "due_date": null,
        "notes": "",
        "total_price": 40000,
        "total_process_time_cost": 0,
        "date": "2025-11-12",
        "money": 0,
        "change": 0,
        "evidence_photo": "",
        "payment_details": []
    }
};

// Function to login and get token
async function login() {
    try {
        if (!LOGIN_EMAIL || LOGIN_EMAIL === 'your-email@example.com') {
            throw new Error('Please set LOGIN_EMAIL and LOGIN_PASSWORD in the script');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: LOGIN_EMAIL,
            password: LOGIN_PASSWORD
        });

        if (response.data.success && response.data.data.token) {
            console.log('✅ Login successful');
            return response.data.data.token;
        } else {
            throw new Error('Login failed: No token received');
        }
    } catch (error) {
        console.error('❌ Login error:', error.response?.data?.message || error.message);
        throw error;
    }
}

// Function to create a single order
async function createOrder(orderNumber, authToken) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
        
        const response = await axios.post(API_URL, orderPayload, { headers });
        
        if (response.status === 201) {
            console.log(`✅ Order ${orderNumber}/${TOTAL_ORDERS} created successfully - ID: ${response.data.data?.id || 'N/A'}`);
            return { success: true, orderNumber };
        } else {
            console.log(`⚠️ Order ${orderNumber}/${TOTAL_ORDERS} - Status: ${response.status}`);
            return { success: false, orderNumber, error: `Status: ${response.status}` };
        }
    } catch (error) {
        console.error(`❌ Order ${orderNumber}/${TOTAL_ORDERS} failed:`, error.response?.data?.message || error.message);
        return { success: false, orderNumber, error: error.response?.data?.message || error.message };
    }
}

// Main function
async function bulkCreateOrders() {
    console.log('🚀 Starting bulk order creation...');
    console.log(`📊 Target: Create ${TOTAL_ORDERS} orders`);
    console.log(`🌐 API URL: ${API_URL}\n`);

    // Get authentication token
    let authToken = null;
    
    // Check if AUTH_TOKEN is set (from Option 2 or 3)
    if (AUTH_TOKEN) {
        console.log('🔑 Using provided AUTH_TOKEN...');
        authToken = AUTH_TOKEN;
    } else {
        // Try to login (Option 1)
        console.log('🔑 Logging in to get authentication token...');
        try {
            authToken = await login();
        } catch (error) {
            console.error('❌ Failed to get authentication token. Please:');
            console.error('   1. Set LOGIN_EMAIL and LOGIN_PASSWORD in the script, OR');
            console.error('   2. Set AUTH_TOKEN directly in the script');
            process.exit(1);
        }
    }

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    // Create orders sequentially to avoid overwhelming the server
    for (let i = 1; i <= TOTAL_ORDERS; i++) {
        const result = await createOrder(i, authToken);
        
        if (result.success) {
            results.success++;
        } else {
            results.failed++;
            results.errors.push({
                orderNumber: result.orderNumber,
                error: result.error
            });
        }

        // Small delay between requests to avoid rate limiting
        if (i < TOTAL_ORDERS) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${results.success} orders`);
    console.log(`❌ Failed: ${results.failed} orders`);
    console.log(`📈 Total: ${results.success + results.failed} orders attempted`);
    
    if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach(err => {
            console.log(`   Order ${err.orderNumber}: ${err.error}`);
        });
    }

    console.log('\n✨ Done!');
}

// Run the script
bulkCreateOrders().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});

