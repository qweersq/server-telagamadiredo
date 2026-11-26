// const WhatsappService = require('../services/whatsappService');
// const { ResponseHelper } = require('../helpers');

// class WhatsappController {
//     static async sendMessage(req, res) {
//         try {
//             const raw = {
//                 phone: req.body.phone,
//                 message: req.body.message
//             };

//             const result = await WhatsappService.sendMessage(raw);
        
//             return res.status(200).send(ResponseHelper.successResponse(result));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };
// };

// module.exports = WhatsappController;