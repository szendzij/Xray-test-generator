// Error Handler for Xray Test Generator
// Centralizes error handling and provides retry logic
class ErrorHandler {
    constructor() {
        this.maxRetries = 3;
        this.baseDelay = 1000; // 1 second
    }

    handleError(error, context = '') {
        const errorMessage = this.getUserFriendlyMessage(error);
        logger.error(`Error in ${context}:`, errorMessage, error);
        
        return {
            message: errorMessage,
            originalError: error,
            context
        };
    }

    getUserFriendlyMessage(error) {
        if (error.message) {
            // Network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return 'Błąd sieci: Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.';
            }
            
            // HTTP errors
            if (error.status) {
                if (error.status === 401 || error.status === 403) {
                    return 'Błąd autoryzacji: Sprawdź dane logowania (email i API Key).';
                }
                if (error.status === 404) {
                    return 'Nie znaleziono zasobu. Sprawdź czy URL jest poprawny.';
                }
                if (error.status >= 500) {
                    return 'Błąd serwera. Spróbuj ponownie później.';
                }
                return `Błąd HTTP ${error.status}: ${error.message}`;
            }
            
            // Return the error message if it's user-friendly
            return error.message;
        }
        
        return 'Wystąpił nieoczekiwany błąd.';
    }

    async retry(fn, maxRetries = this.maxRetries, context = '') {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (this.shouldNotRetry(error)) {
                    throw error;
                }
                
                if (attempt < maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms for ${context}`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    shouldNotRetry(error) {
        // Don't retry on authentication errors or client errors (4xx except 429)
        if (error.status) {
            if (error.status === 401 || error.status === 403 || error.status === 404) {
                return true;
            }
            // Retry on 429 (rate limit) and 5xx errors
            return false;
        }
        
        // Don't retry on validation errors
        if (error.message && (
            error.message.includes('jest wymagane') ||
            error.message.includes('musi zaczynać się') ||
            error.message.includes('Nieprawidłowy format')
        )) {
            return true;
        }
        
        return false;
    }

    calculateDelay(attempt) {
        // Exponential backoff: 1s, 2s, 4s
        return this.baseDelay * Math.pow(2, attempt);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async withRetry(fn, context = '', maxRetries = this.maxRetries) {
        return this.retry(fn, maxRetries, context);
    }
}

