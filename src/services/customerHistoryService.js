const CustomerHistoryRepository = require('../repositories/customerHistoryRepository');

class CustomerHistoryService {
    async getCustomerHistory(data) {
        try {
            const statistics = await CustomerHistoryRepository.getCustomerStatistics(
                data.customer_id,
                data.filters.startDate,
                data.filters.endDate
            );

            const transactions = await CustomerHistoryRepository.getCustomerTransactionHistory(
                data.customer_id,
                data.page,
                data.limit,
                data.filters
            );

            const result = {
                statistics: statistics,
                transactions: transactions
            }

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = CustomerHistoryService;