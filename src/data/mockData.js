// ============================================================
// MOCK DATA — Moda E-Commerce Platform
// ============================================================

export const mockCategories = [
    { id: 1, name: 'Women', parent_id: null },
    { id: 2, name: 'Men', parent_id: null },
    { id: 3, name: 'Accessories', parent_id: null },
    { id: 4, name: 'Dresses', parent_id: 1 },
    { id: 5, name: 'Tops', parent_id: 1 },
    { id: 6, name: 'Bottoms', parent_id: 1 },
    { id: 7, name: 'Outerwear', parent_id: 1 },
    { id: 8, name: 'T-Shirts', parent_id: 2 },
    { id: 9, name: 'Shirts', parent_id: 2 },
    { id: 10, name: 'Pants', parent_id: 2 },
    { id: 11, name: 'Bags', parent_id: 3 },
    { id: 12, name: 'Jewelry', parent_id: 3 },
];

export const mockProducts = [
    {
        id: 1, name: 'Midnight Silk Dress', description: 'Luxurious silk midi dress with an elegant A-line silhouette. Perfect for evening events and formal gatherings. Features a subtle sheen that catches the light beautifully.',
        category_id: 4, category: 'Dresses', piece_type: 'top',
        images: [
            { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80', is_primary: true },
            { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', is_primary: false },
        ],
        rating: 4.8, review_count: 124,
        variants: [
            { id: 1, color: '#1a1a2e', color_name: 'Midnight Blue', size: 'XS', price: 189.99, stock: 5 },
            { id: 2, color: '#1a1a2e', color_name: 'Midnight Blue', size: 'S', price: 189.99, stock: 8 },
            { id: 3, color: '#1a1a2e', color_name: 'Midnight Blue', size: 'M', price: 189.99, stock: 3 },
            { id: 4, color: '#2d1b1b', color_name: 'Deep Burgundy', size: 'S', price: 189.99, stock: 6 },
            { id: 5, color: '#2d1b1b', color_name: 'Deep Burgundy', size: 'M', price: 189.99, stock: 4 },
        ],
    },
    {
        id: 2, name: 'Ethereal Linen Blouse', description: 'Breezy linen blouse with delicate pintuck details. A wardrobe essential that transitions effortlessly from day to night.',
        category_id: 5, category: 'Tops', piece_type: 'top',
        images: [
            { url: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80', is_primary: true },
        ],
        rating: 4.5, review_count: 87,
        variants: [
            { id: 6, color: '#f5f0e8', color_name: 'Ivory', size: 'XS', price: 79.99, stock: 10 },
            { id: 7, color: '#f5f0e8', color_name: 'Ivory', size: 'S', price: 79.99, stock: 12 },
            { id: 8, color: '#f5f0e8', color_name: 'Ivory', size: 'M', price: 79.99, stock: 7 },
            { id: 9, color: '#c8a86b', color_name: 'Camel', size: 'S', price: 79.99, stock: 9 },
            { id: 10, color: '#c8a86b', color_name: 'Camel', size: 'M', price: 79.99, stock: 5 },
        ],
    },
    {
        id: 3, name: 'Obsidian Tailored Blazer', description: 'Power-dressing redefined. This structured blazer features peak lapels and a nipped waist for a commanding silhouette.',
        category_id: 7, category: 'Outerwear', piece_type: 'outerwear',
        images: [
            { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80', is_primary: true },
        ],
        rating: 4.9, review_count: 203,
        variants: [
            { id: 11, color: '#1c1c1c', color_name: 'Obsidian', size: 'S', price: 299.99, stock: 4 },
            { id: 12, color: '#1c1c1c', color_name: 'Obsidian', size: 'M', price: 299.99, stock: 6 },
            { id: 13, color: '#1c1c1c', color_name: 'Obsidian', size: 'L', price: 299.99, stock: 3 },
            { id: 14, color: '#3d2b1f', color_name: 'Cognac', size: 'S', price: 299.99, stock: 2 },
            { id: 15, color: '#3d2b1f', color_name: 'Cognac', size: 'M', price: 299.99, stock: 5 },
        ],
    },
    {
        id: 4, name: 'High-Waist Wide-Leg Trousers', description: 'Sleek high-waist trousers with a wide leg cut. Pairs perfectly with fitted tops and heels or chunky sneakers.',
        category_id: 6, category: 'Bottoms', piece_type: 'bottom',
        images: [
            { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4e03?w=600&q=80', is_primary: true },
        ],
        rating: 4.6, review_count: 156,
        variants: [
            { id: 16, color: '#1c1c1c', color_name: 'Black', size: 'XS', price: 129.99, stock: 8 },
            { id: 17, color: '#1c1c1c', color_name: 'Black', size: 'S', price: 129.99, stock: 10 },
            { id: 18, color: '#1c1c1c', color_name: 'Black', size: 'M', price: 129.99, stock: 5 },
            { id: 19, color: '#8b7355', color_name: 'Mocha', size: 'S', price: 129.99, stock: 7 },
            { id: 20, color: '#8b7355', color_name: 'Mocha', size: 'M', price: 129.99, stock: 4 },
        ],
    },
    {
        id: 5, name: 'Cashmere Turtleneck Sweater', description: 'Pure cashmere turtleneck in rich, jewel-toned hues. Incredibly soft against the skin with a luxurious drape.',
        category_id: 5, category: 'Tops', piece_type: 'top',
        images: [
            { url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&q=80', is_primary: true },
        ],
        rating: 4.7, review_count: 98,
        variants: [
            { id: 21, color: '#6b3fa0', color_name: 'Amethyst', size: 'XS', price: 220.00, stock: 6 },
            { id: 22, color: '#6b3fa0', color_name: 'Amethyst', size: 'S', price: 220.00, stock: 4 },
            { id: 23, color: '#8b1a1a', color_name: 'Crimson', size: 'S', price: 220.00, stock: 5 },
            { id: 24, color: '#8b1a1a', color_name: 'Crimson', size: 'M', price: 220.00, stock: 3 },
        ],
    },
    {
        id: 6, name: 'Structured Leather Bag', description: 'Compact structured bag in pebbled leather. Features a top handle, detachable strap and gold-tone hardware.',
        category_id: 11, category: 'Bags', piece_type: 'accessory',
        images: [
            { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80', is_primary: true },
        ],
        rating: 4.9, review_count: 312,
        variants: [
            { id: 25, color: '#1c1c1c', color_name: 'Black', size: 'One Size', price: 349.99, stock: 3 },
            { id: 26, color: '#c8a86b', color_name: 'Tan', size: 'One Size', price: 349.99, stock: 5 },
            { id: 27, color: '#800020', color_name: 'Burgundy', size: 'One Size', price: 349.99, stock: 2 },
        ],
    },
    {
        id: 7, name: 'Oversized Denim Jacket', description: 'Vintage-inspired oversized denim jacket with raw-edge hem and custom embroidery detailing.',
        category_id: 7, category: 'Outerwear', piece_type: 'outerwear',
        images: [
            { url: 'https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=600&q=80', is_primary: true },
        ],
        rating: 4.4, review_count: 67,
        variants: [
            { id: 28, color: '#4a6fa5', color_name: 'Indigo', size: 'S', price: 159.99, stock: 7 },
            { id: 29, color: '#4a6fa5', color_name: 'Indigo', size: 'M', price: 159.99, stock: 9 },
            { id: 30, color: '#4a6fa5', color_name: 'Indigo', size: 'L', price: 159.99, stock: 4 },
        ],
    },
    {
        id: 8, name: 'Pleated Midi Skirt', description: 'Graceful pleated midi skirt in flowing satin fabric. The knife-pleat construction creates beautiful movement.',
        category_id: 6, category: 'Bottoms', piece_type: 'bottom',
        images: [
            { url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80', is_primary: true },
        ],
        rating: 4.6, review_count: 145,
        variants: [
            { id: 31, color: '#f5f0e8', color_name: 'Champagne', size: 'XS', price: 109.99, stock: 5 },
            { id: 32, color: '#f5f0e8', color_name: 'Champagne', size: 'S', price: 109.99, stock: 8 },
            { id: 33, color: '#2d4a6e', color_name: 'Navy', size: 'S', price: 109.99, stock: 6 },
            { id: 34, color: '#2d4a6e', color_name: 'Navy', size: 'M', price: 109.99, stock: 4 },
        ],
    },
    {
        id: 9, name: 'Gold Statement Necklace', description: 'Sculptural 18k gold-plated statement necklace with organic shapes. A conversation starter for any outfit.',
        category_id: 12, category: 'Jewelry', piece_type: 'accessory',
        images: [
            { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80', is_primary: true },
        ],
        rating: 4.8, review_count: 89,
        variants: [
            { id: 35, color: '#fbbf24', color_name: 'Gold', size: 'One Size', price: 89.99, stock: 12 },
            { id: 36, color: '#c0c0c0', color_name: 'Silver', size: 'One Size', price: 79.99, stock: 8 },
            { id: 37, color: '#b87333', color_name: 'Rose Gold', size: 'One Size', price: 89.99, stock: 6 },
        ],
    },
    {
        id: 10, name: 'Slim-Fit Oxford Shirt', description: 'Classic Oxford shirt reimagined with a slim fit and subtle texture. Versatile enough for both office and weekend wear.',
        category_id: 9, category: 'Shirts', piece_type: 'top',
        images: [
            { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80', is_primary: true },
        ],
        rating: 4.5, review_count: 211,
        variants: [
            { id: 38, color: '#f5f0e8', color_name: 'White', size: 'S', price: 89.99, stock: 15 },
            { id: 39, color: '#f5f0e8', color_name: 'White', size: 'M', price: 89.99, stock: 12 },
            { id: 40, color: '#f5f0e8', color_name: 'White', size: 'L', price: 89.99, stock: 8 },
            { id: 41, color: '#4a6fa5', color_name: 'Blue', size: 'S', price: 89.99, stock: 10 },
            { id: 42, color: '#4a6fa5', color_name: 'Blue', size: 'M', price: 89.99, stock: 9 },
        ],
    },
    {
        id: 11, name: 'Velvet Slip Dress', description: 'Rich velvet slip dress with adjustable spaghetti straps and a subtle sheen. Effortlessly elegant.',
        category_id: 4, category: 'Dresses', piece_type: 'top',
        images: [
            { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80', is_primary: true },
        ],
        rating: 4.7, review_count: 176,
        variants: [
            { id: 43, color: '#1a0836', color_name: 'Plum', size: 'XS', price: 149.99, stock: 5 },
            { id: 44, color: '#1a0836', color_name: 'Plum', size: 'S', price: 149.99, stock: 7 },
            { id: 45, color: '#1c3a2a', color_name: 'Forest', size: 'S', price: 149.99, stock: 4 },
            { id: 46, color: '#1c3a2a', color_name: 'Forest', size: 'M', price: 149.99, stock: 6 },
        ],
    },
    {
        id: 12, name: 'Relaxed Linen Trousers', description: 'Easy-wearing linen trousers with an elasticated waistband and side seam pockets.',
        category_id: 10, category: 'Pants', piece_type: 'bottom',
        images: [
            { url: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600&q=80', is_primary: true },
        ],
        rating: 4.3, review_count: 92,
        variants: [
            { id: 47, color: '#c2b49a', color_name: 'Sand', size: 'S', price: 99.99, stock: 9 },
            { id: 48, color: '#c2b49a', color_name: 'Sand', size: 'M', price: 99.99, stock: 12 },
            { id: 49, color: '#c2b49a', color_name: 'Sand', size: 'L', price: 99.99, stock: 7 },
            { id: 50, color: '#4a6fa5', color_name: 'Slate', size: 'M', price: 99.99, stock: 5 },
        ],
    },
];

export const mockReviews = [
    { id: 1, product_id: 1, user_id: 2, user_name: 'Emma L.', rating: 5, comment: 'Absolutely stunning dress! The silk quality is exceptional and it fits like a dream. Got so many compliments.', review_date: '2025-11-15' },
    { id: 2, product_id: 1, user_id: 3, user_name: 'Sofia M.', rating: 5, comment: 'Perfect for special occasions. The color is even more beautiful in person.', review_date: '2025-12-01' },
    { id: 3, product_id: 1, user_id: 4, user_name: 'Ayla K.', rating: 4, comment: 'Gorgeous dress, sizing runs slightly small. I recommend going up one size.', review_date: '2025-12-20' },
    { id: 4, product_id: 2, user_id: 2, user_name: 'Emma L.', rating: 4, comment: 'Love the linen quality. Very breathable and chic. The pintuck details are lovely.', review_date: '2025-11-20' },
    { id: 5, product_id: 3, user_id: 5, user_name: 'Lena R.', rating: 5, comment: 'The best blazer I have ever owned. Worth every penny. Impeccable tailoring.', review_date: '2025-10-10' },
    { id: 6, product_id: 6, user_id: 3, user_name: 'Sofia M.', rating: 5, comment: 'Exceptional quality leather. This bag will last a lifetime. I get compliments everywhere.', review_date: '2025-09-25' },
];

export const mockCoupons = [
    { coupon_code: 'SAVE10', discount: 10, expiration_date: '2026-12-31', min_order_amount: 50, usage_limit: 100, used_count: 23, is_active: true },
    { coupon_code: 'WELCOME20', discount: 20, expiration_date: '2026-06-30', min_order_amount: 80, usage_limit: 50, used_count: 48, is_active: true },
    { coupon_code: 'MODA15', discount: 15, expiration_date: '2026-03-31', min_order_amount: 100, usage_limit: 200, used_count: 12, is_active: true },
    { coupon_code: 'EXPIRED', discount: 5, expiration_date: '2024-01-01', min_order_amount: 0, usage_limit: 10, used_count: 10, is_active: false },
];

export const mockOrders = [
    {
        orderID: 1001, user_id: 1, address_id: 1, order_date: '2025-12-15T10:30:00Z',
        payment: 'Credit Card', payment_status: 'completed', coupon_code: 'SAVE10',
        total_price: 386.99, status: 'delivered',
        items: [
            { variant_id: 1, product_id: 1, product_name: 'Midnight Silk Dress', color: 'Midnight Blue', size: 'S', quantity: 1, unit_price: 189.99, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&q=80' },
            { variant_id: 9, product_id: 2, product_name: 'Ethereal Linen Blouse', color: 'Camel', size: 'M', quantity: 2, unit_price: 79.99, image: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=200&q=80' },
        ],
        shipping: { shippingID: 101, shipping_status: 'delivered', label: 'DHL Express', tracking: 'DHL8472936418', created_at: '2025-12-16T09:00:00Z', estimated_delivery: '2025-12-19', delivered_at: '2025-12-18' },
        invoice: { invoice_ID: 201, invoice_date: '2025-12-15', total_amount: 386.99, tax_amount: 69.65, billing_address_id: 1 },
    },
    {
        orderID: 1002, user_id: 1, address_id: 1, order_date: '2026-01-20T14:15:00Z',
        payment: 'Bank Transfer', payment_status: 'completed', coupon_code: null,
        total_price: 429.99, status: 'shipped',
        items: [
            { variant_id: 11, product_id: 3, product_name: 'Obsidian Tailored Blazer', color: 'Obsidian', size: 'S', quantity: 1, unit_price: 299.99, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&q=80' },
            { variant_id: 16, product_id: 4, product_name: 'High-Waist Wide-Leg Trousers', color: 'Black', size: 'XS', quantity: 1, unit_price: 129.99, image: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4e03?w=200&q=80' },
        ],
        shipping: { shippingID: 102, shipping_status: 'shipped', label: 'UPS', tracking: 'UPS1Z999AA10123456784', created_at: '2026-01-21T10:00:00Z', estimated_delivery: '2026-01-25', delivered_at: null },
        invoice: { invoice_ID: 202, invoice_date: '2026-01-20', total_amount: 429.99, tax_amount: 77.40, billing_address_id: 1 },
    },
    {
        orderID: 1003, user_id: 1, address_id: 1, order_date: '2026-02-18T09:00:00Z',
        payment: 'Credit Card', payment_status: 'completed', coupon_code: 'MODA15',
        total_price: 278.49, status: 'processing',
        items: [
            { variant_id: 25, product_id: 6, product_name: 'Structured Leather Bag', color: 'Black', size: 'One Size', quantity: 1, unit_price: 349.99, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&q=80' },
        ],
        shipping: { shippingID: 103, shipping_status: 'processing', label: null, tracking: null, created_at: '2026-02-18T09:00:00Z', estimated_delivery: null, delivered_at: null },
        invoice: { invoice_ID: 203, invoice_date: '2026-02-18', total_amount: 278.49, tax_amount: 50.13, billing_address_id: 1 },
    },
];

export const mockAddresses = [
    { address_id: 1, user_id: 1, street: '25 Fashion Boulevard, Apt 4B', city: 'Istanbul', country: 'Turkey', zip_code: '34000', is_default: true },
    { address_id: 2, user_id: 1, street: '7 Ataturk Street', city: 'Ankara', country: 'Turkey', zip_code: '06000', is_default: false },
];

export const mockOutfits = [
    {
        outfit_id: 1, user_id: 1, name: 'Office Chic', description: 'Power dressing for the corporate world', visibility: 'public', created_at: '2026-01-10',
        products: [3, 4, 6], // product IDs
    },
    {
        outfit_id: 2, user_id: 1, name: 'Weekend Casual', description: 'Effortlessly cool weekend vibes', visibility: 'private', created_at: '2026-01-25',
        products: [7, 12, 9],
    },
];

export const mockConversations = [
    {
        conversation_id: 1, user_id: 1, title: 'Outfit advice', started_at: '2026-02-10T11:00:00Z',
        messages: [
            { message_id: 1, sender_type: 'user', content: 'Hi! Can you help me choose an outfit for a formal dinner?', sent_at: '2026-02-10T11:00:00Z' },
            { message_id: 2, sender_type: 'bot', content: 'Of course! For a formal dinner, I recommend our Midnight Silk Dress paired with the Gold Statement Necklace. Would you like me to show you more options?', sent_at: '2026-02-10T11:00:30Z' },
            { message_id: 3, sender_type: 'user', content: 'Yes please! What shoes would you suggest?', sent_at: '2026-02-10T11:01:00Z' },
            { message_id: 4, sender_type: 'bot', content: 'For the Midnight Silk Dress, I recommend classic black stilettos or strappy gold heels to complement the elegant look. You can find our footwear collection in the Accessories category!', sent_at: '2026-02-10T11:01:20Z' },
        ],
    },
];

export const mockUser = {
    user_ID: 1,
    first_name: 'Ayşe',
    last_name: 'Khedr',
    email: 'ayse@example.com',
    phone_No: '+90 555 123 4567',
    role: 'customer',
};

export const mockAdmin = {
    user_ID: 99,
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@moda.com',
    phone_No: '+90 555 000 0000',
    role: 'admin',
};

// Chatbot auto-responses
export const botResponses = [
    "I'd be happy to help you with that! Let me check our catalog for the best options.",
    "Great question! Our team of style experts has curated the finest selections for you.",
    "Based on your preferences, I recommend exploring our new arrivals section.",
    "You can track your order in the 'My Orders' section. Would you like me to guide you there?",
    "We offer free shipping on orders over ₺500. The estimated delivery is 3-5 business days.",
    "Our return policy allows you to return items within 30 days of purchase for a full refund.",
    "I can help you create a beautiful outfit! Which occasion are you dressing for?",
    "That item is currently in stock and available in multiple colors and sizes.",
    "Our size guide is available on each product page. Would you like help finding your perfect size?",
    "Yes, you can apply coupon codes at checkout. Try SAVE10 for 10% off your first order!",
];
