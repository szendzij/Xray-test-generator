// Xray Cloud API Client for Xray Test Generator
// Handles authentication and GraphQL operations for Xray Cloud EU region
class XrayApiClient {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseUrl = CONSTANTS.XRAY.BASE_URL;
        this._token = null;
        this._tokenExpiry = null;
    }

    async getToken() {
        if (this._token && this._tokenExpiry && Date.now() < this._tokenExpiry) {
            return this._token;
        }

        const response = await fetch(`${this.baseUrl}/api/v2/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: this.clientId,
                client_secret: this.clientSecret
            })
        });

        if (!response.ok) {
            const err = await response.text().catch(() => response.statusText);
            throw new Error(`Xray auth failed (${response.status}): ${err}`);
        }

        // Response is a plain JWT string (not JSON object)
        this._token = (await response.text()).replace(/"/g, '');
        // Tokens expire after 24h — cache for 23h
        this._tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
        logger.debug('Xray Cloud token obtained');
        return this._token;
    }

    async addTestStep(issueId, step) {
        const token = await this.getToken();

        const mutation = `
            mutation AddStep($issueId: String!, $action: String!, $data: String, $result: String) {
                addTestStep(
                    issueId: $issueId,
                    step: { action: $action, data: $data, result: $result }
                ) {
                    id
                    action
                    data
                    result
                }
            }
        `;

        const response = await fetch(`${this.baseUrl}/api/v2/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: mutation,
                variables: {
                    issueId: String(issueId),
                    action: step.action || '',
                    data: step.data || '',
                    result: step.result || ''
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Xray GraphQL error (${response.status})`);
        }

        const data = await response.json();
        if (data.errors?.length) {
            throw new Error(data.errors.map(e => e.message).join('; '));
        }

        return data.data?.addTestStep;
    }
}
