/**
 * Virtual Try-On — category filter (BLACKLIST approach).
 *
 * Try-On is enabled for ALL products EXCEPT:
 *   ❌ Shoes / Footwear      — isolated foot try-on not supported; shoes appear in outfit builder
 *   ❌ Underwear / Lingerie  — privacy & ethical concerns
 *   ❌ Socks                 — low value, visually trivial
 *
 * Checked against BOTH product.category (free-text name from DB)
 * AND product.piece_type (the structured slot enum: "Shoes", "Tops", etc.)
 * so the block works regardless of how the category is named in the database.
 */

/**
 * Normalize a string for reliable keyword matching, handling Turkish special
 * characters that behave incorrectly with standard JS .toLowerCase().
 *
 * Root cause: 'İ'.toLowerCase() → 'i̇' (i + U+0307 combining dot), NOT plain 'i'.
 * So 'İÇ GIYIM'.toLowerCase() ≠ 'iç giyim' → the keyword never matched.
 */
function normalizeStr(str) {
    return str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .replace(/Ş/g, 'ş')
        .replace(/Ğ/g, 'ğ')
        .replace(/Ü/g, 'ü')
        .replace(/Ö/g, 'ö')
        .replace(/Ç/g, 'ç')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * piece_type values (the structured slot enum) that are ALWAYS blocked.
 * These are matched exactly (case-insensitive) so "Shoes" always blocks
 * regardless of what the free-text category name is.
 */
const BLOCKED_PIECE_TYPES = new Set([
    'shoes',
    'footwear',
    'accessories',
]);

/**
 * Free-text category keywords that are blocked (substring match, normalized).
 * Catches Turkish category names like "Spor Ayakkabı", "İÇ GIYIM", etc.
 */
const TRY_ON_BLOCKED_KEYWORDS = [
    // ── Shoes / Footwear ─────────────────────────────────────────────────────
    'shoe',
    'shoes',
    'sneaker',
    'sneakers',
    'boot',
    'boots',
    'sandal',
    'sandals',
    'heel',
    'heels',
    'slipper',
    'slippers',
    'loafer',
    'loafers',
    'footwear',
    'ayakkabi',      // Turkish: shoe (İ already handled by normalizeStr)
    'spor ayakkabi', // Turkish: sneaker
    'çizme',         // Turkish: boot
    'terlik',        // Turkish: slipper/sandal

    // ── Underwear / Lingerie ─────────────────────────────────────────────────
    'underwear',
    'under wear',
    'lingerie',
    'bra',
    'bras',
    'panty',
    'panties',
    'thong',
    'thongs',
    'boxer',
    'boxers',
    'brief',
    'briefs',
    'iç giyim',      // Turkish: innerwear / underwear
    'iç camasir',    // Turkish: underwear (normalized form of iç çamaşır)
    'sutyen',        // Turkish: bra
    'atlet',         // Turkish: athletic undershirt (underwear category)

    // ── Socks ────────────────────────────────────────────────────────────────
    'sock',
    'socks',
    'çorap',         // Turkish: socks

    // ── Accessories ──────────────────────────────────────────────────────────
    'accessory',
    'accessories',
    'aksesuar',      // Turkish: accessory
];

/**
 * Returns true if the given product supports single-product Virtual Try-On.
 *
 * Checks BOTH the free-text category name AND the structured piece_type so
 * shoes are always blocked even when their category name is something like
 * "Coin Erkek Spor Ayakkabı" that wouldn't match a simple keyword.
 *
 * @param {string|null|undefined} category  - product.category (free-text DB name)
 * @param {string|null|undefined} pieceType - product.piece_type / product.outfit_slot
 * @returns {boolean}
 */
export function isTryOnEligible(category, pieceType) {
    // 1. Check the structured piece_type first (most reliable signal)
    if (pieceType) {
        const normalizedType = normalizeStr(String(pieceType));
        if (BLOCKED_PIECE_TYPES.has(normalizedType)) return false;
    }

    // 2. Check the free-text category name via keyword matching
    if (category) {
        const normalizedCat = normalizeStr(String(category));
        if (TRY_ON_BLOCKED_KEYWORDS.some((kw) => normalizedCat.includes(normalizeStr(kw)))) {
            return false;
        }
    }

    // Allow everything else (no category = allow so uncategorized products aren't hidden)
    return true;
}
