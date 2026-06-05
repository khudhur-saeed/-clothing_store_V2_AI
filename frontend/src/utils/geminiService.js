import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const TRY_ON_MODEL_OVERRIDE = import.meta.env.VITE_GEMINI_TRYON_MODEL;
const TRY_ON_MODEL_CANDIDATES = [
    TRY_ON_MODEL_OVERRIDE,
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.5-flash-image-preview',
].filter(Boolean);

function normalizeModelName(name) {
    return String(name || '').replace(/^models\//, '').trim();
}

async function discoverImageModelCandidates() {
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(API_KEY)}`;
        const response = await fetch(listUrl);
        if (!response.ok) {
            return [];
        }
        const payload = await response.json();
        const models = Array.isArray(payload?.models) ? payload.models : [];
        return models
            .filter((m) => {
                const methods = m?.supportedGenerationMethods || [];
                const name = String(m?.name || '').toLowerCase();
                return methods.includes('generateContent') && name.includes('image');
            })
            .map((m) => normalizeModelName(m.name))
            .filter(Boolean);
    } catch {
        return [];
    }
}

function isModelNotFoundError(err) {
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('is not found') || msg.includes('not supported for generatecontent');
}

function isQuotaOrRateLimitError(err) {
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('[429') || msg.includes('quota exceeded') || msg.includes('rate limit');
}

function extractRetrySeconds(err) {
    const msg = String(err?.message || '');
    const directMatch = msg.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
    if (directMatch) return Math.ceil(Number(directMatch[1]));

    const retryInfoMatch = msg.match(/"retryDelay":"([0-9]+)s"/i);
    if (retryInfoMatch) return Number(retryInfoMatch[1]);

    return null;
}

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
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Direct image fetch failed (${response.status})`);
        }
        const blob = await response.blob();
        return fileToBase64(blob);
    } catch {
        // Fallback: backend fetch avoids browser CORS restrictions for external image hosts.
        const proxyUrl = `http://localhost:8000/api/ai/image-base64?url=${encodeURIComponent(url)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (!proxyResponse.ok) {
            const detail = await proxyResponse.text();
            throw new Error(`Product image fetch failed: ${detail}`);
        }
        const payload = await proxyResponse.json();
        if (!payload?.data) {
            throw new Error('Product image fetch failed: empty response');
        }
        return payload.data;
    }
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Local fallback preview when Gemini quota is exhausted.
 * It creates a branded side-by-side image so users can still continue the flow.
 */
export async function virtualTryOnDemo(userPhotoFile, productImageUrl, productName) {
    const userB64 = await fileToBase64(userPhotoFile);
    const productB64 = await urlToBase64(productImageUrl);

    const userImg = await loadImageFromDataUrl(`data:${userPhotoFile.type || 'image/jpeg'};base64,${userB64}`);
    const productImg = await loadImageFromDataUrl(`data:image/jpeg;base64,${productB64}`);

    const width = 900;
    const height = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0e0f14';
    ctx.fillRect(0, 0, width, height);

    // Left side: user photo
    ctx.drawImage(userImg, 0, 0, width / 2, height - 110);

    // Right side: selected product image
    ctx.drawImage(productImg, width / 2, 0, width / 2, height - 110);

    // Bottom band + labels
    ctx.fillStyle = 'rgba(18, 20, 30, 0.96)';
    ctx.fillRect(0, height - 110, width, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Demo Try-On Preview', 26, height - 66);

    ctx.fillStyle = '#c8cbda';
    ctx.font = '20px sans-serif';
    ctx.fillText(productName, 26, height - 32);

    ctx.fillStyle = '#9fa6c4';
    ctx.font = '16px sans-serif';
    ctx.fillText('Gemini quota exceeded: generated local preview', width - 350, height - 24);

    return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Virtual try-on using Gemini 2.0 Flash image generation.
 *
 * @param {File}   userPhotoFile   - photo uploaded by the user
 * @param {string} productImageUrl - URL of the product image
 * @param {string} productName     - name of the product
 * @returns {string} base64 image data (png)
 */
export async function virtualTryOn(userPhotoFile, productImageUrl, productName, productId) {
    // Route through the backend so the API key stays server-side and we use the correct model
    const token = localStorage.getItem('moda_token') || sessionStorage.getItem('moda_token');
    if (!token) {
        throw new Error('You must be logged in to use the virtual try-on feature.');
    }

    const formData = new FormData();
    formData.append('product_id', String(productId));
    formData.append('user_photo', userPhotoFile);
    if (productImageUrl) {
        formData.append('product_image_url', productImageUrl);
    }

    let response;
    try {
        response = await fetch('http://localhost:8000/api/ai/virtual-try-on', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
    } catch {
        throw new Error('Could not reach the backend. Make sure the server is running.');
    }

    if (!response.ok) {
        let detail = `Server error ${response.status}`;
        try {
            const err = await response.json();
            detail = err?.detail || detail;
        } catch { /* ignore parse error */ }

        if (response.status === 401 || response.status === 403) {
            throw new Error('Session expired. Please log in again.');
        }
        if (response.status === 429) {
            throw new Error('GEMINI_QUOTA_EXCEEDED: API quota reached. Please wait a moment and try again.');
        }
        throw new Error(detail);
    }

    const data = await response.json();
    const imageUrl = data?.image_url;
    if (!imageUrl) {
        throw new Error('No image URL returned from the server.');
    }

    // Fetch the generated image and convert to base64 so the modal can display it
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error('Could not load the generated image.');
    const blob = await imgResp.blob();
    return fileToBase64(blob);
}

/**
 * Send a text chat message to Gemini via the backend RAG API for the store chatbot.
 */
export async function sendChatMessage(history, userMessage) {
    try {
        const response = await fetch('http://localhost:8000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                history: history,
                user_message: userMessage
            })
        });

        if (!response.ok) {
            console.error('Failed to get chat response from backend');
            return null;
        }

        const data = await response.json();
        return {
            response: data.response || '',
            products: data.products || []
        };
    } catch (err) {
        console.error('Chat error:', err);
        return null;
    }
}
