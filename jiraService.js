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

    // --- Helpers ---

    buildAdfDoc(...paragraphs) {
        return {
            type: "doc",
            version: 1,
            content: paragraphs.map(text => ({
                type: "paragraph",
                content: [{ type: "text", text }]
            }))
        };
    }

    async checkCached(store, key, jql) {
        if (this.cache[store].has(key)) return this.cache[store].get(key);
        const result = await this.apiClient.findSingleIssue(jql);
        this.cache[store].set(key, result);
        return result;
    }

    // --- Public API ---

    async getJqlCount(jql) {
        return await this.apiClient.getJqlCount(jql);
    }

    async getIssuesByJql(jql, maxResults = CONSTANTS.DEFAULT_MAX_RESULTS) {
        return await this.apiClient.getIssuesByJql(jql, maxResults);
    }

    async checkExistingTestCase(issueKey) {
        const jql = `project = ${this.config.projectKey} AND issuetype = "${CONSTANTS.ISSUE_TYPES.TEST}" AND issue in linkedIssues(${issueKey})`;
        return this.checkCached('testCases', issueKey, jql);
    }

    async checkExistingTestPlan(config) {
        const cacheKey = `${config.projectKey}-${config.fixVersion}`;
        const jql = `project = ${config.projectKey} AND issuetype = "${CONSTANTS.ISSUE_TYPES.TEST_PLAN}" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"Test Plan for Release ${config.fixVersion}\""`;
        return this.checkCached('testPlans', cacheKey, jql);
    }

    async checkExistingTestExecution(prefix, config) {
        const cacheKey = `${config.projectKey}-${config.fixVersion}-${prefix}`;
        const jql = `project = ${config.projectKey} AND issuetype = "${CONSTANTS.ISSUE_TYPES.TEST_EXECUTION}" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"${prefix} Test execution for Release ${config.fixVersion}\""`;
        return this.checkCached('testExecutions', cacheKey, jql);
    }

    async createTestCase(issue, config) {
        const existingTestCase = await this.checkExistingTestCase(issue.key);
        if (existingTestCase) return null;

        const reporterAccountId = issue.fields.reporter?.accountId;
        const sourceDescription = issue.fields.description;
        const linkParagraph = {
            type: 'paragraph',
            content: [{ type: 'text', text: `Test case for issue ${config.jiraUrl}/browse/${issue.key}` }]
        };
        const description = (sourceDescription?.type === 'doc' && Array.isArray(sourceDescription.content))
            ? { type: 'doc', version: 1, content: [linkParagraph, ...sourceDescription.content] }
            : this.buildAdfDoc(`Test case for issue ${config.jiraUrl}/browse/${issue.key}`);

        const testCaseData = {
            fields: {
                project: { key: config.projectKey },
                summary: `${issue.key} | ${issue.fields.issuetype.name} | ${issue.fields.summary}`,
                description,
                issuetype: { name: CONSTANTS.ISSUE_TYPES.TEST },
                priority: { name: issue.fields.priority?.name || 'Medium' },
                components: [{ name: config.componentName }],
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : [],
                ...(reporterAccountId && { assignee: { accountId: reporterAccountId } })
            }
        };

        const response = await this.apiClient.createIssue(testCaseData);
        await this.apiClient.linkIssues(response.key, issue.key);
        return response;
    }

    async createTestPlan(testCases, config) {
        const existingTestPlan = await this.checkExistingTestPlan(config);
        if (existingTestPlan) return existingTestPlan;

        const date = new Date().toISOString().split('T')[0];
        const testPlanData = {
            fields: {
                project: { key: config.projectKey },
                summary: `Test Plan for Release ${config.fixVersion}`,
                description: this.buildAdfDoc(
                    `Test plan for release ${config.fixVersion} created on ${date}`,
                    "JQL filter for all tests linked to this test plan:"
                ),
                issuetype: { name: CONSTANTS.ISSUE_TYPES.TEST_PLAN },
                components: [{ name: config.componentName }],
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
            }
        };

        const response = await this.apiClient.createIssue(testPlanData);

        await this.apiClient.updateIssue(response.key, {
            fields: {
                description: this.buildAdfDoc(
                    `Test plan for release ${config.fixVersion} created on ${date}`,
                    "JQL filter for all tests linked to this test plan:",
                    `issue in linkedIssues("${response.key}") AND issueType = Test AND status != Closed`
                )
            }
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
                    description: this.buildAdfDoc(
                        "JQL filter for all tests linked to this test plan:",
                        `issue in linkedIssues("${testPlan.key}") AND issueType = Test AND status != Closed`
                    ),
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

