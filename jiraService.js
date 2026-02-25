// Jira Service Class - Business Logic Layer
// Uses JiraApiClient for API communication
class JiraService {
    constructor(config, errorHandler) {
        this.config = config;
        this.apiClient = new JiraApiClient(config, errorHandler);
        this.lastTestPlanCreated = false;

        // Cache for existing items to avoid duplicate queries
        this.cache = {
            testCases: new Map(),
            testPlans: new Map(),
            testExecutions: new Map()
        };
    }

    async getJqlCount(jql) {
        return await this.apiClient.getJqlCount(jql);
    }

    async getIssuesByJql(jql, maxResults = CONSTANTS.DEFAULT_MAX_RESULTS) {
        return await this.apiClient.getIssuesByJql(jql, maxResults);
    }

    async checkExistingTestCase(issueKey) {
        // Check cache first
        if (this.cache.testCases.has(issueKey)) {
            return this.cache.testCases.get(issueKey);
        }

        const jql = `project = ${this.config.projectKey} AND issuetype = "${CONSTANTS.ISSUE_TYPES.TEST}" AND issue in linkedIssues(${issueKey})`;
        const result = await this.apiClient.findSingleIssue(jql);

        // Cache the result (even if null)
        this.cache.testCases.set(issueKey, result);
        return result;
    }

    async checkExistingTestPlan(config) {
        const cacheKey = `${config.projectKey}-${config.fixVersion}`;

        // Check cache first
        if (this.cache.testPlans.has(cacheKey)) {
            return this.cache.testPlans.get(cacheKey);
        }

        const jql = `project = ${config.projectKey} AND issuetype = "${CONSTANTS.ISSUE_TYPES.TEST_PLAN}" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"Test Plan for Release ${config.fixVersion}\""`;
        const result = await this.apiClient.findSingleIssue(jql);

        // Cache the result
        this.cache.testPlans.set(cacheKey, result);
        return result;
    }

    async checkExistingTestExecution(prefix, config) {
        const cacheKey = `${config.projectKey}-${config.fixVersion}-${prefix}`;

        // Check cache first
        if (this.cache.testExecutions.has(cacheKey)) {
            return this.cache.testExecutions.get(cacheKey);
        }

        const jql = `project = ${config.projectKey} AND issuetype = "${CONSTANTS.ISSUE_TYPES.TEST_EXECUTION}" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"${prefix} Test execution for Release ${config.fixVersion}\""`;
        const result = await this.apiClient.findSingleIssue(jql);

        // Cache the result
        this.cache.testExecutions.set(cacheKey, result);
        return result;
    }

    async createTestCase(issue, config) {
        // Check if test case already exists
        const existingTestCase = await this.checkExistingTestCase(issue.key);
        if (existingTestCase) {
            return null; // Skip creation
        }

        const reporterAccountId = issue.fields.reporter?.accountId;

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
                issuetype: { name: CONSTANTS.ISSUE_TYPES.TEST },
                priority: { name: issue.fields.priority?.name || 'Medium' },
                components: [{ name: config.componentName }],
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : [],
                ...(reporterAccountId && { assignee: { accountId: reporterAccountId } })
            }
        };

        const response = await this.apiClient.createIssue(testCaseData);

        // Link the test case to the original issue
        await this.apiClient.linkIssues(response.key, issue.key);

        return response;
    }

    async createTestPlan(testCases, config) {
        // Check if test plan already exists
        const existingTestPlan = await this.checkExistingTestPlan(config);
        if (existingTestPlan) {
            return existingTestPlan; // Return existing instead of creating duplicate
        }

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
                issuetype: { name: CONSTANTS.ISSUE_TYPES.TEST_PLAN },
                components: [{ name: config.componentName }],
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
            }
        };

        const response = await this.apiClient.createIssue(testPlanData);

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

        await this.apiClient.updateIssue(response.key, {
            fields: { description: updatedDescription }
        });

        return response;
    }

    async ensureTestExecutions(testPlan, config) {
        const executions = [];
        const prefixes = CONSTANTS.TEST_EXECUTION.PREFIXES;
        let createdCount = 0;
        let skippedExecutions = 0;

        for (const prefix of prefixes) {
            let execution = await this.checkExistingTestExecution(prefix, config);
            if (execution) {
                execution._wasExisting = true;
                executions.push(execution);
                skippedExecutions += 1;
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
                    issuetype: { name: CONSTANTS.ISSUE_TYPES.TEST_EXECUTION },
                    components: [{ name: config.componentName }],
                    fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
                }
            };

            execution = await this.apiClient.createIssue(testExecutionData);
            execution._wasExisting = false;

            executions.push(execution);
            createdCount += 1;

            // Link execution to test plan via issue link for traceability
            await this.apiClient.linkIssues(execution.key, testPlan.key);
        }

        return { executions, createdCount, skippedExecutions };
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

            const success = await this.apiClient.linkIssues(testKey, targetIssueKey);
            if (success) {
                linked += 1;
            } else {
                failed += 1;
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, CONSTANTS.TIMEOUTS.LINK_DELAY));
        }

        return { linked, failed };
    }

    clearCache() {
        this.cache.testCases.clear();
        this.cache.testPlans.clear();
        this.cache.testExecutions.clear();
    }
}

