// LLM API Client for Xray Test Generator
// Handles communication with Gemini API (Google AI Studio)
class LlmApiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async generateTestSteps(issueSummary, issueDescription, attempt = 0) {
        const prompt = `Role: You are a Senior Manual QA Engineer with expertise in black-box testing.

Context: You are analyzing a new Jira issue to prepare manual test execution steps. You test software strictly from the end-user's perspective. You do not have access to the source code and you are completely technology-agnostic.

Goal: Generate a "Happy Path" manual test scenario (positive flow only, no edge cases, no error handling) based on the provided Jira summary and description. 

Language: All generated text inside the JSON output (actions, results, data) MUST be in Polish.

Constraints & Rules:
1. STRICT LENGTH: You MUST generate a minimum of 3 and a maximum of 7 test steps. Do not exceed 7 steps under any circumstances.
2. NO HALLUCINATIONS & NO TECH STACK: Do NOT mention, guess, or append any programming languages, frameworks (e.g., React, Angular), databases, automation tools, or specific software versions UNLESS they are explicitly written in the provided Jira description. Focus solely on functional UI/API behavior.
3. Step Quality: Each step must be a concrete, directly testable action. Keep the "action" and "result" fields short, clear, and imperative.
4. Data Field: Provide specific mock test data/input values in the "data" field if the step requires user input. If no input is needed, leave it as exactly "".

Output Format:
Respond ONLY with a valid, raw JSON array. 
CRITICAL: Do not use Markdown formatting, do not use json code blocks, do not add any greetings, summaries, or explanations. Start immediately with [ and end with ].

Example Output format:
[
  {"action": "Otwórz stronę logowania", "data": "", "result": "Wyświetla się formularz logowania"},
  {"action": "Wprowadź poprawne dane logowania", "data": "user@example.com / ValidPass123", "result": "Pola logowania i hasła zostały wypełnione"}
]

Input Data:
Issue summary: ${issueSummary}
Issue description: ${issueDescription || '(no description provided)'}`;

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
