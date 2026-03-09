// Jira API Client for Xray Test Generator
// Handles all direct API communication with Jira
class JiraApiClient {
    constructor(config, errorHandler) {
        this.config = config;
        this.baseUrl = config.jiraUrl.replace(/\/$/, '');
        this.errorHandler = errorHandler;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${CONSTANTS.API.BASE_PATH}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${btoa(`${this.config.jiraEmail}:${this.config.jiraApiKey}`)}`
            }
        };

        logger.debug(`Making ${options.method || 'GET'} request to: ${url}`);

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });

            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (textError) {
                    errorText = `Cannot read response body: ${textError.message}`;
                }

                logger.error(`HTTP ${response.status} error:`, errorText);
                const error = new Error(`HTTP ${response.status}: ${errorText}`);
                error.status = response.status;
                error.body = errorText;
                error.url = url;
                throw error;
            }

            if (response.status === 204 || response.status === 205) {
                logger.debug(`Request successful, no content returned (${response.status})`);
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            if (response.headers.get('content-length') === '0' || !contentType.includes('application/json')) {
                logger.debug('Request successful, no JSON content returned');
                return null;
            }

            const data = await response.json();
            logger.debug(`Request successful, received ${data.total !== undefined ? `${data.total} total results` : 'data'}`);
            return data;

        } catch (error) {
            logger.error(`Request failed for ${url}:`, error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(`Network error: Cannot connect to ${this.baseUrl}. Please check the URL and your internet connection.`);
            }
            throw error;
        }
    }

    async makeRequestWithRetry(endpoint, options = {}) {
        return this.errorHandler.withRetry(
            () => this.makeRequest(endpoint, options),
            `API request to ${endpoint}`
        );
    }

    async getJqlCount(jql) {
        try {
            logger.debug('Attempting approximate count with /search/approximate-count...');
            const data = await this.makeRequestWithRetry(CONSTANTS.API.ENDPOINTS.SEARCH_APPROXIMATE_COUNT, {
                method: 'POST',
                body: JSON.stringify({ jql })
            });
            const count = data?.approximateCount ?? 0;
            logger.debug(`Approximate count successful: ${count}`);
            return count;
        } catch (error) {
            logger.debug(`Approximate count failed (${error.status}), falling back to search...`);
            // Fallback to regular search with minimal results to get total count
            const data = await this.searchIssues({ jql, maxResults: 1 });
            const total = data?.total ?? 0;
            logger.debug(`Total count from search: ${total}`);
            return total;
        }
    }

    async getIssuesByJql(jql, maxResults = CONSTANTS.DEFAULT_MAX_RESULTS) {
        const data = await this.searchIssues({
            jql,
            maxResults,
            fields: ['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter', 'labels']
        });
        return data?.issues ?? [];
    }

    async searchIssues({ jql, maxResults = 50, fields }) {
        const searchEndpoint = CONSTANTS.API.ENDPOINTS.SEARCH_JQL;
        logger.debug(`Searching issues with JQL: ${jql} (maxResults: ${maxResults})`);

        // Try GET request first
        try {
            logger.debug('Attempting GET request with /search/jql endpoint...');
            const queryParams = new URLSearchParams({
                jql,
                maxResults: maxResults.toString()
            });

            if (fields && Array.isArray(fields) && fields.length > 0) {
                queryParams.append('fields', fields.join(','));
                logger.debug(`Including fields: ${fields.join(', ')}`);
            }

            const result = await this.makeRequestWithRetry(`${searchEndpoint}?${queryParams.toString()}`, {
                method: 'GET'
            });
            logger.debug('GET request successful');
            return result;
        } catch (getError) {
            logger.debug(`GET request failed (${getError.status}): ${getError.message}, trying POST...`);
            return this.tryPostRequest(searchEndpoint, jql, maxResults, fields, getError);
        }
    }

    async tryPostRequest(searchEndpoint, jql, maxResults, fields, originalError) {
        try {
            const payload = {
                jql,
                maxResults,
                fields: fields && Array.isArray(fields) && fields.length > 0 ? fields : undefined
            };

            // Remove undefined fields from payload
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            const result = await this.makeRequestWithRetry(searchEndpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            logger.debug('POST request successful');
            return result;
        } catch (postError) {
            logger.debug(`POST request failed (${postError.status}): ${postError.message}`);
            
            // If POST with fields fails, try without fields
            if (fields && postError.status === 400) {
                logger.debug('Retrying POST request without fields...');
                try {
                    const result = await this.makeRequestWithRetry(searchEndpoint, {
                        method: 'POST',
                        body: JSON.stringify({ jql, maxResults })
                    });
                    logger.debug('POST request without fields successful');
                    return result;
                } catch (simplePostError) {
                    logger.error('All search attempts failed. Final error:', simplePostError);
                    throw simplePostError;
                }
            }

            if (postError.status === 410) {
                logger.warn('New API also deprecated, this should not happen. Check Atlassian documentation for latest endpoint.');
            }

            throw postError;
        }
    }

    async findSingleIssue(jql) {
        try {
            const data = await this.searchIssues({
                jql,
                maxResults: 1,
                fields: ['summary']
            });

            return data?.issues?.length ? data.issues[0] : null;
        } catch (error) {
            logger.warn(`Warning: Could not execute JQL check: ${jql}`, error);
            return null;
        }
    }

    async createIssue(issueData) {
        return await this.makeRequestWithRetry(CONSTANTS.API.ENDPOINTS.ISSUE, {
            method: 'POST',
            body: JSON.stringify(issueData)
        });
    }

    async updateIssue(issueKey, issueData) {
        return await this.makeRequestWithRetry(`${CONSTANTS.API.ENDPOINTS.ISSUE}/${issueKey}`, {
            method: 'PUT',
            body: JSON.stringify(issueData)
        });
    }

    async linkIssues(inwardKey, outwardKey, linkType = CONSTANTS.TEST_EXECUTION.LINK_TYPE) {
        if (!inwardKey || !outwardKey) {
            return false;
        }

        try {
            await this.makeRequestWithRetry(CONSTANTS.API.ENDPOINTS.ISSUE_LINK, {
                method: 'POST',
                body: JSON.stringify({
                    type: { name: linkType },
                    inwardIssue: { key: inwardKey },
                    outwardIssue: { key: outwardKey }
                })
            });
            return true;
        } catch (error) {
            logger.warn(`Warning: Could not link ${inwardKey} to ${outwardKey}:`, error);
            return false;
        }
    }
}

