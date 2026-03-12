// LLM API Client for Xray Test Generator
// Handles communication with Gemini API (Google AI Studio)
class LlmApiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async generateTestSteps(issueSummary, issueDescription, attempt = 0) {
        const prompt = `You are a QA engineer. Based on the following Jira issue, generate 3-7 happy path manual test steps.
        Answers must be in Polish.

Issue summary: ${issueSummary}
Issue description: ${issueDescription || '(no description provided)'}

Rules:
- Only happy path (positive scenario, no error cases)
- Each step must be concrete and directly testable
- Keep action and result short and clear
- "data" field: specific test data/input values if needed, otherwise empty string

Respond ONLY with a valid JSON array. No markdown, no explanation, no code blocks.
Example format:
[{"action":"Open login page","data":"","result":"Login form is displayed"},{"action":"Enter credentials","data":"user@example.com / ValidPass123","result":"Fields are filled"}]`;

        const response = await fetch(`${CONSTANTS.LLM.GEMINI_ENDPOINT}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1024
                }
            })
        });

        if (response.status === 429 && attempt < CONSTANTS.LLM.MAX_RETRIES) {
            const retryDelay = await this._parseRetryDelay(response);
            logger.warn(`Gemini rate limit — waiting ${retryDelay}ms before retry ${attempt + 1}/${CONSTANTS.LLM.MAX_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return this.generateTestSteps(issueSummary, issueDescription, attempt + 1);
        }

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`Gemini API ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Empty response from Gemini');

        // Extract JSON array from response (handles potential stray text)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Could not parse JSON array from Gemini response');

        const steps = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(steps) || steps.length === 0) throw new Error('Gemini returned empty steps array');

        return steps;
    }

    async _parseRetryDelay(response) {
        try {
            const body = await response.clone().json();
            const retryInfo = body?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
            if (retryInfo?.retryDelay) {
                const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
                if (!isNaN(seconds)) return Math.ceil(seconds * 1000) + 1000; // +1s buffer
            }
        } catch (_) { }
        return CONSTANTS.LLM.RETRY_FALLBACK_DELAY_MS;
    }
}
