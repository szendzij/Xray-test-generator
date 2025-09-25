// scripts/utils/api.js

/**
 * Makes a generic API request.
 * @param {string} url - The URL to request.
 * @param {object} options - The options for the request (e.g., method, headers, body).
 * @returns {Promise<any>} A promise that resolves with the JSON response.
 */
export async function makeRequest(url, options = {}) {
    const { method = 'GET', headers = {}, body } = options;

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const finalHeaders = { ...defaultHeaders, ...headers };

    try {
        const response = await fetch(url, {
            method,
            headers: finalHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            let errorText;
            try {
                errorText = await response.text();
            } catch (textError) {
                errorText = `Cannot read response body: ${textError.message}`;
            }
            const error = new Error(`HTTP ${response.status}: ${errorText}`);
            error.status = response.status;
            error.body = errorText;
            throw error;
        }

        if (response.status === 204 || response.status === 205 || response.headers.get('content-length') === '0') {
            return null;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(`Network error: Could not connect to the server.`);
        }
        throw error;
    }
}