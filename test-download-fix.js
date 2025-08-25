#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

console.log('🧪 Testing Download Fixes...\n');

async function runTests() {
    try {
        // Test 1: Check if demo video creation script exists
        console.log('✅ Test 1: Demo video creation script');
        const demoScriptPath = path.join(__dirname, 'backend', 'create-demo-video.js');
        if (fs.existsSync(demoScriptPath)) {
            console.log('   ✅ Script exists');
        } else {
            console.log('   ❌ Script missing');
        }

        // Test 2: Check if projects directory exists
        console.log('\n✅ Test 2: Projects directory');
        const projectsDir = path.join(__dirname, 'backend', 'projects');
        if (fs.existsSync(projectsDir)) {
            console.log('   ✅ Projects directory exists');
        } else {
            console.log('   ❌ Projects directory missing');
        }

        // Test 3: Check if demo files exist
        console.log('\n✅ Test 3: Demo files');
        const demoVideoPath = path.join(projectsDir, 'demo-video.mp4');
        const demoThumbnailPath = path.join(projectsDir, 'demo-thumbnail.jpg');
        
        if (fs.existsSync(demoVideoPath)) {
            const stats = fs.statSync(demoVideoPath);
            console.log(`   ✅ Demo video exists (${stats.size} bytes)`);
        } else {
            console.log('   ❌ Demo video missing');
        }
        
        if (fs.existsSync(demoThumbnailPath)) {
            const stats = fs.statSync(demoThumbnailPath);
            console.log(`   ✅ Demo thumbnail exists (${stats.size} bytes)`);
        } else {
            console.log('   ❌ Demo thumbnail missing');
        }

        // Test 4: Check server.js modifications
        console.log('\n✅ Test 4: Server.js modifications');
        const serverPath = path.join(__dirname, 'backend', 'server.js');
        if (fs.existsSync(serverPath)) {
            const serverContent = fs.readFileSync(serverPath, 'utf8');
            
            if (serverContent.includes('console.log(`📥 Download request for project: ${projectId}`)')) {
                console.log('   ✅ Enhanced logging added');
            } else {
                console.log('   ❌ Enhanced logging missing');
            }
            
            if (serverContent.includes('if (project.processedVideo && project.processedVideo.includes(\'demo\'))')) {
                console.log('   ✅ Demo project handling improved');
            } else {
                console.log('   ❌ Demo project handling missing');
            }
            
            if (serverContent.includes('app.get(\'/api/health\', (req, res) => {')) {
                console.log('   ✅ Health check endpoint added');
            } else {
                console.log('   ❌ Health check endpoint missing');
            }
        } else {
            console.log('   ❌ Server.js not found');
        }

        // Test 5: Check index.html modifications
        console.log('\n✅ Test 5: Frontend improvements');
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            
            if (indexContent.includes('async function downloadVideo()')) {
                console.log('   ✅ Download function converted to async');
            } else {
                console.log('   ❌ Download function not async');
            }
            
            if (indexContent.includes('console.log(\'📊 Download response headers:\', Object.fromEntries(response.headers.entries()))')) {
                console.log('   ✅ Enhanced error logging added');
            } else {
                console.log('   ❌ Enhanced error logging missing');
            }
        } else {
            console.log('   ❌ index.html not found');
        }

        console.log('\n🎯 Next Steps:');
        console.log('1. Run: node backend/create-demo-video.js');
        console.log('2. Start your server: node start.js');
        console.log('3. Test the download in your browser');
        console.log('4. Check /api/health endpoint for debugging');
        console.log('5. Check browser console for detailed logs');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

runTests();
