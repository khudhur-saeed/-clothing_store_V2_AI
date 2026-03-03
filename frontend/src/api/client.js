const BASE_URL = 'http://localhost:8000/api';

/**
 * Makes an API request.
 * @param {string} path - API path (e.g. '/auth/login')
 * @param {object} options - fetch options (method, body, headers)
 * @param {object} params - query parameters to append to the URL
 */
export const apiCall = async (path, options = {}, params = {}) => {
    const token = localStorage.getItem('moda_token');

    // Build query string from params object
    const queryString = Object.keys(params).length
        ? '?' + new URLSearchParams(params).toString()
        : '';

    const res = await fetch(`${BASE_URL}${path}${queryString}`, {
        ...options,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }

    // 204 No Content — no body to parse
    if (res.status === 204) return null;
    return res.json();
};
