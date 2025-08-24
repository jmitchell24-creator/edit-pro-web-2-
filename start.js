#!/usr/bin/env node

const { initializeDatabase } = require('./backend/database');
const path = require('path');

console.log('🚀 Starting Edit Quick AI Server...');

// Initialize database first
try {
    console.log('📊 Initializing database...');
    initializeDatabase();
    console.log('✅ Database initialized successfully');
} catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
}

// Start the server
console.log('🌐 Starting server...');
require('./backend/server.js');
