// const axios = require('axios');

// class WhatsappService {
//     static async sendMessage({ phoneNumber, message }) {
//         try {
//             const apiUrl = process.env.WATZAP_URL;
//             const apiKey = process.env.WATZAP_API_KEY;
//             const numberKey = process.env.WATZAP_NUMBER_KEY;
        
//             const dataSending = {
//                 api_key: apiKey,
//                 number_key: numberKey,
//                 phone_no: phoneNumber,
//                 message: message,
//             };
          
//             const response = await axios.post(apiUrl, dataSending, {
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//             });
        
//             return response.data;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }
// };

// module.exports = WhatsappService;

const axios = require('axios');
const FormData = require('form-data');

const API_HOST_WA = process.env.API_HOST_WA || 'https://api-thesis.katsikat.id';
const TIMEOUT_WA = parseInt(process.env.API_TIMEOUT_WA) || 5000;

const instance = axios.create({
  baseURL: API_HOST_WA,
  timeout: TIMEOUT_WA,
});

const WhatsappService = {
  sendMessage: async (to, text) => {
    try {
      const response = await instance.post('/send-message', { to, text });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw error;
    }
  },

  sendMessageWithFile: async (to, text, file) => {
    try {
      const formData = new FormData();
      formData.append('to', to);
      if (text) formData.append('text', text);
      formData.append('file', file.buffer, file.originalname);

      const response = await instance.post('/send-message-with-file', formData, {
        headers: { 
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error sending message with file:', error.response?.data || error.message);
      throw error;
    }
  },
};

module.exports = WhatsappService;