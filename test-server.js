#!/usr/bin/env node

console.log('🧪 Testing server startup...');

try {
    // Test database initialization
    console.log('📊 Testing database initialization...');
    const { initializeDatabase } = require('./backend/database');
    initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Test server startup
    console.log('🌐 Testing server startup...');
    const server = require('./backend/server');
    console.log('✅ Server module loaded successfully');

    console.log('🎉 All tests passed! Server is ready to run.');
    console.log('🚀 Run "npm start" to start your server');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
