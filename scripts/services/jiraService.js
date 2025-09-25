// Jira Service Class
export class JiraService {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.jiraUrl.replace(/\/$/, '');
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}/rest/api/3${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${btoa(`${this.config.jiraEmail}:${this.config.jiraApiKey}`)}`
            }
        };

        console.log(`Making ${options.method || 'GET'} request to: ${url}`);

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });

            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (textError) {
                    errorText = `Cannot read response body: ${textError.message}`;
                }

                console.error(`HTTP ${response.status} error:`, errorText);
                const error = new Error(`HTTP ${response.status}: ${errorText}`);
                error.status = response.status;
                error.body = errorText;
                error.url = url;
                throw error;
            }

            if (response.status === 204 || response.status === 205) {
                console.log(`Request successful, no content returned (${response.status})`);
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            if (response.headers.get('content-length') === '0' || !contentType.includes('application/json')) {
                console.log('Request successful, no JSON content returned');
                return null;
            }

            const data = await response.json();
            console.log(`Request successful, received ${data.total !== undefined ? `${data.total} total results` : 'data'}`);
            return data;

        } catch (error) {
            console.error(`Request failed for ${url}:`, error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(`Network error: Cannot connect to ${this.baseUrl}. Please check the URL and your internet connection.`);
            }
            throw error;
        }
    }

    async getJqlCount(jql) {
        // Try the dedicated approximate count endpoint first
        try {
            console.log('Attempting approximate count with /search/approximate-count...');
            const data = await this.makeRequest('/search/approximate-count', {
                method: 'POST',
                body: JSON.stringify({ jql })
            });
            console.log(`Approximate count successful: ${data?.approximateCount ?? 0}`);
            return data?.approximateCount ?? 0;
        } catch (error) {
            console.log(`Approximate count failed (${error.status}), falling back to search...`);
            // Fallback to regular search with minimal results to get total count
            const data = await this.searchIssues({ jql, maxResults: 1 });
            const total = data?.total ?? 0;
            console.log(`Total count from search: ${total}`);
            return total;
        }
    }

    async getIssuesByJql(jql, maxResults = 500) {
        const data = await this.searchIssues({
            jql,
            maxResults,
            fields: ['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter']
        });
        return data?.issues ?? [];
    }

    async checkExistingTestCase(issueKey) {
        const jql = `project = ${this.config.projectKey} AND issuetype = "Test" AND issue in linkedIssues(${issueKey})`;
        return await this.findSingleIssue(jql);
    }

    async checkExistingTestPlan(config) {
        const jql = `project = ${config.projectKey} AND issuetype = "Test Plan" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"Test Plan for Release ${config.fixVersion}\""`;
        return await this.findSingleIssue(jql);
    }

    async checkExistingTestExecution(prefix, config) {
        const jql = `project = ${config.projectKey} AND issuetype = "Test Execution" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"${prefix} Test execution for Release ${config.fixVersion}\""`;
        return await this.findSingleIssue(jql);
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
            console.warn(`Warning: Could not execute JQL check: ${jql}`, error);
            return null;
        }
    }

    async searchIssues({ jql, maxResults = 50, fields }) {
        // Use the new /search/jql endpoint as /search has been deprecated (HTTP 410)
        const searchEndpoint = '/search/jql';
        console.log(`Searching issues with JQL: ${jql} (maxResults: ${maxResults})`);

        try {
            // First try GET request with new API format
            console.log('Attempting GET request with /search/jql endpoint...');
            const queryParams = new URLSearchParams({
                jql,
                maxResults: maxResults.toString()
            });

            if (fields && Array.isArray(fields) && fields.length > 0) {
                queryParams.append('fields', fields.join(','));
                console.log(`Including fields: ${fields.join(', ')}`);
            }

            const result = await this.makeRequest(`${searchEndpoint}?${queryParams.toString()}`, {
                method: 'GET'
            });
            console.log('GET request successful');
            return result;

        } catch (getError) {
            console.log(`GET request failed (${getError.status}): ${getError.message}, trying POST...`);

            // If GET fails, try POST method with new API format
            try {
                const payload = {
                    jql,
                    maxResults,
                    fields: fields && Array.isArray(fields) && fields.length > 0 ? fields : undefined
                };

                // Remove undefined fields from payload
                Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

                const result = await this.makeRequest(searchEndpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                console.log('POST request successful');
                return result;

            } catch (postError) {
                console.log(`POST request failed (${postError.status}): ${postError.message}`);

                // If POST with fields fails, try without fields
                if (fields && postError.status === 400) {
                    console.log('Retrying POST request without fields...');
                    try {
                        const result = await this.makeRequest(searchEndpoint, {
                            method: 'POST',
                            body: JSON.stringify({ jql, maxResults })
                        });
                        console.log('POST request without fields successful');
                        return result;
                    } catch (simplePostError) {
                        console.error(`All search attempts failed. Final error:`, simplePostError);
                        throw simplePostError;
                    }
                }

                // If this is still 410, try the legacy fallback
                if (postError.status === 410) {
                    console.log('New API also deprecated, this should not happen. Check Atlassian documentation for latest endpoint.');
                }

                throw postError;
            }
        }
    }

    async createTestCase(issue, config) {
        // Check if test case already exists
        const existingTestCase = await this.checkExistingTestCase(issue.key);
        if (existingTestCase) {
            return null; // Skip creation
        }

        const testCaseData = {
            fields: {
                project: { key: config.projectKey },
                summary: `${issue.key} | ${issue.fields.issuetype.name} | ${issue.fields.summary}`,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: `Test case for issue ${config.jiraUrl}/browse/${issue.key}`
                                }
                            ]
                        },
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: issue.fields.description ?
                                        (typeof issue.fields.description === 'string' ?
                                            issue.fields.description :
                                            'Description available in original issue') :
                                        ''
                                }
                            ]
                        }
                    ]
                },
                issuetype: { name: 'Test' },
                priority: { name: issue.fields.priority.name },
                components: [{ name: config.componentName }],
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
            }
        };

        const response = await this.makeRequest('/issue', {
            method: 'POST',
            body: JSON.stringify(testCaseData)
        });

        await this.linkIssues(response.key, issue.key);

        return response;
    }

    async createTestPlan(testCases, config) {
        const testPlanData = {
            fields: {
                project: { key: config.projectKey },
                summary: `Test Plan for Release ${config.fixVersion}`,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: `Test plan for release ${config.fixVersion} created on ${new Date().toISOString().split('T')[0]}`
                                }
                            ]
                        },
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: "JQL filter for all tests linked to this test plan:"
                                }
                            ]
                        }
                    ]
                },
                issuetype: { name: 'Test Plan' },
                components: [{ name: config.componentName }],
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
            }
        };

        const response = await this.makeRequest('/issue', {
            method: 'POST',
            body: JSON.stringify(testPlanData)
        });

        // Update description with correct test plan key
        const updatedDescription = {
            type: "doc",
            version: 1,
            content: [
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: `Test plan for release ${config.fixVersion} created on ${new Date().toISOString().split('T')[0]}`
                        }
                    ]
                },
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: "JQL filter for all tests linked to this test plan:"
                        }
                    ]
                },
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: `issue in linkedIssues("${response.key}") AND issueType = Test AND status != Closed`
                        }
                    ]
                }
            ]
        };

        await this.makeRequest(`/issue/${response.key}`, {
            method: 'PUT',
            body: JSON.stringify({
                fields: { description: updatedDescription }
            })
        });

        return response;
    }

    async ensureTestExecutions(testPlan, config) {
        const executions = [];
        const prefixes = ['[RC]', '[PROD]'];
        let createdCount = 0;

        for (const prefix of prefixes) {
            let execution = await this.checkExistingTestExecution(prefix, config);
            if (execution) {
                executions.push(execution);
                continue;
            }

            const testExecutionData = {
                fields: {
                    project: { key: config.projectKey },
                    summary: `${prefix} Test execution for Release ${config.fixVersion}`,
                    description: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: "JQL filter for all tests linked to this test plan:"
                                    }
                                ]
                            },
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: `issue in linkedIssues("${testPlan.key}") AND issueType = Test AND status != Closed`
                                    }
                                ]
                            }
                        ]
                    },
                    issuetype: { name: 'Test Execution' },
                    components: [{ name: config.componentName }],
                    fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
                }
            };

            execution = await this.makeRequest('/issue', {
                method: 'POST',
                body: JSON.stringify(testExecutionData)
            });

            executions.push(execution);
            createdCount += 1;

            // Link execution to test plan via issue link for traceability
            await this.linkIssues(execution.key, testPlan.key);
        }

        return { executions, createdCount };
    }

    async linkIssues(inwardKey, outwardKey, linkType = 'Relates') {
        if (!inwardKey || !outwardKey) {
            return false;
        }

        try {
            await this.makeRequest('/issueLink', {
                method: 'POST',
                body: JSON.stringify({
                    type: { name: linkType },
                    inwardIssue: { key: inwardKey },
                    outwardIssue: { key: outwardKey }
                })
            });
            return true;
        } catch (error) {
            console.warn(`Warning: Could not link ${inwardKey} to ${outwardKey}:`, error);
            return false;
        }
    }

    async linkTestCasesToIssue(testCases, targetIssueKey) {
        let linked = 0;
        let failed = 0;

        for (const testCase of testCases) {
            const testKey = testCase?.key;
            if (!testKey) {
                failed += 1;
                continue;
            }

            const success = await this.linkIssues(testKey, targetIssueKey);
            if (success) {
                linked += 1;
            } else {
                failed += 1;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        return { linked, failed };
    }
}