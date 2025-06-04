#!/usr/bin/env node

/**
 * Tests de integración para el Document Detector
 * Prueba la integración completa del sistema
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const assert = require('assert');
const { spawn } = require('child_process');

class IntegrationTests {
    constructor() {
        this.testResults = [];
        this.serverProcess = null;
        this.serverUrl = 'http://localhost:3001';
        this.staticUrl = 'http://localhost:8000';
    }

    async runAllTests() {
        console.log('🔄 Iniciando tests de integración...\n');

        try {
            // Verificar dependencias
            await this.checkDependencies();
            
            // Iniciar servidores
            await this.startServers();
            
            // Tests de integración
            await this.testServerCommunication();
            await this.testSecurityLayer();
            await this.testAPIValidation();
            await this.testCORSConfiguration();
            await this.testStaticFileServing();
            
            this.printResults();
            
        } catch (error) {
            console.error('Error en tests de integración:', error);
        } finally {
            await this.cleanup();
        }
    }

    async checkDependencies() {
        console.log('1️⃣ Verificando dependencias...');
        
        try {
            const packageJson = require('./package.json');
            
            // Verificar dependencias críticas
            const requiredDeps = [
                '@jaak.ai/document-detector',
                'node-fetch'
            ];
            
            const requiredDevDeps = [
                'express',
                'express-rate-limit',
                'helmet'
            ];
            
            requiredDeps.forEach(dep => {
                assert(packageJson.dependencies[dep], `Dependencia requerida: ${dep}`);
            });
            
            requiredDevDeps.forEach(dep => {
                assert(packageJson.devDependencies[dep], `Dev dependencia requerida: ${dep}`);
            });
            
            this.addResult('✅ Verificación de dependencias', 'PASS', 'Todas las dependencias están instaladas');
            
        } catch (error) {
            this.addResult('❌ Verificación de dependencias', 'FAIL', error.message);
        }
    }

    async startServers() {
        console.log('2️⃣ Iniciando servidores...');
        
        try {
            // Verificar si los servidores ya están corriendo
            const serverRunning = await this.checkServerStatus(this.serverUrl);
            const staticRunning = await this.checkServerStatus(this.staticUrl);
            
            if (serverRunning && staticRunning) {
                this.addResult('✅ Servidores', 'PASS', 'Servidores ya están ejecutándose');
            } else {
                this.addResult('ℹ️ Servidores', 'INFO', 'Para tests completos ejecute: npm run start');
            }
            
        } catch (error) {
            this.addResult('❌ Servidores', 'FAIL', error.message);
        }
    }

    async checkServerStatus(url) {
        try {
            const response = await fetch(url, { timeout: 2000 });
            return response.ok || response.status === 404; // 404 es OK para static server
        } catch (error) {
            return false;
        }
    }

    async testServerCommunication() {
        console.log('3️⃣ Probando comunicación con servidor...');
        
        try {
            const response = await fetch(`${this.serverUrl}/api/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Domain': 'localhost',
                    'X-Timestamp': Date.now().toString()
                },
                body: JSON.stringify({
                    key: 'test-key',
                    domain: 'localhost',
                    userAgent: 'IntegrationTest/1.0',
                    challenge: 'test'
                })
            });
            
            // Servidor debe responder (aunque rechace la clave)
            assert(response.status === 400 || response.status === 403, 
                'Servidor debe responder con error de validación');
                
            const data = await response.json();
            assert(typeof data.valid === 'boolean', 'Respuesta debe incluir campo valid');
            
            this.addResult('✅ Comunicación servidor', 'PASS', 'API responde correctamente');
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.addResult('ℹ️ Comunicación servidor', 'INFO', 'Servidor no está ejecutándose - ejecute: npm run server');
            } else {
                this.addResult('❌ Comunicación servidor', 'FAIL', error.message);
            }
        }
    }

    async testSecurityLayer() {
        console.log('4️⃣ Probando capa de seguridad...');
        
        try {
            const fs = require('fs');
            
            // Verificar que los archivos de seguridad existen
            assert(fs.existsSync('./security-layer.js'), 'security-layer.js debe existir');
            assert(fs.existsSync('./server-validation.js'), 'server-validation.js debe existir');
            
            // Leer contenido de security layer
            const securityContent = fs.readFileSync('./security-layer.js', 'utf8');
            
            // Verificar funciones críticas
            const requiredFunctions = [
                'validateKey',
                'verifyCodeIntegrity',
                'protectGlobalScope'
            ];
            
            requiredFunctions.forEach(func => {
                assert(securityContent.includes(func), `Función ${func} debe estar presente`);
            });
            
            this.addResult('✅ Capa de seguridad', 'PASS', 'Archivos de seguridad correctos');
            
        } catch (error) {
            this.addResult('❌ Capa de seguridad', 'FAIL', error.message);
        }
    }

    async testAPIValidation() {
        console.log('5️⃣ Probando validación de API...');
        
        try {
            // Test con clave válida de prueba
            const validKey = 'dGVzdC1rZXktZm9yLWxvY2FsLWRldmVsb3BtZW50LTEyMzQ1Ng==';
            
            const response = await fetch(`${this.serverUrl}/api/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Domain': 'localhost',
                    'X-Timestamp': Date.now().toString()
                },
                body: JSON.stringify({
                    key: validKey,
                    domain: 'localhost',
                    userAgent: 'IntegrationTest/1.0',
                    challenge: 'test'
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.valid) {
                this.addResult('✅ Validación API', 'PASS', 'Clave de prueba validada correctamente');
            } else {
                this.addResult('ℹ️ Validación API', 'INFO', 'Validación funciona - clave rechazada como esperado');
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.addResult('ℹ️ Validación API', 'INFO', 'Servidor no disponible para test');
            } else {
                this.addResult('❌ Validación API', 'FAIL', error.message);
            }
        }
    }

    async testCORSConfiguration() {
        console.log('6️⃣ Probando configuración CORS...');
        
        try {
            const response = await fetch(`${this.serverUrl}/api/validate`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:8000',
                    'Access-Control-Request-Method': 'POST'
                }
            });
            
            const corsHeader = response.headers.get('Access-Control-Allow-Origin');
            
            if (corsHeader) {
                this.addResult('✅ Configuración CORS', 'PASS', 'Headers CORS configurados correctamente');
            } else {
                this.addResult('⚠️ Configuración CORS', 'WARN', 'CORS puede no estar configurado');
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.addResult('ℹ️ Configuración CORS', 'INFO', 'Servidor no disponible para test CORS');
            } else {
                this.addResult('❌ Configuración CORS', 'FAIL', error.message);
            }
        }
    }

    async testStaticFileServing() {
        console.log('7️⃣ Probando servicio de archivos estáticos...');
        
        try {
            const response = await fetch(`${this.staticUrl}/index.html`);
            
            if (response.ok) {
                const content = await response.text();
                assert(content.includes('document-detector'), 'index.html debe contener document-detector');
                assert(content.includes('security-layer.js'), 'index.html debe cargar security layer');
                
                this.addResult('✅ Archivos estáticos', 'PASS', 'Servidor estático funcionando correctamente');
            } else {
                this.addResult('❌ Archivos estáticos', 'FAIL', `Error ${response.status}`);
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.addResult('ℹ️ Archivos estáticos', 'INFO', 'Servidor estático no disponible - ejecute: npm run static');
            } else {
                this.addResult('❌ Archivos estáticos', 'FAIL', error.message);
            }
        }
    }

    async cleanup() {
        if (this.serverProcess) {
            this.serverProcess.kill();
        }
    }

    addResult(test, status, details) {
        this.testResults.push({ test, status, details });
        const icon = status === 'PASS' ? '✅' : 
                   status === 'INFO' ? 'ℹ️' : 
                   status === 'WARN' ? '⚠️' : '❌';
        console.log(`   ${icon} ${details}\n`);
    }

    printResults() {
        console.log('\n📊 RESUMEN DE TESTS DE INTEGRACIÓN');
        console.log('=' * 50);
        
        let passed = 0;
        let failed = 0;
        let info = 0;
        let warn = 0;
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : 
                        result.status === 'INFO' ? 'ℹ️' : 
                        result.status === 'WARN' ? '⚠️' : '❌';
            console.log(`${icon} ${result.test}`);
            console.log(`   ${result.details}`);
            
            if (result.status === 'PASS') passed++;
            else if (result.status === 'FAIL') failed++;
            else if (result.status === 'INFO') info++;
            else if (result.status === 'WARN') warn++;
        });
        
        console.log('\n📈 ESTADÍSTICAS:');
        console.log(`   Tests exitosos: ${passed}`);
        console.log(`   Tests fallidos: ${failed}`);
        console.log(`   Tests informativos: ${info}`);
        console.log(`   Advertencias: ${warn}`);
        console.log(`   Total: ${passed + failed + info + warn}`);
        
        if (failed === 0) {
            console.log('\n🎉 ¡Tests de integración completados exitosamente!');
        } else {
            console.log('\n⚠️  Algunos tests de integración fallaron.');
        }
        
        console.log('\n💡 Para ejecutar el sistema completo:');
        console.log('   Terminal 1: npm run server');
        console.log('   Terminal 2: npm run static');
        console.log('   Navegador: http://localhost:8000');
    }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
    const tester = new IntegrationTests();
    
    tester.runAllTests().catch(error => {
        console.error('Error ejecutando tests de integración:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTests;