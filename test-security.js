#!/usr/bin/env node

/**
 * Script de pruebas de seguridad para Document Detector
 * Verifica que todas las protecciones funcionan correctamente
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const assert = require('assert');

class SecurityTester {
    constructor() {
        this.serverUrl = 'http://localhost:3001';
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Iniciando pruebas de seguridad...\n');

        // Pruebas del servidor de validación
        await this.testValidKeyValidation();
        await this.testInvalidKeyValidation();
        await this.testDomainValidation();
        await this.testRateLimiting();
        await this.testTimestampValidation();
        
        // Resumen de resultados
        this.printResults();
    }

    async testValidKeyValidation() {
        console.log('1️⃣ Probando validación de clave VÁLIDA...');
        
        try {
            const validKey = 'dGVzdC1rZXktZm9yLWxvY2FsLWRldmVsb3BtZW50LTEyMzQ1Ng==';
            const response = await this.makeValidationRequest(validKey, 'localhost');
            
            assert.strictEqual(response.status, 200, 'Respuesta debe ser 200 OK');
            
            const data = await response.json();
            assert.strictEqual(data.valid, true, 'Clave válida debe ser aceptada');
            assert(data.sessionToken, 'Debe retornar token de sesión');
            assert(data.permissions, 'Debe incluir permisos');
            
            this.addResult('✅ Validación de clave válida', 'PASS', 'Clave válida correctamente aceptada');
            
        } catch (error) {
            this.addResult('❌ Validación de clave válida', 'FAIL', error.message);
        }
    }

    async testInvalidKeyValidation() {
        console.log('2️⃣ Probando validación de clave INVÁLIDA...');
        
        try {
            const invalidKey = 'invalid-key-test-123';
            const response = await this.makeValidationRequest(invalidKey, 'localhost');
            
            assert.strictEqual(response.status, 400, 'Clave inválida debe retornar 400');
            
            const data = await response.json();
            assert.strictEqual(data.valid, false, 'Clave inválida debe ser rechazada');
            assert(data.error, 'Debe incluir mensaje de error');
            
            this.addResult('✅ Validación de clave inválida', 'PASS', 'Clave inválida correctamente rechazada');
            
        } catch (error) {
            this.addResult('❌ Validación de clave inválida', 'FAIL', error.message);
        }
    }

    async testDomainValidation() {
        console.log('3️⃣ Probando validación de DOMINIO...');
        
        try {
            const validKey = 'dGVzdC1rZXktZm9yLWxvY2FsLWRldmVsb3BtZW50LTEyMzQ1Ng==';
            const response = await this.makeValidationRequest(validKey, 'unauthorized-domain.com');
            
            assert.strictEqual(response.status, 403, 'Dominio no autorizado debe retornar 403');
            
            const data = await response.json();
            assert.strictEqual(data.valid, false, 'Dominio no autorizado debe ser rechazado');
            
            this.addResult('✅ Validación de dominio', 'PASS', 'Dominio no autorizado correctamente rechazado');
            
        } catch (error) {
            this.addResult('❌ Validación de dominio', 'FAIL', error.message);
        }
    }

    async testRateLimiting() {
        console.log('4️⃣ Probando RATE LIMITING...');
        
        try {
            const invalidKey = 'rate-limit-test-key';
            let rateLimitHit = false;
            
            // Hacer 6 requests rápidos (límite es 5)
            for (let i = 0; i < 6; i++) {
                const response = await this.makeValidationRequest(invalidKey, 'localhost');
                
                if (i < 5) {
                    // Primeros 5 deben pasar (aunque la clave sea inválida)
                    assert(response.status === 400 || response.status === 403, 
                          `Request ${i + 1} debe ser procesado`);
                } else {
                    // El 6to debe ser bloqueado por rate limit
                    if (response.status === 429) {
                        rateLimitHit = true;
                    }
                }
                
                // Pequeña pausa entre requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            assert(rateLimitHit, 'Rate limit debe activarse después de 5 intentos');
            this.addResult('✅ Rate limiting', 'PASS', 'Rate limit correctamente activado');
            
        } catch (error) {
            this.addResult('❌ Rate limiting', 'FAIL', error.message);
        }
    }

    async testTimestampValidation() {
        console.log('5️⃣ Probando validación de TIMESTAMP...');
        
        try {
            const validKey = 'dGVzdC1rZXktZm9yLWxvY2FsLWRldmVsb3BtZW50LTEyMzQ1Ng==';
            
            // Timestamp muy antiguo (más de 5 minutos)
            const oldTimestamp = Date.now() - (10 * 60 * 1000);
            
            const response = await fetch(`${this.serverUrl}/api/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Domain': 'localhost',
                    'X-Timestamp': oldTimestamp.toString()
                },
                body: JSON.stringify({
                    key: validKey,
                    domain: 'localhost',
                    userAgent: 'SecurityTester/1.0',
                    challenge: 'test-challenge'
                })
            });
            
            assert.strictEqual(response.status, 400, 'Timestamp antiguo debe ser rechazado');
            
            const data = await response.json();
            assert.strictEqual(data.valid, false, 'Request con timestamp antiguo debe fallar');
            
            this.addResult('✅ Validación de timestamp', 'PASS', 'Timestamp antiguo correctamente rechazado');
            
        } catch (error) {
            this.addResult('❌ Validación de timestamp', 'FAIL', error.message);
        }
    }

    async makeValidationRequest(key, domain) {
        return fetch(`${this.serverUrl}/api/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Domain': domain,
                'X-Timestamp': Date.now().toString()
            },
            body: JSON.stringify({
                key: key,
                domain: domain,
                userAgent: 'SecurityTester/1.0',
                challenge: 'test-challenge'
            })
        });
    }

    addResult(test, status, details) {
        this.testResults.push({ test, status, details });
        console.log(`   ${status === 'PASS' ? '✅' : '❌'} ${details}\n`);
    }

    printResults() {
        console.log('\n📊 RESUMEN DE PRUEBAS DE SEGURIDAD');
        console.log('=' * 50);
        
        let passed = 0;
        let failed = 0;
        
        this.testResults.forEach(result => {
            console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.test}`);
            console.log(`   ${result.details}`);
            
            if (result.status === 'PASS') passed++;
            else failed++;
        });
        
        console.log('\n📈 ESTADÍSTICAS:');
        console.log(`   Pruebas exitosas: ${passed}`);
        console.log(`   Pruebas fallidas: ${failed}`);
        console.log(`   Total: ${passed + failed}`);
        
        if (failed === 0) {
            console.log('\n🎉 ¡Todas las pruebas de seguridad PASARON!');
        } else {
            console.log('\n⚠️  Algunas pruebas de seguridad FALLARON. Revisar implementación.');
        }
    }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
    const tester = new SecurityTester();
    
    tester.runAllTests().catch(error => {
        console.error('Error ejecutando pruebas:', error);
        process.exit(1);
    });
}

module.exports = SecurityTester;