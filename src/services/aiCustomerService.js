const AiCustomerRepository = require('../repositories/aiCustomerRepository');
const { AiHelper } = require('../helpers');

const moment = require('moment');

class AiCustomerService {
    static async analyzeCustomerPattern(customer_id) {
        try {
            const customerData = await AiCustomerRepository.getCustomerWithOrders(customer_id);
            if (!customerData) throw new Error('Customer not found');

            const visitPattern = this.analyzeVisitPattern(customerData.orders);
            const customerType = this.determineCustomerType(visitPattern);

            const aiAnalysisData = await this.generateAIAnalysis(customerData, visitPattern, customerType);

            return {
                customerType,
                visitPattern,
                recommendations: this.generateRecommendations(customerType, visitPattern),
                aiInsights: aiAnalysisData
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async generateAIAnalysis(customerData, visitPattern, customerType) {
        try {
            const prompt = `
Analisis data pelanggan berikut dan berikan insights dalam format HTML yang terstruktur:
${JSON.stringify(customerData)}

Berikan response dalam format HTML dengan struktur berikut:
<div class="ai-analysis">
    <div class="analysis-header">
        <h3>Analisis Data Pelanggan: [Nama Customer]</h3>
        <p class="analysis-intro">[Ringkasan singkat tentang pelanggan]</p>
    </div>
    
    <div class="analysis-section">
        <h4>1. Analisis Perilaku Pelanggan</h4>
        <p>[Analisis detail]</p>
    </div>

    <div class="analysis-section">
        <h4>2. Rekomendasi yang Dipersonalisasi</h4>
        <ul class="recommendations">
            <li>[Rekomendasi 1]</li>
            <li>[Rekomendasi 2]</li>
        </ul>
    </div>

    <div class="analysis-section">
        <h4>3. Strategi Retensi</h4>
        <p>[Strategi detail]</p>
    </div>
</div>`;

            return await AiHelper.generateAIContent(prompt);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static calculateAverageSpending(orders) {
        const validOrders = orders.filter(order => order.payment && order.payment.final_price);
        if (!validOrders.length) return 0;
        
        const totalSpending = validOrders.reduce((sum, order) => 
            sum + parseFloat(order.payment.final_price), 0);
        return (totalSpending / validOrders.length).toFixed(2);
    }

    static getPreferredPaymentMethods(orders) {
        const methodCounts = orders.reduce((acc, order) => {
            if (order.payment && order.payment.method) {
                acc[order.payment.method] = (acc[order.payment.method] || 0) + 1;
            }
            return acc;
        }, {});

        return Object.entries(methodCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([method]) => method)
            .join(', ');
    }

    static analyzeVisitPattern(orders) {
        if (!orders.length) return null;

        const sortedOrders = orders.sort((a, b) => 
            moment(a.createdAt).diff(moment(b.createdAt))
        );

        const intervals = [];
        for (let i = 1; i < sortedOrders.length; i++) {
            intervals.push(
                moment(sortedOrders[i].createdAt).diff(moment(sortedOrders[i-1].createdAt), 'days')
            );
        }

        const discountResponse = this.analyzeDiscountResponse(sortedOrders);
        const seasonalPattern = this.analyzeSeasonalPattern(sortedOrders);

        return {
            totalOrders: orders.length,
            averageInterval: intervals.length ? 
                Math.round(intervals.reduce((a,b) => a + b, 0) / intervals.length) : null,
            lastVisit: moment(sortedOrders[sortedOrders.length - 1].createdAt).format('YYYY-MM-DD'),
            discountResponse,
            seasonalPattern,
            preferredPaymentMethods: this.getPreferredPaymentMethods(orders),
            averageSpending: this.calculateAverageSpending(orders)
        };
    }

    static analyzeSeasonalPattern(orders) {
        const monthlyOrders = orders.reduce((acc, order) => {
            const month = moment(order.createdAt).format('M');
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});

        const highSeasonMonths = Object.entries(monthlyOrders)
            .filter(([, count]) => count > (orders.length / 12))
            .map(([month]) => month);

        return {
            hasSeasonalPattern: highSeasonMonths.length > 0,
            highSeasonMonths
        };
    }

    static determineCustomerType(pattern) {
        if (!pattern) return 'NEW_CUSTOMER';
        
        if (pattern.totalOrders === 1) return 'ONE_TIME';
        
        if (pattern.seasonalPattern.hasSeasonalPattern) return 'SEASONAL';
        if (pattern.averageInterval <= 35) return 'REGULAR_MONTHLY';
        if (pattern.averageInterval <= 65) return 'REGULAR_BIMONTHLY';
        if (pattern.discountResponse.respondToDiscount) return 'DISCOUNT_DRIVEN';
        
        return 'IRREGULAR';
    }

    static analyzeDiscountResponse(orders) {
        const discountVisits = orders.filter(order => 
            order.payment && order.payment.total_discount > 0
        );

        const discountEffectiveness = this.analyzeDiscountEffectiveness(orders, discountVisits);

        return {
            respondToDiscount: discountVisits.length > (orders.length * 0.3),
            totalDiscountUsed: discountVisits.length,
            averageDiscount: discountVisits.length ? 
                discountVisits.reduce((sum, order) => 
                    sum + parseFloat(order.payment.total_discount), 0) / discountVisits.length : 0,
            effectiveness: discountEffectiveness
        };
    }

    static analyzeDiscountEffectiveness(allOrders, discountOrders) {
        if (!discountOrders.length) return 'UNKNOWN';

        const avgTimeBetweenVisits = this.calculateAverageTimeBetweenVisits(allOrders);
        const avgTimeBetweenDiscountVisits = this.calculateAverageTimeBetweenVisits(discountOrders);

        if (avgTimeBetweenDiscountVisits < avgTimeBetweenVisits) return 'HIGH';
        if (avgTimeBetweenDiscountVisits === avgTimeBetweenVisits) return 'MEDIUM';
        return 'LOW';
    }

    static calculateAverageTimeBetweenVisits(orders) {
        if (orders.length < 2) return 0;
        
        const sortedOrders = orders.sort((a, b) => 
            moment(a.createdAt).diff(moment(b.createdAt))
        );

        let totalDays = 0;
        for (let i = 1; i < sortedOrders.length; i++) {
            totalDays += moment(sortedOrders[i].createdAt)
                .diff(moment(sortedOrders[i-1].createdAt), 'days');
        }

        return totalDays / (sortedOrders.length - 1);
    }

    static generateRecommendations(type, pattern) {
        const recommendations = {
            nextVisit: null,
            promotions: [],
            retentionStrategy: null,
            communicationStrategy: null
        };

        switch(type) {
            case 'REGULAR_MONTHLY':
                recommendations.nextVisit = moment(pattern.lastVisit).add(30, 'days').format('YYYY-MM-DD');
                recommendations.promotions = ['Paket Berlangganan Bulanan', 'Diskon Member Reguler'];
                recommendations.retentionStrategy = 'LOYALTY_REWARDS';
                recommendations.communicationStrategy = 'REGULAR_UPDATES';
                break;

            case 'REGULAR_BIMONTHLY':
                recommendations.nextVisit = moment(pattern.lastVisit).add(60, 'days').format('YYYY-MM-DD');
                recommendations.promotions = ['Paket 2 Bulan', 'Early Bird Discount'];
                recommendations.retentionStrategy = 'SCHEDULED_REMINDER';
                recommendations.communicationStrategy = 'PERIODIC_ENGAGEMENT';
                break;

            case 'SEASONAL':
                recommendations.promotions = ['Seasonal Package', 'Pre-season Discount'];
                recommendations.retentionStrategy = 'SEASONAL_ENGAGEMENT';
                recommendations.communicationStrategy = 'SEASONAL_REMINDER';
                break;

            case 'DISCOUNT_DRIVEN':
                recommendations.promotions = [
                    'Flash Sale',
                    'Bundle Discount',
                    `Diskon ${Math.round(pattern.discountResponse.averageDiscount)}%`
                ];
                recommendations.retentionStrategy = 'PROMOTIONAL_OFFERS';
                recommendations.communicationStrategy = 'PROMOTIONAL_ALERTS';
                break;

            default:
                recommendations.promotions = ['Welcome Back Discount', 'Seasonal Promotion'];
                recommendations.retentionStrategy = 'REACTIVATION_CAMPAIGN';
                recommendations.communicationStrategy = 'PERIODIC_REENGAGEMENT';
        }

        return recommendations;
    }
}

module.exports = AiCustomerService;