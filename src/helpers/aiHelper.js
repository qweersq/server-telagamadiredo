require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const aiModel = process.env.GEMINI_AI_MODEL;
const geminiApiKey = process.env.GEMINI_API_KEY;
const GEMINI_AI_ACTIVE = process.env.GEMINI_AI_ACTIVE.toLowerCase() === 'true';
const genAI = new GoogleGenerativeAI(geminiApiKey);

class AiHelper {
    static async generateAIContent(prompt) {
        if (!GEMINI_AI_ACTIVE) return "-";

        try {
            const model = genAI.getGenerativeModel({ model: aiModel });
            const result = await model.generateContent(prompt);
            const response = result.response ? await result.response : {};

            return this.cleanAIResponse(response.text ? response.text() : '-');
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async generateVisionContent(photos, prompt) {
        if (!GEMINI_AI_ACTIVE) return "-";
        if (!photos || photos.length === 0) throw new Error('No photos provided');

        try {
            const model = genAI.getGenerativeModel({ model: aiModel });

            console.log('🧠 aiHelper - generateVisionContent: fetching', photos.length, 'photos...');
            console.log('🧠 aiHelper - Photo URLs:', JSON.stringify(photos.map(u => u.substring(0, 60))));

            // Fetch each photo, convert to base64, and create image parts
            const imageParts = await Promise.all(photos.map(async (photoUrl) => {
                console.log('🧠 aiHelper - Fetching image:', photoUrl.substring(0, 80));
                const base64Data = await this.fetchImageAsBase64(photoUrl);
                console.log('🧠 aiHelper - Image fetched, base64 length:', base64Data.length);
                return {
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/jpeg'
                    }
                };
            }));

            console.log('🧠 aiHelper - All images fetched, calling Gemini...');

            // Combine prompt with all image parts
            const result = await model.generateContent([prompt, ...imageParts]);
            console.log('🧠 aiHelper - Gemini responded');
            const response = result.response ? await result.response : {};

            const cleaned = this.cleanAIResponse(response.text ? response.text() : '-');
            console.log('🧠 aiHelper - Cleaned response (first 500 chars):', cleaned.substring(0, 500));
            return cleaned;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async fetchImageAsBase64(url) {
        try {
            const https = require('https');
            const http = require('http');

            return new Promise((resolve, reject) => {
                const protocol = url.startsWith('https') ? https : http;
                console.log('🧠 aiHelper - fetchImageAsBase64:', url.substring(0, 80));
                
                protocol.get(url, { timeout: 30000 }, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        console.log('🧠 aiHelper - Redirect to:', response.headers.location.substring(0, 80));
                        return this.fetchImageAsBase64(response.headers.location).then(resolve).catch(reject);
                    }

                    if (response.statusCode !== 200) {
                        console.error('❌ aiHelper - fetchImageAsBase64: HTTP', response.statusCode, 'for', url.substring(0, 60));
                        reject(new Error(`Failed to fetch image: HTTP ${response.statusCode}`));
                        return;
                    }

                    const chunks = [];
                    response.on('data', (chunk) => chunks.push(chunk));
                    response.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        console.log('🧠 aiHelper - Image fetched OK:', url.substring(0, 60), '- size:', buffer.length, 'bytes');
                        resolve(buffer.toString('base64'));
                    });
                    response.on('error', (err) => {
                        console.error('❌ aiHelper - Stream error for', url.substring(0, 60), ':', err.message);
                        reject(err);
                    });
                }).on('error', (err) => {
                    console.error('❌ aiHelper - Request error for', url.substring(0, 60), ':', err.message);
                    reject(err);
                });
            });
        } catch (error) {
            console.error('❌ aiHelper - fetchImageAsBase64 exception:', error.message);
            throw new Error(`Failed to fetch image: ${error.message}`);
        }
    }

    static cleanAIResponse(text) {
        if (!text) return '';
    
        return text
            .replace(/^```html\n?/g, '')
            .replace(/\n?```$/g, '')
            .replace(/\n?<\/div>\n?```$/g, '')
            .replace(/\n?<\/div>\n?```\n?$/g, '')
            .trim();
    }
}

module.exports = AiHelper;