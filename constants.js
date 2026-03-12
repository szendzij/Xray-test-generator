// Constants for Xray Test Generator
const CONSTANTS = {
    API: {
        BASE_PATH: '/rest/api/3',
        ENDPOINTS: {
            ISSUE: '/issue',
            ISSUE_LINK: '/issueLink',
            SEARCH_JQL: '/search/jql',
            SEARCH_APPROXIMATE_COUNT: '/search/approximate-count'
        }
    },
    TIMEOUTS: {
        API_DELAY: 500,
        UI_ANIMATION: 200,
        CONFIG_SAVE_DELAY: 100,
        LINK_DELAY: 200,
        DEBOUNCE_SAVE: 300
    },
    TEST_EXECUTION: {
        PREFIXES: ['[RC]', '[PROD]'],
        LINK_TYPE: 'Relates'
    },
    STORAGE: {
        KEYS: [
            'jiraUrl',
            'jiraEmail',
            'jiraApiKey',
            'customJql',
            'customProjectKey',
            'customComponentName',
            'customFixVersion'
        ],
        LANG_KEY: 'xray-lang'
    },
    JQL_MODE: {
        AUTO: 'auto',
        CUSTOM: 'custom'
    },
    STEPS: {
        MIN: 1,
        MAX: 3,
        LOGIN: 1,
        PARAMETERS: 2,
        EXECUTION: 3
    },
    STATUS_IDS: {
        CONNECTION: 'connectionStatus',
        PARAMETERS: 'parametersStatus',
        MAIN: 'status'
    },
    VALIDATION: {
        MIN_API_KEY_LENGTH: 10,
        MIN_JQL_LENGTH: 10,
        ERROR_COLOR: '#f44336'
    },
    PROGRESS: {
        INITIALIZATION: 0,
        FETCH_ISSUES_START: 10,
        FETCH_ISSUES_COMPLETE: 20,
        CREATE_TEST_CASES_START: 20,
        CREATE_TEST_CASES_COMPLETE: 60,
        AI_STEPS_START: 62,
        AI_STEPS_COMPLETE: 68,
        CREATE_TEST_PLAN_START: 70,
        CREATE_TEST_PLAN_COMPLETE: 80,
        LINK_TEST_CASES: 85,
        CREATE_TEST_EXECUTIONS_START: 90,
        COMPLETE: 100
    },
    DEFAULT_MAX_RESULTS: 500,
    XRAY: {
        BASE_URL: 'https://eu.xray.cloud.getxray.app'
    },
    LLM: {
        GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent',
        MAX_RETRIES: 3,
        RETRY_FALLBACK_DELAY_MS: 20000
    },
    ISSUE_TYPES: {
        TEST: 'Test',
        TEST_PLAN: 'Test Plan',
        TEST_EXECUTION: 'Test Execution'
    }
};

