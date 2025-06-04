/**
 * WASM Debugging and Troubleshooting Script
 * Run this to diagnose WASM loading issues
 */

class WASMDebugger {
    constructor() {
        this.results = [];
    }

    log(message, status = 'info') {
        const result = { message, status, timestamp: new Date().toISOString() };
        this.results.push(result);
        
        const prefix = status === 'error' ? '❌' : status === 'warning' ? '⚠️' : '✅';
        console.log(`${prefix} ${message}`);
    }

    async runDiagnostics() {
        console.log('🔍 Starting WASM Diagnostics...\n');

        // 1. Check WebAssembly support
        this.checkWebAssemblySupport();

        // 2. Check SharedArrayBuffer support
        this.checkSharedArrayBufferSupport();

        // 3. Check Cross-Origin Isolation
        this.checkCrossOriginIsolation();

        // 4. Check Security Headers
        await this.checkSecurityHeaders();

        // 5. Check CDN accessibility
        await this.checkCDNAccessibility();

        // 6. Check browser compatibility
        this.checkBrowserCompatibility();

        // 7. Generate report
        this.generateReport();
    }

    checkWebAssemblySupport() {
        if (typeof WebAssembly === 'undefined') {
            this.log('WebAssembly is not supported in this browser', 'error');
            return false;
        }

        if (typeof WebAssembly.instantiate !== 'function') {
            this.log('WebAssembly.instantiate is not available', 'error');
            return false;
        }

        this.log('WebAssembly is supported');
        return true;
    }

    checkSharedArrayBufferSupport() {
        if (typeof SharedArrayBuffer === 'undefined') {
            this.log('SharedArrayBuffer is not available. This may prevent some WASM modules from working.', 'warning');
            this.log('Solution: Enable cross-origin isolation headers (COOP/COEP)', 'info');
            return false;
        }

        this.log('SharedArrayBuffer is available');
        return true;
    }

    checkCrossOriginIsolation() {
        if (!window.crossOriginIsolated) {
            this.log('Cross-origin isolation is not enabled', 'warning');
            this.log('Add these headers: Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp', 'info');
            return false;
        }

        this.log('Cross-origin isolation is enabled');
        return true;
    }

    async checkSecurityHeaders() {
        try {
            const response = await fetch(window.location.href, { method: 'HEAD' });
            const headers = response.headers;

            // Check COOP
            const coop = headers.get('cross-origin-opener-policy');
            if (!coop || coop !== 'same-origin') {
                this.log('Missing or incorrect Cross-Origin-Opener-Policy header', 'warning');
            } else {
                this.log('Cross-Origin-Opener-Policy header is correct');
            }

            // Check COEP
            const coep = headers.get('cross-origin-embedder-policy');
            if (!coep || coep !== 'require-corp') {
                this.log('Missing or incorrect Cross-Origin-Embedder-Policy header', 'warning');
            } else {
                this.log('Cross-Origin-Embedder-Policy header is correct');
            }

        } catch (error) {
            this.log(`Error checking headers: ${error.message}`, 'error');
        }
    }

    async checkCDNAccessibility() {
        const cdnUrls = [
            'https://unpkg.com/@jaak.ai/document-detector@3.0.0-dev.5',
            'https://cdn.jsdelivr.net/npm/@jaak.ai/document-detector@3.0.0-dev.5',
            'https://storage.googleapis.com'
        ];

        for (const url of cdnUrls) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    this.log(`CDN accessible: ${url}`);
                } else {
                    this.log(`CDN returned ${response.status}: ${url}`, 'warning');
                }
            } catch (error) {
                this.log(`CDN not accessible: ${url} - ${error.message}`, 'error');
            }
        }
    }

    checkBrowserCompatibility() {
        const userAgent = navigator.userAgent;
        const browserInfo = this.getBrowserInfo(userAgent);

        this.log(`Browser: ${browserInfo.name} ${browserInfo.version}`);

        // Check minimum browser versions for WASM support
        const minVersions = {
            chrome: 57,
            firefox: 52,
            safari: 11,
            edge: 16
        };

        const browserName = browserInfo.name.toLowerCase();
        const browserVersion = parseInt(browserInfo.version);

        if (minVersions[browserName] && browserVersion < minVersions[browserName]) {
            this.log(`Browser version may not fully support WASM features. Minimum recommended: ${minVersions[browserName]}`, 'warning');
        } else {
            this.log('Browser version supports WASM features');
        }
    }

    getBrowserInfo(userAgent) {
        if (userAgent.includes('Chrome')) {
            const match = userAgent.match(/Chrome\/(\d+)/);
            return { name: 'Chrome', version: match ? match[1] : 'unknown' };
        } else if (userAgent.includes('Firefox')) {
            const match = userAgent.match(/Firefox\/(\d+)/);
            return { name: 'Firefox', version: match ? match[1] : 'unknown' };
        } else if (userAgent.includes('Safari')) {
            const match = userAgent.match(/Version\/(\d+)/);
            return { name: 'Safari', version: match ? match[1] : 'unknown' };
        } else if (userAgent.includes('Edge')) {
            const match = userAgent.match(/Edge\/(\d+)/);
            return { name: 'Edge', version: match ? match[1] : 'unknown' };
        }
        return { name: 'Unknown', version: 'unknown' };
    }

    generateReport() {
        console.log('\n📊 DIAGNOSTIC REPORT');
        console.log('=====================');

        const errors = this.results.filter(r => r.status === 'error');
        const warnings = this.results.filter(r => r.status === 'warning');
        const successes = this.results.filter(r => r.status === 'info');

        console.log(`✅ Successful checks: ${successes.length}`);
        console.log(`⚠️ Warnings: ${warnings.length}`);
        console.log(`❌ Errors: ${errors.length}`);

        if (errors.length > 0) {
            console.log('\n❌ CRITICAL ISSUES:');
            errors.forEach(error => console.log(`   • ${error.message}`));
        }

        if (warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            warnings.forEach(warning => console.log(`   • ${warning.message}`));
        }

        console.log('\n🔧 RECOMMENDED SOLUTIONS:');
        
        if (errors.some(e => e.message.includes('WebAssembly'))) {
            console.log('   • Update your browser to a version that supports WebAssembly');
        }
        
        if (warnings.some(w => w.message.includes('SharedArrayBuffer'))) {
            console.log('   • Enable cross-origin isolation headers in your server configuration');
            console.log('   • Use the provided static-server.js instead of live-server');
        }
        
        if (warnings.some(w => w.message.includes('CDN'))) {
            console.log('   • Check your internet connection');
            console.log('   • Try alternative CDN sources');
            console.log('   • Check if your network/firewall blocks external resources');
        }

        console.log('\n📋 Full results available in: WASMDebugger.results');
        window.WASMDebugResults = this.results;
    }
}

// Auto-run diagnostics when script loads
const debugger = new WASMDebugger();
debugger.runDiagnostics();

// Make debugger available globally
window.WASMDebugger = debugger;