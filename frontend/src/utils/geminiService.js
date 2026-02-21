import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Converts a File or Blob to a base64 string (without the data: prefix)
 */
export async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // strip "data:image/jpeg;base64," prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Fetches an image from a URL and converts it to base64
 */
export async function urlToBase64(url) {
    // Use a CORS proxy for Unsplash images or direct URLs
    const response = await fetch(url);
    const blob = await response.blob();
    return fileToBase64(blob);
}

/**
 * Virtual try-on using Gemini 2.0 Flash image generation.
 *
 * @param {File}   userPhotoFile   - photo uploaded by the user
 * @param {string} productImageUrl - URL of the product image
 * @param {string} productName     - name of the product
 * @returns {string} base64 image data (png)
 */
export async function virtualTryOn(userPhotoFile, productImageUrl, productName) {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY_MISSING');
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    // gemini-2.0-flash-exp supports image output
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp-image-generation',
        generationConfig: {
            responseModalities: ['image', 'text'],
        },
    });

    const userPhotoB64 = await fileToBase64(userPhotoFile);
    const productImgB64 = await urlToBase64(productImageUrl);

    const prompt = `You are a virtual fashion try-on AI. 
The first image shows a person. 
The second image shows a fashion item: "${productName}".

Please generate a photorealistic image showing the SAME person from the first image naturally wearing the "${productName}" from the second image. 
- Keep the person's face, hair, skin tone, and body shape exactly the same.
- Naturally place the clothing/accessory item on their body.
- Maintain good lighting and photo quality.
- The result should look like a real photo of the person wearing the item.`;

    const result = await model.generateContent([
        { inlineData: { data: userPhotoB64, mimeType: userPhotoFile.type || 'image/jpeg' } },
        { inlineData: { data: productImgB64, mimeType: 'image/jpeg' } },
        prompt,
    ]);

    // Extract the image part from the response
    for (const part of result.response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data; // base64 PNG
        }
    }

    throw new Error('No image returned by Gemini. Try a clearer photo.');
}

/**
 * Send a text chat message to Gemini for the store chatbot.
 */
export async function sendChatMessage(history, userMessage) {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
        // Fallback to mock responses when no key is set
        return null;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemContext = `You are "Moda Assistant", a helpful customer service chatbot for MODA, a premium fashion e-commerce store.
You help customers with: finding products, sizing advice, order tracking, returns, styling tips, and promotions.
Be friendly, concise, and fashion-forward. Keep responses under 3 sentences unless a detailed answer is needed.
Available coupon codes: SAVE10 (10% off $50+), WELCOME20 (20% off $80+), MODA15 (15% off $100+).
Shipping is free on orders over $150. Returns accepted within 30 days.`;

    const chat = model.startChat({
        history: [
            { role: 'user', parts: [{ text: systemContext }] },
            { role: 'model', parts: [{ text: 'Understood! I\'m ready to help MODA customers.' }] },
            ...history.map(m => ({
                role: m.sender_type === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            })),
        ],
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
}
