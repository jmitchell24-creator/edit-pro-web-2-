#!/usr/bin/env node

console.log('🧪 Testing Edit Quick AI Deployment...\n');

// Test 1: Check dependencies
console.log('1️⃣ Checking dependencies...');
try {
    require('express');
    require('better-sqlite3');
    require('bcryptjs');
    require('jsonwebtoken');
    require('multer');
    require('cors');
    require('helmet');
    require('fs-extra');
    require('uuid');
    console.log('✅ All dependencies are available');
} catch (error) {
    console.error('❌ Missing dependency:', error.message);
    console.log('💡 Run: npm install');
    process.exit(1);
}

// Test 2: Check backend files
console.log('\n2️⃣ Checking backend files...');
const fs = require('fs-extra');
const path = require('path');

const requiredFiles = [
    'backend/server.js',
    'backend/database.js',
    'backend/auth.js',
    'backend/usage-limits.js',
    'backend/analytics.js',
    'backend/sharing.js',
    'backend/ai-processor.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n❌ Some backend files are missing!');
    process.exit(1);
}

// Test 3: Check frontend files
console.log('\n3️⃣ Checking frontend files...');
const frontendFiles = [
    'dashboard.html',
    'subscription-plans.html',
    'register.html',
    'login.html',
    'index.html'
];

frontendFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
    }
});

// Test 4: Check directories
console.log('\n4️⃣ Checking required directories...');
const requiredDirs = [
    'backend/data',
    'uploads',
    'projects',
    'ffmpeg-8.0',
    'ffmpeg-extracted'
];

requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}/`);
    } else {
        console.log(`❌ ${dir}/ - MISSING`);
    }
});

// Test 5: Check database initialization
console.log('\n5️⃣ Testing database initialization...');
try {
    const { initializeDatabase } = require('./backend/database');
    console.log('✅ Database module loaded successfully');
} catch (error) {
    console.error('❌ Database module error:', error.message);
}

// Test 6: Check server module
console.log('\n6️⃣ Testing server module...');
try {
    const server = require('./backend/server.js');
    console.log('✅ Server module loaded successfully');
} catch (error) {
    console.error('❌ Server module error:', error.message);
}

// Test 7: Check environment
console.log('\n7️⃣ Checking environment...');
if (fs.existsSync('config.env')) {
    console.log('✅ config.env exists');
} else {
    console.log('⚠️  config.env missing - create with PORT and JWT_SECRET');
}

// Test 8: Check package.json
console.log('\n8️⃣ Checking package.json...');
try {
    const packageJson = require('./package.json');
    if (packageJson.scripts && packageJson.scripts.start) {
        console.log('✅ package.json scripts configured');
    } else {
        console.log('❌ package.json scripts missing');
    }
} catch (error) {
    console.error('❌ package.json error:', error.message);
}

console.log('\n🎯 Deployment Test Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Run: npm install');
console.log('2. Create config.env with PORT and JWT_SECRET');
console.log('3. Run: npm start');
console.log('4. Visit: http://localhost:8080');
console.log('\n🚀 You\'re ready to deploy!');
