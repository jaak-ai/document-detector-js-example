/**
 * Server-Side Validation API
 * Endpoint seguro para validación de claves
 */

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// CORS para desarrollo local
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Domain, X-Timestamp');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Rate limiting agresivo
const validationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por IP
    message: 'Too many validation attempts',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/validate', validationLimiter);

// Base de datos de claves válidas (en producción usar DB encriptada)
const VALID_KEYS = new Map([
    ['dGVzdC1rZXktZm9yLWxvY2FsLWRldmVsb3BtZW50LTEyMzQ1Ng==', {
        domain: 'localhost',
        expiry: '2025-12-31',
        permissions: ['document-detection', 'ocr'],
        maxUses: 1000,
        currentUses: 0
    }],
    ['bG9jYWxob3N0LXRlc3Qta2V5LWZvci1qYWFrLWRvY3VtZW50LWRldGVjdG9y', {
        domain: '127.0.0.1',
        expiry: '2025-12-31',
        permissions: ['document-detection', 'ocr'],
        maxUses: 1000,
        currentUses: 0
    }]
]);

// Dominios permitidos
const ALLOWED_DOMAINS = ['localhost', 'your-domain.com', '127.0.0.1'];

// Challenges activos (en producción usar Redis)
const activechallenges = new Map();

class ValidationService {
    
    static validateKeyFormat(key) {
        // Validar formato base64
        if (!key || typeof key !== 'string') {
            return false;
        }
        
        // Debe ser base64 válido
        if (!/^[A-Za-z0-9+/]+=*$/.test(key)) {
            return false;
        }
        
        // Longitud mínima de seguridad
        if (key.length < 32) {
            return false;
        }
        
        return true;
    }
    
    static validateDomain(domain, allowedDomains) {
        if (!domain || typeof domain !== 'string') {
            return false;
        }
        
        // Normalizar dominio
        domain = domain.toLowerCase().trim();
        
        // Verificar si está en la lista permitida
        return allowedDomains.includes(domain);
    }
    
    static validateTimestamp(timestamp) {
        const now = Date.now();
        const requestTime = parseInt(timestamp);
        
        // Permitir solo requests de los últimos 5 minutos
        const maxAge = 5 * 60 * 1000; // 5 minutos
        
        return requestTime > (now - maxAge) && requestTime <= now;
    }
    
    static generateChallenge() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    static verifyChallenge(challenge, providedChallenge) {
        // Verificar que el challenge existe y coincide
        const storedChallenge = activechallenges.get(challenge);
        
        if (!storedChallenge) {
            return false;
        }
        
        // Challenge de un solo uso
        activechallenges.delete(challenge);
        
        // Verificar que no ha expirado (5 minutos)
        const now = Date.now();
        if (now - storedChallenge.timestamp > 5 * 60 * 1000) {
            return false;
        }
        
        return storedChallenge.value === providedChallenge;
    }
    
    static validateKey(key, domain) {
        const keyData = VALID_KEYS.get(key);
        
        if (!keyData) {
            return { valid: false, reason: 'Key not found' };
        }
        
        // Verificar dominio
        if (keyData.domain !== domain && keyData.domain !== '*') {
            return { valid: false, reason: 'Domain mismatch' };
        }
        
        // Verificar expiración
        if (new Date(keyData.expiry) < new Date()) {
            return { valid: false, reason: 'Key expired' };
        }
        
        // Verificar uso máximo
        if (keyData.currentUses >= keyData.maxUses) {
            return { valid: false, reason: 'Usage limit exceeded' };
        }
        
        // Incrementar contador de uso
        keyData.currentUses++;
        
        return { 
            valid: true, 
            permissions: keyData.permissions,
            remainingUses: keyData.maxUses - keyData.currentUses
        };
    }
    
    static logValidationAttempt(ip, domain, key, result, userAgent) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ip: ip,
            domain: domain,
            keyHash: crypto.createHash('sha256').update(key).digest('hex').substring(0, 8),
            result: result.valid ? 'SUCCESS' : 'FAILED',
            reason: result.reason || 'Success',
            userAgent: userAgent
        };
        
        console.log('VALIDATION_LOG:', JSON.stringify(logEntry));
        
        // En producción, enviar a sistema de logging seguro
        // await secureLogger.log(logEntry);
    }
}

// Endpoint de validación principal
app.post('/api/validate', async (req, res) => {
    try {
        const { key, domain, userAgent, challenge } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        const timestamp = req.headers['x-timestamp'];
        const requestDomain = req.headers['x-domain'];
        
        // Validaciones básicas
        if (!ValidationService.validateKeyFormat(key)) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Invalid key format' 
            });
        }
        
        if (!ValidationService.validateDomain(domain, ALLOWED_DOMAINS)) {
            return res.status(403).json({ 
                valid: false, 
                error: 'Unauthorized domain' 
            });
        }
        
        if (!ValidationService.validateTimestamp(timestamp)) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Invalid timestamp' 
            });
        }
        
        // Verificar que el dominio del header coincide con el del body
        if (requestDomain !== domain) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Domain mismatch' 
            });
        }
        
        // Validar la clave
        const validationResult = ValidationService.validateKey(key, domain);
        
        // Log del intento de validación
        ValidationService.logValidationAttempt(
            clientIP, 
            domain, 
            key, 
            validationResult, 
            userAgent
        );
        
        if (!validationResult.valid) {
            return res.status(403).json({
                valid: false,
                error: validationResult.reason
            });
        }
        
        // Generar token de sesión si la validación es exitosa
        const sessionToken = crypto.randomBytes(32).toString('hex');
        
        res.json({
            valid: true,
            sessionToken: sessionToken,
            permissions: validationResult.permissions,
            remainingUses: validationResult.remainingUses,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
        });
        
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ 
            valid: false, 
            error: 'Internal server error' 
        });
    }
});

// Endpoint para generar challenges
app.post('/api/challenge', (req, res) => {
    const challenge = ValidationService.generateChallenge();
    const challengeData = {
        value: challenge,
        timestamp: Date.now()
    };
    
    // Almacenar challenge temporalmente
    activechallenges.set(challenge, challengeData);
    
    // Limpiar challenges expirados
    setTimeout(() => {
        activechallenges.delete(challenge);
    }, 5 * 60 * 1000); // 5 minutos
    
    res.json({ challenge });
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        activeKeys: VALID_KEYS.size,
        activeChallenges: activechallenges.size
    });
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        valid: false, 
        error: 'Internal server error' 
    });
});

// Limpiar challenges expirados cada minuto
setInterval(() => {
    const now = Date.now();
    for (const [key, challenge] of activechallenges.entries()) {
        if (now - challenge.timestamp > 5 * 60 * 1000) {
            activechallenges.delete(key);
        }
    }
}, 60 * 1000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Validation server running on port ${PORT}`);
});

module.exports = app;