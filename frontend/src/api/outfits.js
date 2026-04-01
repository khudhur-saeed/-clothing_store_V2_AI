import { apiCall } from './client';

const normalizeOutfit = (outfit) => ({
    id: outfit.id ?? outfit.outfit_id,
    userId: outfit.userId ?? outfit.user_id,
    name: outfit.name || 'Untitled Outfit',
    description: outfit.description || '',
    visibility: outfit.visibility || (outfit.isPublic ? 'public' : 'private'),
    isPublic: typeof outfit.isPublic === 'boolean' ? outfit.isPublic : outfit.visibility === 'public',
    department: outfit.department || null,
    items: outfit.items || outfit.products || [],
    createdAt: outfit.createdAt || outfit.created_at,
    creator: outfit.creator || null,
    likes: typeof outfit.likes === 'number' ? outfit.likes : 0,
});

export async function fetchOutfitsByType(type) {
    const data = await apiCall('/outfits/', {}, { type });
    return Array.isArray(data) ? data.map(normalizeOutfit) : [];
}

export async function deleteOutfitById(outfitId) {
    return apiCall(`/outfits/${outfitId}`, { method: 'DELETE' });
}

export async function toggleOutfitVisibility(outfitId, isPublic) {
    const visibility = isPublic ? 'public' : 'private';
    return apiCall(`/outfits/${outfitId}`, { method: 'PUT' }, { visibility });
}

export async function createOutfit(payload) {
    const data = await apiCall('/outfits/', { method: 'POST' }, payload);
    return normalizeOutfit(data);
}

export async function updateOutfit(outfitId, payload) {
    const data = await apiCall(`/outfits/${outfitId}`, { method: 'PUT' }, payload);
    return normalizeOutfit(data);
}
