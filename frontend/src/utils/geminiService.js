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

    // gemini-2.5-flash-image (Nano Banana) is the current image generation model
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image',
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
 * Returns { text, products } where products is an optional array of product cards.
 */
export async function sendChatMessage(history, userMessage, products = []) {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
        return null;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build a product catalog summary for the AI to reference
    const productCatalog = products.slice(0, 60).map(p => ({
        id: p.product_id,
        name: p.name,
        category: p.category,
        price: p.price,
        image: p.images?.find(i => i.is_primary)?.url || p.images?.[0]?.url || '',
        description: p.description || '',
    }));

    const systemContext = `You are "Moda Assistant", a helpful and stylish customer service chatbot for MODA, a premium fashion e-commerce store.
You help customers with: finding products, sizing advice, order tracking, returns, styling tips, and promotions.
Be friendly, concise, and fashion-forward. Use **bold** for emphasis and bullet points with - for lists when helpful.

STORE CATALOG (use this to recommend real products):
${JSON.stringify(productCatalog, null, 2)}

IMPORTANT INSTRUCTIONS FOR PRODUCT RECOMMENDATIONS:
- When a user asks about products, recommendations, or anything you can match to products in the catalog, include a product recommendation section.
- At the END of your response, if you have product recommendations, add this special block (never inside the text):
PRODUCTS_JSON::[{"id":1,"name":"Product Name","price":29.99,"image":"url","category":"Women"}]
- Only include PRODUCTS_JSON if you have relevant product matches from the catalog above.
- The PRODUCTS_JSON must be a valid JSON array. Use only products from the catalog.
- If no products match, do NOT include the PRODUCTS_JSON line.

Available coupon codes: SAVE10 (10% off $50+), WELCOME20 (20% off $80+), MODA15 (15% off $100+).
Shipping is free on orders over $150. Returns accepted within 30 days.`;

    const chat = model.startChat({
        history: [
            { role: 'user', parts: [{ text: systemContext }] },
            { role: 'model', parts: [{ text: 'Understood! I\'m Moda Assistant, ready to help with style advice and product recommendations.' }] },
            ...history.map(m => ({
                role: m.sender_type === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            })),
        ],
    });

    const result = await chat.sendMessage(userMessage);
    const raw = result.response.text();

    // Parse out PRODUCTS_JSON block if present
    const productsMatch = raw.match(/PRODUCTS_JSON::(\[[\s\S]*?\])/);
    let recommendedProducts = [];
    let text = raw;

    if (productsMatch) {
        try {
            recommendedProducts = JSON.parse(productsMatch[1]);
        } catch { /* invalid JSON, ignore */ }
        text = raw.replace(/PRODUCTS_JSON::\[[\s\S]*?\]/, '').trim();
    }

    return { text, products: recommendedProducts };
}

