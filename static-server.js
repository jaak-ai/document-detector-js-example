/**
 * Static server with proper CORS and WASM headers
 */

const express = require('express');
const path = require('path');

const app = express();

// Set CORS and security headers for WASM compatibility
app.use((req, res, next) => {
    // Cross-Origin Isolation headers (required for SharedArrayBuffer/WASM)
    res.header('Cross-Origin-Opener-Policy', 'same-origin');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
    
    // CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // WASM-specific headers
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Static server with WASM support running on http://127.0.0.1:${PORT}`);
});

module.exports = app;