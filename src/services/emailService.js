// class EmailService {
//     static async sendEmail({ email, subject, text, html }) {
//         try {
//             const mailjet = require('node-mailjet').apiConnect(
//                 process.env.MJ_APIKEY_PUBLIC,
//                 process.env.MJ_APIKEY_PRIVATE
//             );
        
//             const request = mailjet.post('send', { version: 'v3.1' }).request({
//                 Messages: [
//                     {
//                         From: {
//                             Email: process.env.MJ_EMAIL,
//                             Name: process.env.MJ_NAME,
//                         },
//                         To: [
//                             {
//                                 Email: email,
//                             },
//                         ],
//                         Subject: subject,
//                         TextPart: text,
//                         HTMLPart: html,
//                     },
//                 ],
//             });
          
//             return await request.body;
//         } catch (error) {
//           throw new Error(error.message);
//         }
//     }
// };

// module.exports = EmailService;