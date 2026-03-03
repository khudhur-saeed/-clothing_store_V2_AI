import { useState, useEffect } from 'react';
import { apiCall } from './client';

/**
 * Transforms a real API product + variants into the shape the UI components expect.
 * Our DB has: product (id, name, description, price, status, category)
 *             variant (variant_id, product_id, color, size, stock, images)
 */
/**
 * Safely converts an images value to an array of URL strings.
 * Handles: null, JSON array (new format), or legacy comma-separated string.
 */
function getImagesArray(images) {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === 'string') {
        // Legacy: comma-separated string
        return images.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function normalizeProduct(product, variants = []) {

    // Build images array from all variants' images (now stored as JSON arrays)
    const allImages = [];
    const seen = new Set();
    variants.forEach(v => {
        const imgs = getImagesArray(v.images);
        imgs.forEach(url => {
            const trimmed = url.trim();
            if (trimmed && !seen.has(trimmed)) {
                seen.add(trimmed);
                allImages.push({ url: trimmed });
            }
        });
    });

    // Normalize variants to match UI shape
    const normalizedVariants = variants.map(v => ({
        id: v.variant_id,
        variant_id: v.variant_id,
        color: v.color || '#888888',
        color_name: v.color || 'Default',
        size: v.size || 'One Size',
        stock: v.stock ?? 0,
        price: Number(product.price) || 0,
        images: getImagesArray(v.images).map(url => ({ url })),  // per-variant image list
    }));

    return {
        id: product.product_id,
        product_id: product.product_id,
        name: product.name,
        description: product.description || '',
        price: Number(product.price) || 0,
        category: product.category || 'Uncategorized',
        category_id: product.category,   // use string category as fallback
        piece_type: product.category || '',
        status: product.status,
        rating: 0,                       // computed from reviews
        images: allImages.length ? allImages : [{ url: 'https://placehold.co/400x500?text=No+Image' }],
        variants: normalizedVariants,
    };
}

/** Fetch all products (with optional query filters) */
export function useProducts(filters = {}) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await apiCall('/products/', {}, filters);
                // Normalize each product (no variants in list view, use empty array)
                setProducts(data.map(p => normalizeProduct(p, [])));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [JSON.stringify(filters)]);

    return { products, loading, error };
}

/** Fetch a single product with its variants */
export function useProduct(productId) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!productId) return;
        const load = async () => {
            try {
                setLoading(true);
                const [productData, variantsData] = await Promise.all([
                    apiCall(`/products/${productId}`),
                    apiCall(`/products/${productId}/variants`),
                ]);
                setProduct(normalizeProduct(productData, variantsData));
            } catch (err) {
                setError(err.message);
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [productId]);

    return { product, loading, error };
}

/** Fetch reviews for a product */
export function useReviews(productId) {
    const [reviews, setReviews] = useState([]);

    const load = async () => {
        if (!productId) return;
        try {
            const data = await apiCall(`/products/${productId}/reviews`);
            setReviews(data.map(r => ({
                id: r.reviewid,
                product_id: r.product_id,
                user_id: r.user_id,
                user_name: `User ${r.user_id}`,
                rating: r.rating,
                comment: r.comment,
                review_date: r.review_date?.split('T')[0] || '',
            })));
        } catch { /* no reviews yet */ }
    };

    useEffect(() => { load(); }, [productId]);

    return { reviews, refetch: load, setReviews };
}

/** Submit a new review */
export async function submitReview(productId, { rating, comment }) {
    return apiCall(`/products/${productId}/reviews`, { method: 'POST' }, { rating, comment });
}
