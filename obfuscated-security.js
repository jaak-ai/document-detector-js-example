/**
 * Código de seguridad ofuscado
 * Funciones críticas de validación con protección anti-reverse engineering
 */

(function() {
    'use strict';
    
    // Variables ofuscadas
    const _0x1a2b = ['validate', 'key', 'domain', 'checksum', 'integrity', 'bypass', 'hack', 'tamper'];
    const _0x3c4d = btoa('security-layer');
    const _0x5e6f = new Map();
    
    // Función ofuscada para detección de tampering
    function _0x7g8h() {
        const _0x9i0j = document.querySelectorAll('script');
        for (let _0xkl1m = 0; _0xkl1m < _0x9i0j.length; _0xkl1m++) {
            const _0xno2p = _0x9i0j[_0xkl1m].innerHTML;
            if (_0xno2p.includes(_0x1a2b[5]) || _0xno2p.includes(_0x1a2b[6])) {
                return true;
            }
        }
        return false;
    }
    
    // Validación de clave ofuscada
    function _0x3q4r(_0xs5t6) {
        const _0xu7v8 = atob('YWJjZGVmZ2hpams='); // Dummy base64
        let _0xw9x0 = '';
        for (let _0xy1z2 = 0; _0xy1z2 < _0xs5t6.length; _0xy1z2++) {
            _0xw9x0 += String.fromCharCode(_0xs5t6.charCodeAt(_0xy1z2) ^ _0xu7v8.charCodeAt(_0xy1z2 % _0xu7v8.length));
        }
        return _0xw9x0;
    }
    
    // Función de checksum ofuscada
    async function _0xa3b4(_0xc5d6) {
        const _0xe7f8 = new TextEncoder().encode(_0xc5d6);
        const _0xg9h0 = await crypto.subtle.digest('SHA-256', _0xe7f8);
        return Array.from(new Uint8Array(_0xg9h0)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Verificación de integridad ofuscada
    function _0xi1j2() {
        const _0xk3l4 = window.fetch.toString();
        const _0xm5n6 = _0xk3l4.length;
        
        // Detectar si fetch ha sido modificado
        if (_0xm5n6 < 20 || _0xm5n6 > 50) {
            return false;
        }
        
        // Verificar contenido original
        if (!_0xk3l4.includes('native code')) {
            return false;
        }
        
        return true;
    }
    
    // Función principal ofuscada
    window._0xSECURE = {
        // Validar clave de forma ofuscada
        _0xVAL: async function(_0xkey) {
            if (_0x7g8h()) {
                console.warn(atob('VGFtcGVyIGRldGVjdGVk')); // "Tamper detected" en base64
                return false;
            }
            
            if (!_0xi1j2()) {
                console.warn(atob('RnVuY3Rpb24gbW9kaWZpY2F0aW9u')); // "Function modification" en base64
                return false;
            }
            
            const _0xhash = await _0xa3b4(_0xkey);
            return _0x5e6f.has(_0xhash);
        },
        
        // Inicializar hashes válidos
        _0xINIT: function() {
            // Agregar hashes de claves válidas (en producción, estos serían dinámicos)
            const _0xvalidHashes = [
                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // hash de clave vacía (para testing)
                // Agregar más hashes de claves válidas aquí
            ];
            
            _0xvalidHashes.forEach(hash => _0x5e6f.set(hash, true));
        }
    };
    
    // Auto-inicializar
    window._0xSECURE._0xINIT();
    
    // Protección adicional: auto-destruirse si se detecta debugging
    let _0xdebugCounter = 0;
    setInterval(() => {
        const _0xstart = performance.now();
        debugger;
        const _0xend = performance.now();
        
        if (_0xend - _0xstart > 100) {
            _0xdebugCounter++;
            if (_0xdebugCounter > 3) {
                // Auto-destruir funciones críticas
                window._0xSECURE = null;
                console.clear();
                document.body.innerHTML = atob('RGVidWdnaW5nIGRldGVjdGVk'); // "Debugging detected"
            }
        }
    }, 2000);
    
    // Proteger el objeto contra modificación
    Object.freeze(window._0xSECURE);
    Object.seal(window._0xSECURE);
    
})();

// Segundo nivel de ofuscación usando eval dinámico
(function() {
    const _0xcode = `
        // Verificación adicional de integridad del DOM
        function _0xDOMCheck() {
            const scripts = document.querySelectorAll('script[src]');
            for (let script of scripts) {
                if (script.src.includes('localhost') && !script.src.includes('security-layer')) {
                    return false; // Script sospechoso detectado
                }
            }
            return true;
        }
        
        // Monitorear cambios en el DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'SCRIPT' && 
                            (node.innerHTML.includes('bypass') || node.innerHTML.includes('override'))) {
                            console.warn('Suspicious script injection detected');
                            document.body.innerHTML = '<h1>Security Violation</h1>';
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        window._0xDOMSECURE = { check: _0xDOMCheck };
    `;
    
    // Evaluar código ofuscado dinámicamente
    eval(_0xcode);
})();