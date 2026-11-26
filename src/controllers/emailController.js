// const EmailService = require('../services/emailService');
// const { ResponseHelper } = require('../helpers');

// class EmailController {
//     static async sendNotification(req, res) {
//         try {
//             const raw = {
//                 email: req.body.email,
//                 subject: req.body.subject,
//                 text: req.body.text,
//                 html: req.body.html,
//             };

//             const result = await EmailService.sendEmail(raw);
        
//             return res.status(200).send(ResponseHelper.successResponse(result));
//           } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//           }
//     };
// };

// module.exports = EmailController;