const BASE_URL = 'http://localhost:8000/api';

/**
 * Makes an API request.
 * @param {string} path - API path (e.g. '/auth/login')
 * @param {object} options - fetch options (method, body, headers)
 * @param {object} params - query parameters to append to the URL
 */
export const apiCall = async (path, options = {}, params = {}) => {
    const token = localStorage.getItem('moda_token');

    // For POST/PUT/PATCH, send params as JSON body
    const method = (options.method || 'GET').toUpperCase();
    const isBodyRequest = ['POST', 'PUT', 'PATCH'].includes(method);

    let finalOptions = { ...options };
    let queryString = '';

    if (isBodyRequest && Object.keys(params).length > 0) {
        // Send as JSON body for POST/PUT/PATCH
        finalOptions.body = JSON.stringify(params);
        finalOptions.headers = {
            'Content-Type': 'application/json',
            ...finalOptions.headers,
        };
    } else if (!isBodyRequest && Object.keys(params).length > 0) {
        // Build query string for GET/DELETE
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v != null)
        );
        queryString = Object.keys(cleanParams).length
            ? '?' + new URLSearchParams(cleanParams).toString()
            : '';
    }

    const res = await fetch(`${BASE_URL}${path}${queryString}`, {
        ...finalOptions,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...finalOptions.headers,
        },
    });

    // Token expired or invalid — clear session and redirect to login
    if (res.status === 401) {
        const err = await res.json().catch(() => ({ detail: 'Session expired' }));
        const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register');
        if (!isAuthRoute) {
            localStorage.removeItem('moda_token');
            localStorage.removeItem('moda_user');
            // Reload sends the user to the login page (App.jsx guards routes)
            window.location.href = '/login';
        }
        throw new Error(err.detail || 'Session expired. Please log in again.');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        console.error(`❌ API Error [${res.status}]:`, err);
        throw new Error(err.detail || 'Request failed');
    }

    // 204 No Content — no body to parse
    if (res.status === 204) return null;
    return res.json();
};
