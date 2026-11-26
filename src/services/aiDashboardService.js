const AiDashboardRepository = require('../repositories/aiDashboardRepository');
const { AiHelper } = require('../helpers');

class AiDashboardService {
    static async generateAnalysis(startDate, endDate) {
        const businessPerformance = await AiDashboardRepository.getBusinessPerformance(startDate, endDate);
        const treatmentAnalysis = await AiDashboardRepository.getTreatmentAnalysis(startDate, endDate);
        const customerAnalysis = await AiDashboardRepository.getCustomerAnalysis(startDate, endDate);

        const aiAnalysis = await this._generateAIAnalysis({
            businessPerformance,
            treatmentAnalysis,
            customerAnalysis,
            period: { startDate, endDate }
        });

        return {
            period: { startDate, endDate },
            metrics: {
                businessPerformance,
                treatmentAnalysis,
                customerAnalysis
            },
            insights: aiAnalysis
        };
    }

    static async _generateAIAnalysis(data) {
        try {
            const prompt = `
Analisis data bisnis berikut dan berikan insights dalam format HTML yang terstruktur:
${JSON.stringify(data, null, 2)}

Berikan response dalam format HTML dengan struktur berikut:
<div class="ai-analysis">
    <div class="analysis-header">
        <h3>Analisis Performa Bisnis</h3>
        <p class="analysis-intro">[Ringkasan singkat performa bisnis]</p>
    </div>
    
    <div class="analysis-section">
        <h4>1. Tren Utama</h4>
        <p>[Analisis tren revenue, orders, dan pertumbuhan]</p>
    </div>

    <div class="analysis-section">
        <h4>2. Analisis Treatment</h4>
        <ul class="treatment-insights">
            <li>[Insight treatment terlaris]</li>
            <li>[Analisis kategori]</li>
        </ul>
    </div>

    <div class="analysis-section">
        <h4>3. Analisis Customer</h4>
        <p>[Analisis perilaku customer]</p>
        <ul class="customer-insights">
            <li>[Insight customer baru vs returning]</li>
            <li>[Rekomendasi retensi]</li>
        </ul>
    </div>

    <div class="analysis-section">
        <h4>4. Rekomendasi</h4>
        <ul class="recommendations">
            <li>[Rekomendasi 1]</li>
            <li>[Rekomendasi 2]</li>
            <li>[Rekomendasi 3]</li>
        </ul>
    </div>
</div>`;

            return await AiHelper.generateAIContent(prompt);
        } catch (error) {
            console.error('AI Analysis Error:', error.message);
            return "AI Analysis tidak tersedia saat ini";
        }
    }
}

module.exports = AiDashboardService;