/**
 * Security Layer para Document Detector
 * Implementa protecciones contra bypass de validación
 */

class SecurityLayer {
    constructor() {
        this.initialized = false;
        this.tamperDetected = false;
        this.originalFunctions = new Map();
        this.resourceHashes = new Map();
        this.serverValidationEndpoint = 'http://localhost:3001/api/validate';
        this.allowedDomains = ['localhost', 'your-domain.com'];
        
        this.init();
    }

    init() {
        // this.setupAntiTampering();
        // this.setupResourceIntegrityChecks();
        this.setupDomainValidation();
        // this.setupAntiDebugging();
        // this.preventFetchOverride();
        this.initialized = true;
    }

    // 1. VERIFICACIÓN DE INTEGRIDAD DE RECURSOS REMOTOS
    setupResourceIntegrityChecks() {
        // Hashes SHA-256 esperados de recursos críticos
        this.resourceHashes.set(
            'BlinkIDWasmSDK.worker.min.js',
            'sha256-HASH_ESPERADO_DEL_WORKER_ORIGINAL'
        );
        
        // Intercepción de fetch para verificar integridad
        const originalFetch = window.fetch;
        this.originalFunctions.set('fetch', originalFetch);
        
        window.fetch = async (...args) => {
            const url = args[0];
            const response = await originalFetch.apply(window, args);
            
            if (this.isCriticalResource(url)) {
                const clonedResponse = response.clone();
                const buffer = await clonedResponse.arrayBuffer();
                const hash = await this.computeSHA256(buffer);
                
                if (!this.verifyResourceHash(url, hash)) {
                    throw new Error('Resource integrity check failed');
                }
            }
            
            return response;
        };
    }

    async computeSHA256(buffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return 'sha256-' + btoa(String.fromCharCode(...hashArray));
    }

    isCriticalResource(url) {
        return url.includes('BlinkIDWasmSDK') || 
               url.includes('storage.googleapis.com') ||
               url.includes('jaak-storage');
    }

    verifyResourceHash(url, computedHash) {
        for (const [resource, expectedHash] of this.resourceHashes) {
            if (url.includes(resource)) {
                return computedHash === expectedHash;
            }
        }
        return true; // Allow if not in critical list
    }

    // 2. VALIDACIÓN SERVER-SIDE
    async validateKeyServerSide(key, domain) {
        try {
            const response = await fetch(this.serverValidationEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Domain': domain,
                    'X-Timestamp': Date.now().toString()
                },
                body: JSON.stringify({
                    key: key,
                    domain: domain,
                    userAgent: navigator.userAgent,
                    challenge: this.generateChallenge()
                })
            });

            if (!response.ok) {
                throw new Error('Server validation failed');
            }

            const result = await response.json();
            return result.valid === true;
        } catch (error) {
            console.error('Server validation error:', error);
            return false;
        }
    }

    generateChallenge() {
        // Generar desafío único para prevenir replay attacks
        return btoa(Date.now() + Math.random().toString(36));
    }

    // 3. PROTECCIONES ANTI-DEBUGGING
    setupAntiDebugging() {
        // Detectar DevTools
        let devtools = {open: false, orientation: null};
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > 160 || 
                window.outerWidth - window.innerWidth > 160) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.handleTamperAttempt('DevTools detected');
                }
            }
        }, 500);

        // Debugger traps
        setInterval(() => {
            const start = performance.now();
            debugger;
            const end = performance.now();
            if (end - start > 100) {
                this.handleTamperAttempt('Debugger detected');
            }
        }, 1000);

        // Console override detection
        const originalLog = console.log;
        console.log = function(...args) {
            if (args.join('').includes('bypass') || args.join('').includes('hack')) {
                this.handleTamperAttempt('Suspicious console activity');
            }
            return originalLog.apply(console, args);
        }.bind(this);
    }

    // 4. PREVENIR OVERRIDE DE FUNCIONES CRÍTICAS
    preventFetchOverride() {
        // Congelar funciones críticas
        Object.freeze(window.fetch);
        Object.freeze(XMLHttpRequest.prototype.open);
        Object.freeze(XMLHttpRequest.prototype.send);
        
        // Monitorear cambios en objetos críticos
        this.setupPropertyWatchers();
    }

    setupPropertyWatchers() {
        // Detectar modificaciones a window.fetch
        Object.defineProperty(window, 'fetch', {
            get: () => this.originalFunctions.get('fetch'),
            set: () => {
                this.handleTamperAttempt('Fetch override attempt detected');
                return false;
            }
        });
    }

    // 5. PROTECCIÓN CONTRA MONKEY PATCHING
    setupAntiTampering() {
        // Sellar objetos críticos
        if (window.BlinkService) {
            Object.seal(window.BlinkService);
            Object.freeze(window.BlinkService.initialize);
        }

        // Monitorear modificaciones de prototipos
        const originalDefineProperty = Object.defineProperty;
        Object.defineProperty = function(obj, prop, descriptor) {
            if (obj === window && prop === 'BlinkService') {
                this.handleTamperAttempt('BlinkService modification attempt');
                return;
            }
            return originalDefineProperty.call(Object, obj, prop, descriptor);
        }.bind(this);
    }

    // 6. VALIDACIÓN DE DOMINIO
    setupDomainValidation() {
        const currentDomain = window.location.hostname;
        if (!this.allowedDomains.includes(currentDomain)) {
            throw new Error(`Unauthorized domain: ${currentDomain}`);
        }
    }

    // 7. VALIDACIÓN ROBUSTA DE CLAVE
    async validateKey(key) {
        // Validaciones client-side básicas
        if (!key || typeof key !== 'string') {
            return false;
        }

        if (!/^[A-Za-z0-9+/]+=*$/.test(key)) {
            return false; // Formato base64 inválido
        }

        // Para desarrollo local, permitir claves específicas sin validación de servidor
        const devKeys = [
            'dGVzdC1rZXktZm9yLWxvY2FsLWRldmVsb3BtZW50LTEyMzQ1Ng==',
            'bG9jYWxob3N0LXRlc3Qta2V5LWZvci1qYWFrLWRvY3VtZW50LWRldGVjdG9y'
        ];
        
        if (devKeys.includes(key)) {
            return true;
        }

        // Validación server-side (crítica)
        const domain = window.location.hostname;
        const serverValid = await this.validateKeyServerSide(key, domain);
        
        if (!serverValid) {
            this.handleTamperAttempt('Invalid key detected');
            return false;
        }

        return true;
    }

    // 8. MANEJO DE INTENTOS DE TAMPER
    handleTamperAttempt(reason) {
        this.tamperDetected = true;
        console.warn(`Security violation: ${reason}`);
        
        // Reportar al servidor
        this.reportSecurityViolation(reason);
        
        // Desactivar funcionalidad
        this.disableComponent();
        
        // Redirigir o mostrar error
        document.body.innerHTML = '<h1>Security Error</h1><p>Unauthorized access detected.</p>';
    }

    async reportSecurityViolation(reason) {
        try {
            await fetch('https://your-server.com/api/security-violation', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    reason: reason,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    domain: window.location.hostname
                })
            });
        } catch (error) {
            // Log silently
        }
    }

    disableComponent() {
        // Desactivar el document detector
        const detector = document.getElementById('documentDetector');
        if (detector) {
            detector.style.display = 'none';
        }
        
        // Limpiar event listeners
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    // 9. VERIFICACIÓN DE INTEGRIDAD DEL CÓDIGO
    verifyCodeIntegrity() {
        // Verificar que las funciones críticas no han sido modificadas
        const criticalFunctions = [
            'BlinkService.initialize',
            'document.getElementById',
            'addEventListener'
        ];

        criticalFunctions.forEach(funcPath => {
            if (this.isFunctionModified(funcPath)) {
                this.handleTamperAttempt(`Function ${funcPath} has been modified`);
            }
        });
    }

    isFunctionModified(funcPath) {
        // Implementar verificación de hash de funciones críticas
        const parts = funcPath.split('.');
        let obj = window;
        
        for (const part of parts) {
            obj = obj[part];
            if (!obj) return false;
        }
        
        return obj.toString().includes('bypass') || obj.toString().includes('hack');
    }

    // 10. RATE LIMITING
    setupRateLimit() {
        const attempts = new Map();
        const maxAttempts = 3;
        const timeWindow = 60000; // 1 minuto

        return function rateLimitCheck(key) {
            const now = Date.now();
            const userKey = key || 'anonymous';
            
            if (!attempts.has(userKey)) {
                attempts.set(userKey, []);
            }
            
            const userAttempts = attempts.get(userKey);
            
            // Limpiar intentos antiguos
            const recentAttempts = userAttempts.filter(time => now - time < timeWindow);
            
            if (recentAttempts.length >= maxAttempts) {
                throw new Error('Rate limit exceeded');
            }
            
            recentAttempts.push(now);
            attempts.set(userKey, recentAttempts);
            
            return true;
        };
    }
}

// Inicializar capa de seguridad inmediatamente
const securityLayer = new SecurityLayer();

// Exportar para uso en el componente principal
window.SecurityLayer = SecurityLayer;
window.securityLayer = securityLayer;