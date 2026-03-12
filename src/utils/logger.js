// Logger utility for Xray Test Generator
// Controls console output based on development mode
class Logger {
    constructor() {
        this.isDev = this.detectDevMode();
    }

    detectDevMode() {
        // Check if we're in development mode
        // In production, this should be false
        return typeof window !== 'undefined' && 
               (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.protocol === 'chrome-extension:' && window.location.hostname === '');
    }

    info(message, ...args) {
        if (this.isDev) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    debug(message, ...args) {
        if (this.isDev) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        // Always show warnings
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message, ...args) {
        // Always show errors
        console.error(`[ERROR] ${message}`, ...args);
    }
}

// Export singleton instance
const logger = new Logger();

