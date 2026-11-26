require('dotenv').config({ path: './.env' });
const FinanceRepository = require('./src/repositories/financeRepository');

async function test() {
    try {
        console.log("=== Testing branch_id = 1 ===");
        const reportWithBranch = await FinanceRepository.getFinancialReport({
            month: 6,
            year: 2026,
            tenant_id: 1,
            branch_id: 1
        });
        console.log("Branch 1 Summary:", reportWithBranch.summary);
        console.log("Branch 1 Account Balances Count:", reportWithBranch.account_balances?.length);

        console.log("\n=== Testing branch_id = null ===");
        const reportAllBranches = await FinanceRepository.getFinancialReport({
            month: 6,
            year: 2026,
            tenant_id: 1,
            branch_id: null
        });
        console.log("All Branches Summary:", reportAllBranches.summary);
        console.log("All Branches Account Balances Count:", reportAllBranches.account_balances?.length);
    } catch (err) {
        console.error("Error running test:", err);
    }
}

test().then(() => process.exit(0));
