const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve uploaded files via /uploads URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads and projects directories
const uploadsDir = path.join(__dirname, 'uploads');
const projectsDir = path.join(__dirname, 'projects');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(projectsDir);

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed!'), false);
        }
    }
});

// In-memory storage for projects
let projects = new Map();

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all projects
app.get('/api/projects', (req, res) => {
    const projectList = Array.from(projects.values()).map(project => ({
        id: project.id,
        name: project.name,
        status: project.status,
        style: project.style,
        createdAt: project.createdAt,
        thumbnail: project.thumbnail
    }));
    res.json(projectList);
});

// Get project by ID
app.get('/api/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
});

// Upload video and create project
app.post('/api/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const { style, intensity, quality, projectName } = req.body;
        
        // Create new project
        const projectId = uuidv4();
        const project = {
            id: projectId,
            name: projectName || `Project ${Date.now()}`,
            originalVideo: req.file.filename,
            style: style || 'cinematic',
            intensity: intensity || 'medium',
            quality: quality || '1080p',
            status: 'uploaded',
            createdAt: new Date().toISOString(),
            thumbnail: null,
            processedVideo: null,
            progress: 0,
            estimatedTime: null
        };

        projects.set(projectId, project);

        // Start simulated AI processing
        simulateAIProcessing(projectId);

        res.json({
            success: true,
            projectId: projectId,
            message: 'Video uploaded successfully. AI processing started.',
            project: project
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

// Upload multiple videos for mixtape creation
app.post('/api/upload-multiple', upload.array('videos', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No video files uploaded' });
        }

        const projectId = uuidv4();
        const project = {
            id: projectId,
            name: req.body.projectName || 'Sports Mixtape',
            originalVideos: req.files.map(file => file.filename),
            type: 'sports-mixtape',
            sportType: req.body.sportType || 'mixed',
            style: req.body.style || 'highlights',
            length: req.body.length || '60',
            musicStyle: req.body.musicStyle || 'epic',
            quality: req.body.quality || '1080p',
            status: 'uploaded',
            progress: 0,
            createdAt: new Date().toISOString(),
            currentStep: 'Ready to create mixtape',
            videoCount: req.files.length
        };

        projects.set(projectId, project);

        // Start mixtape creation
        processMixtapeWithAI(projectId);

        res.json({
            success: true,
            projectId: projectId,
            message: 'Sports mixtape creation started!',
            project: project
        });

    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

// Start AI processing for a project
app.post('/api/projects/:id/process', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status === 'processing') {
        return res.status(400).json({ error: 'Project is already processing' });
    }

    project.status = 'processing';
    project.progress = 0;
    simulateAIProcessing(req.params.id);

    res.json({ success: true, message: 'AI processing started', project });
});

// Get project progress
app.get('/api/projects/:id/progress', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
        status: project.status,
        progress: project.progress,
        estimatedTime: project.estimatedTime
    });
});

// Download processed video
app.get('/api/projects/:id/download', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'completed') {
        return res.status(400).json({ error: 'Video processing not complete' });
    }

    // Check if processed video exists
    const videoPath = path.join(projectsDir, project.processedVideo);
    if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: 'Processed video file not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}-AI-Edited.mp4"`);
    res.setHeader('Content-Length', fs.statSync(videoPath).size);

    // Stream the video file
    const videoStream = fs.createReadStream(videoPath);
    videoStream.pipe(res);
});

// Serve video files directly
app.get('/api/projects/:id/video', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'completed') {
        return res.status(400).json({ error: 'Video processing not complete' });
    }

    const videoPath = path.join(projectsDir, project.processedVideo);
    if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: 'Video file not found' });
    }

    // Stream video for preview/download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    
    const videoStream = fs.createReadStream(videoPath);
    videoStream.pipe(res);
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    // Clean up files
    try {
        if (project.originalVideo) {
            fs.removeSync(path.join(uploadsDir, project.originalVideo));
        }
        if (project.processedVideo) {
            fs.removeSync(path.join(projectsDir, project.processedVideo));
        }
    } catch (error) {
        console.error('File cleanup error:', error);
    }

    projects.delete(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
});

// Simulated AI Processing
function simulateAIProcessing(projectId) {
    const project = projects.get(projectId);
    if (!project) return;

    project.status = 'processing';
    project.progress = 0;
    project.estimatedTime = '3-5 minutes';

    const processingSteps = [
        { name: 'Analyzing video content', duration: 2000, progress: 20 },
        { name: 'Detecting scenes and cuts', duration: 3000, progress: 40 },
        { name: 'Applying style effects', duration: 4000, progress: 60 },
        { name: 'Color grading and enhancement', duration: 3000, progress: 80 },
        { name: 'Final rendering', duration: 2000, progress: 100 }
    ];

    let currentStep = 0;

    const processStep = () => {
        if (currentStep >= processingSteps.length) {
            // Processing complete - copy original video as "processed" for testing
            const originalPath = path.join(uploadsDir, project.originalVideo);
            const processedPath = path.join(projectsDir, `processed-${project.id}.mp4`);
            
            try {
                fs.copyFileSync(originalPath, processedPath);
                project.status = 'completed';
                project.progress = 100;
                project.processedVideo = `processed-${project.id}.mp4`;
                project.thumbnail = `thumbnail-${project.id}.jpg`;
                console.log(`✅ Project ${projectId} completed successfully`);
            } catch (error) {
                console.error('Error copying video:', error);
                project.status = 'error';
                project.errorMessage = error.message;
            }
            return;
        }

        const step = processingSteps[currentStep];
        project.progress = step.progress;

        setTimeout(() => {
            currentStep++;
            processStep();
        }, step.duration);
    };

    processStep();
}

// Process sports mixtape with AI
function processMixtapeWithAI(projectId) {
    const project = projects.get(projectId);
    if (!project) return;

    project.status = 'processing';
    project.progress = 0;
    project.estimatedTime = '10-15 minutes';

    const processingSteps = [
        { name: 'Analyzing multiple sports videos...', duration: 2000, progress: 15 },
        { name: 'Detecting highlight moments...', duration: 3000, progress: 30 },
        { name: 'Creating smooth transitions...', duration: 3000, progress: 45 },
        { name: 'Adding music and effects...', duration: 3000, progress: 60 },
        { name: 'Optimizing for target length...', duration: 2000, progress: 75 },
        { name: 'Rendering final mixtape...', duration: 2000, progress: 90 },
        { name: 'Finalizing...', duration: 1000, progress: 100 }
    ];

    let currentStep = 0;

    const processStep = () => {
        if (currentStep >= processingSteps.length) {
            // Processing complete - copy first video as "processed" for testing
            const originalPath = path.join(uploadsDir, project.originalVideos[0]);
            const processedPath = path.join(projectsDir, `mixtape-${project.id}.mp4`);
            
            try {
                fs.copyFileSync(originalPath, processedPath);
                project.status = 'completed';
                project.progress = 100;
                project.processedVideo = `mixtape-${project.id}.mp4`;
                project.thumbnail = `mixtape-thumbnail-${project.id}.jpg`;
                project.currentStep = 'Epic sports mixtape ready!';
                console.log(`🏆 Sports Mixtape ${projectId} completed successfully`);
            } catch (error) {
                console.error('Error copying mixtape video:', error);
                project.status = 'error';
                project.errorMessage = error.message;
            }
            return;
        }

        const step = processingSteps[currentStep];
        project.progress = step.progress;
        project.currentStep = step.name;

        setTimeout(() => {
            currentStep++;
            processStep();
        }, step.duration);
    };

    processStep();
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Edit Quick AI Server (Simple) running on port ${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`📁 Projects directory: ${projectsDir}`);
    console.log(`\n🎯 This version simulates AI processing for testing downloads!`);
});

module.exports = app;
