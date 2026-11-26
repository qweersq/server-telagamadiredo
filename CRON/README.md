# NotaSepatu Simple Cron Jobs


# Run cron jobs
cd CRON
npm start

# Manual testing
npm run test-trial      # Test trial management
npm run test-billing    # Test billing generation
npm run test-overdue    # Test overdue suspension
npm run test-ai-credit  # Test monthly AI credit grant
npm run test-all        # Run all tests

Simple cron jobs system using existing controllers and services. No complex abstractions, just direct method calls.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd CRON
npm install
```

### 2. Run Cron Jobs
```bash
# Start all cron jobs
npm start

# Or run directly
node cron.js
```

### 3. Manual Testing
```bash
# Test individual functions
npm run test-trial    # Test trial management
npm run test-billing  # Test billing generation  
npm run test-overdue  # Test overdue suspension
npm run test-all      # Run all tests
```

## 📅 Scheduled Jobs

### Daily Trial Management (1:00 AM WIB)
- Check expired trials
- Generate billing for trial tenants

### Daily Subscription Management (2:00 AM WIB)
- Check expired subscriptions
- Generate billing for expiring subscriptions

### Daily Overdue Billing Check (3:00 AM WIB)
- Suspend tenants with overdue billing

## 🔧 Manual Testing

```bash
# Test trial management
node cron.js test-trial

# Test billing generation
node cron.js test-billing

# Test overdue suspension
node cron.js test-overdue

# Run all tests
node cron.js test-all
```

## 📊 Features

- **Simple Architecture**: Single file, no complex abstractions
- **Existing Controllers**: Uses existing `BillingService` and `TenantService`
- **Manual Testing**: Easy testing with command line arguments
- **Graceful Shutdown**: Proper signal handling
- **Timezone Support**: Asia/Jakarta timezone
- **Error Handling**: Comprehensive error logging

## 🛑 Stopping

Press `Ctrl+C` to stop the cron jobs gracefully.

## 📝 Logs

All activities are logged with timestamps and clear status indicators:
- ✅ Success operations
- ❌ Error operations  
- 🔄 Process operations
- 📊 Summary statistics

## 🔍 Monitoring

The cron jobs will log:
- Start/end times
- Number of processed items
- Success/error counts
- Detailed operation results

## 🚨 Error Handling

- Individual job failures don't stop other jobs
- All errors are logged with stack traces
- Graceful shutdown on termination signals
- Database connection errors are handled properly
