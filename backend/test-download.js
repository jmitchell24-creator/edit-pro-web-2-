const express = require('express');
const path = require('path');
const fs = require('fs-extra');

// Simple test server for downloads
const app = express();
const PORT = 3002;

// Create test directory
const testDir = path.join(__dirname, 'test-downloads');
fs.ensureDirSync(testDir);

// Create a test video file (dummy content)
const testVideoPath = path.join(testDir, 'test-video.mp4');
if (!fs.existsSync(testVideoPath)) {
    // Create a dummy MP4 file for testing
    const dummyContent = Buffer.from('dummy mp4 content for testing');
    fs.writeFileSync(testVideoPath, dummyContent);
}

app.get('/test-download', (req, res) => {
    // Test download endpoint
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="test-video.mp4"');
    res.setHeader('Content-Length', fs.statSync(testVideoPath).size);
    
    const videoStream = fs.createReadStream(testVideoPath);
    videoStream.pipe(res);
});

app.get('/test-preview', (req, res) => {
    // Test preview endpoint
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    
    const videoStream = fs.createReadStream(testVideoPath);
    videoStream.pipe(res);
});

app.listen(PORT, () => {
    console.log(`🧪 Test download server running on port ${PORT}`);
    console.log(`📥 Test download: http://localhost:${PORT}/test-download`);
    console.log(`👁️ Test preview: http://localhost:${PORT}/test-preview`);
    console.log(`\n🎯 Test these URLs in your browser to verify downloads work!`);
});

module.exports = app;

