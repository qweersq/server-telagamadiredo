const AiDetectionService = require('../services/aiDetectionService');
const AiCreditService = require('../services/AiCreditService');
const { ResponseHelper } = require('../helpers');

class AiDetectionController {
    static async detectItems(req, res) {
        try {
            const { photos, treatments, user_prompt } = req.body;
            const tenant_id = req.user.tenant_id;

            if (!photos || !Array.isArray(photos) || photos.length === 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Minimal 1 foto diperlukan'));
            }

            if (!treatments || !Array.isArray(treatments) || treatments.length === 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Daftar treatment diperlukan'));
            }

            const results = await AiDetectionService.detectItems(
                photos,
                treatments,
                user_prompt || '',
                tenant_id
            );

            // Deduct 1 credit after successful detection (skip for PREMIUM)
            if (req.aiCredit && req.aiCredit.tier !== 'PREMIUM') {
                const itemCount = results?.length || 0;
                await AiCreditService.deductCredit(
                    tenant_id,
                    `AI Batch Detection - ${itemCount} items detected`
                ).catch(err => {
                    console.error('⚠️ Credit deduction failed (non-blocking):', err.message);
                });
            }

            return res.status(200).send(ResponseHelper.successResponse({
                items: results,
                total_items: results.length
            }));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async detectItemDetails(req, res) {
        try {
            const { photos, user_prompt } = req.body;
            const tenant_id = req.user.tenant_id;

            console.log('🔵🔵 /ai/detect-item-details - INCOMING REQUEST:', {
                photosCount: photos?.length,
                photos: photos?.map(p => p.substring(0, 60)),
                userPrompt: user_prompt?.substring(0, 100),
                tenant_id
            });

            if (!photos || !Array.isArray(photos) || photos.length === 0) {
                console.log('🔴 /ai/detect-item-details - Validation failed: no photos');
                return res.status(400).send(ResponseHelper.errorResponse('Minimal 1 foto diperlukan'));
            }

            const results = await AiDetectionService.detectItemDetails(
                photos,
                user_prompt || '',
                tenant_id
            );

            // Deduct 1 credit after successful detection (skip for PREMIUM)
            if (req.aiCredit && req.aiCredit.tier !== 'PREMIUM') {
                const itemCount = results?.length || 0;
                await AiCreditService.deductCredit(
                    tenant_id,
                    `AI Item Detail - ${itemCount} items detected`
                ).catch(err => {
                    console.error('⚠️ Credit deduction failed (non-blocking):', err.message);
                });
            }

            console.log('🔵🔵 /ai/detect-item-details - RESPONSE:', {
                total_items: results?.length,
                items: results?.map(r => ({ id: r.id, name: r.item?.name, matched: r.matched_items?.length }))
            });

            return res.status(200).send(ResponseHelper.successResponse({
                items: results,
                total_items: results.length
            }));
        } catch (error) {
            console.error('🔴 /ai/detect-item-details - ERROR:', error.message, error.stack?.substring(0, 300));
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = AiDetectionController;
