# Xray Test Generator for Jira

**Xray Test Generator** is a powerful Chrome extension designed to streamline the quality assurance process by automatically generating Xray Test Cases, Test Plans, and Test Executions directly from your Jira issues.

This tool is perfect for development teams and QA engineers who want to reduce manual effort, ensure consistency, and accelerate their testing cycles within the Jira ecosystem.

## ✨ Features

-   **Automated Test Case Creation:** Generates Xray Test Cases from existing Jira issues, pre-filling key details like summary, description, and priority.
-   **Intelligent JQL Queries:** Use a simple form to automatically build a JQL query for issues with merged pull requests, or write your own custom JQL for full control.
-   **Automatic Test Plan Management:** Creates a new Test Plan for a specific release version or adds new tests to an existing one.
-   **Test Execution Scaffolding:** Automatically creates `[RC]` (Release Candidate) and `[PROD]` (Production) Test Execution tickets, linked to the corresponding Test Plan.
-   **Secure & Local:** All your configuration, including your Jira API key, is stored securely in your browser's local storage and never sent to an external server.
-   **Interactive UI:** A multi-step, user-friendly interface guides you through the entire process, from configuration to generation.
-   **Real-time Validation & Feedback:** Provides instant validation for your configuration and detailed logs of the generation process.

## 🚀 Installation

To install the extension, you need to load it manually in developer mode:

1.  **Download the Code:** Clone or download this repository to your local machine.
2.  **Open Chrome Extensions:** Open Google Chrome and navigate to `chrome://extensions`.
3.  **Enable Developer Mode:** In the top-right corner, toggle the "Developer mode" switch on.
4.  **Load the Extension:**
    *   Click the **"Load unpacked"** button.
    *   Select the directory where you cloned or downloaded this repository.
5.  **Done!** The "Xray Test Generator" icon (🚀) should now appear in your Chrome toolbar.

## 🛠️ How to Use

Once installed, using the generator is a simple, three-step process.

### Step 1: Configuration & Connection

1.  Navigate to any Jira page.
2.  Click the **Xray Test Generator** icon (🚀) in your toolbar to open the side panel.
3.  **Enter your Jira details:**
    *   **Jira Base URL:** The root URL of your Jira instance (e.g., `https://your-domain.atlassian.net`).
    *   **Jira Email:** The email address associated with your Jira account.
    *   **Jira API Key:** Your Jira API key. [Learn how to create one here](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).
4.  Click **"🔍 Sprawdź połączenie"** (Check Connection) to verify your credentials. A success message will appear if the connection is valid.
5.  Click **"Dalej"** (Next).

### Step 2: Set Generation Parameters

You have two modes for selecting which Jira issues to target:

**A) Automatic JQL (Recommended)**
This mode automatically finds issues that have been recently developed and are ready for testing.
-   **Fix Version:** The release version you are testing (e.g., `25.9`).
-   **Project Key:** The key for your Jira project (e.g., `RES`).
-   **Component Name:** The component to associate with the new tests.

**B) Custom JQL**
This mode gives you full control to specify exactly which issues to use.
-   **Własne zapytanie JQL:** Enter your complete JQL query.
-   **Fix Version, Project Key, Component Name:** Provide the details for the *new tests* that will be created.

After configuring, click **"Dalej"** (Next).

### Step 3: Generate Tests

1.  You are now ready to start the process.
2.  Click the **"🚀 Generuj testy"** (Generate Tests) button.
3.  The extension will now perform the following actions, with real-time progress shown in the log panel:
    *   Fetch all Jira issues matching your query.
    *   Create a Test Case for each issue (if one doesn't already exist).
    *   Create a Test Plan for the specified `fixVersion` (or use an existing one).
    *   Create `[RC]` and `[PROD]` Test Executions.
    *   Link all newly created tests to the Test Plan and Test Executions.
4.  Once finished, you'll see a success message. You can click the links in the logs to navigate directly to the newly created items in Jira.

## 💻 Development

This project has been refactored for a modern, modular development workflow.

### Project Structure

The codebase is organized as follows:

```
/
├── scripts/
│   ├── services/       # API interaction (jiraService.js)
│   ├── ui/             # UI component logic (form.js, logger.js, stepper.js)
│   ├── utils/          # Reusable helper functions (api.js, config.js, etc.)
│   ├── background.js   # Background service worker
│   ├── content.js      # Content script injected into Jira pages
│   └── main.js         # Main application entry point for the side panel
├── sidepanel.html      # The HTML structure for the side panel
├── manifest.json       # Extension manifest file
└── README.md           # This file
```

### Technology Stack

-   **JavaScript (ES6+):** Modern JavaScript with modules for clean, organized code.
-   **HTML5 & CSS3:** For the side panel interface.
-   **Chrome Extension Manifest V3:** The latest standard for Chrome extensions.
-   **No external frameworks:** The project is built with vanilla JavaScript to keep it lightweight and fast.

### Getting Started with Development

1.  Follow the [Installation](#-installation) steps to load the extension.
2.  Make changes to the source code in the `scripts/` directory.
3.  To see your changes, go back to `chrome://extensions` and click the **"Reload"** button for the Xray Test Generator extension.
4.  Open the side panel in Jira to test your changes.

---

*This project is intended for internal use and is not affiliated with Atlassian or Xray.*