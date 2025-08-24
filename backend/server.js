const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AIVideoProcessor = require('./ai-processor');
const { projectOperations, historyOperations, guestUsageOperations, subscriptionOperations } = require('./database');
const { auth, authenticateToken, optionalAuth } = require('./auth');
const { sharing } = require('./sharing');
const { analytics } = require('./analytics');
const { checkGuestUsage, checkSubscriptionLimits, optionalSubscriptionCheck } = require('./usage-limits');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware - Fixed CORS and security
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false
}));

// Configure CORS properly for frontend
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'file://'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later'
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many API requests, please try again later'
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from parent directory (for dashboard.html)
app.use(express.static(path.join(__dirname, '..')));

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

// Database is now used instead of in-memory storage

// Routes

// Authentication endpoints
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const user = await auth.register(username, email, password);
        res.status(201).json({ success: true, user });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const result = await auth.login(username, password);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all projects (user's own projects + shared projects)
app.get('/api/projects', optionalAuth, (req, res) => {
    try {
        // Get user's own projects
        let userProjects = [];
        let sharedProjects = [];
        
        if (req.user) {
            userProjects = db.prepare(`
                SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC
            `).all(req.user.id);
            
            // Get shared projects
            sharedProjects = sharing.getSharedWithUser(req.user.id);
        } else {
            // Guest user - get projects by IP
            const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
            const guestUserId = `guest_${clientIP.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            userProjects = db.prepare(`
                SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC
            `).all(guestUserId);
        }
        
        // Combine and format projects
        const allProjects = [
            ...userProjects.map(project => ({ ...project, ownership: 'own' })),
            ...sharedProjects.map(share => ({ 
                ...share, 
                ownership: 'shared',
                permission: share.permission 
            }))
        ];
        
        const projectList = allProjects.map(project => ({
            id: project.id,
            name: project.name,
            status: project.status,
            style: project.style,
            intensity: project.intensity,
            quality: project.quality,
            customEffects: project.customEffects ? JSON.parse(project.customEffects) : [],
            platformOptimize: project.platformOptimize || 'auto',
            aiIntelligence: project.aiIntelligence || 'smart',
            createdAt: project.createdAt,
            fileSize: project.fileSize,
            progress: project.progress || 0,
            currentStep: project.currentStep || '',
            thumbnail: project.thumbnail,
            processedVideo: project.processedVideo
        }));
        
        console.log('Returning projects:', projectList.length);
        res.json(projectList);
    } catch (error) {
        console.error('Error getting projects:', error);
        res.status(500).json({ error: 'Failed to get projects' });
    }
});

// Get project by ID
app.get('/api/projects/:id', (req, res) => {
    try {
        const project = projectOperations.getProjectById.get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Parse customEffects from JSON string
        const projectData = {
            ...project,
            customEffects: project.customEffects ? JSON.parse(project.customEffects) : []
        };
        
        res.json(projectData);
    } catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
});

// Upload video and create project
app.post('/api/upload', checkGuestUsage, upload.single('video'), async (req, res) => {
    try {
        console.log('Upload request received:', {
            body: req.body,
            file: req.file ? req.file.filename : 'No file'
        });

        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const { 
            style, 
            intensity, 
            quality, 
            projectName,
            customEffects,
            platformOptimize,
            aiIntelligence
        } = req.body;
        
        // Create new project
        const projectId = uuidv4();
        const project = {
            id: projectId,
            name: projectName || `Project ${Date.now()}`,
            originalVideo: req.file.filename,
            style: style || 'cinematic',
            intensity: intensity || 'medium',
            quality: quality || '1080p',
            customEffects: customEffects ? JSON.parse(customEffects) : [],
            platformOptimize: platformOptimize || 'auto',
            aiIntelligence: aiIntelligence || 'smart',
            status: 'uploaded',
            createdAt: new Date().toISOString(),
            fileSize: req.file.size,
            progress: 0,
            currentStep: 'Uploaded successfully'
        };

                    // Store project in database
            try {
                // Determine user ID - use authenticated user or guest identifier
                const userId = req.user ? req.user.id : `guest_${req.ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
                
                projectOperations.createProject.run(
                    projectId,
                    project.name,
                    project.status,
                    project.style,
                    project.intensity,
                    project.quality,
                    JSON.stringify(project.customEffects),
                    project.platformOptimize,
                    project.aiIntelligence,
                    project.createdAt,
                    project.fileSize,
                    project.originalVideo,
                    userId
                );
            
            // Add to processing history
            historyOperations.addStep.run(
                uuidv4(),
                projectId,
                'upload',
                'success',
                'Video uploaded successfully',
                new Date().toISOString()
            );
            
            console.log('Project created and stored in database:', project);
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Failed to save project to database' });
        }

        res.json({ 
            success: true, 
            projectId: projectId,
            message: 'Video uploaded successfully!'
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed', 
            details: error.message 
        });
    }
});

// Start AI processing for a project
app.post('/api/projects/:id/process', (req, res) => {
    try {
        const project = projectOperations.getProjectById.get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.status === 'processing') {
            return res.status(400).json({ error: 'Project is already processing' });
        }

        // Update project status in database
        projectOperations.updateProjectStatus.run(
            'processing',
            0,
            'Starting AI processing',
            req.params.id
        );
        
        // Add to processing history
        historyOperations.addStep.run(
            uuidv4(),
            req.params.id,
            'start_processing',
            'success',
            'AI processing started',
            new Date().toISOString()
        );

        simulateAIProcessing(req.params.id);

        res.json({ success: true, message: 'AI processing started', project });
    } catch (error) {
        console.error('Error starting processing:', error);
        res.status(500).json({ error: 'Failed to start processing' });
    }
});

// Get project progress
app.get('/api/projects/:id/progress', (req, res) => {
    try {
        const project = projectOperations.getProjectById.get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            status: project.status,
            progress: project.progress,
            currentStep: project.currentStep,
            estimatedTime: project.estimatedTime
        });
    } catch (error) {
        console.error('Error getting progress:', error);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

// Download processed video
app.get('/api/projects/:id/download', (req, res) => {
    try {
        const project = projectOperations.getProjectById.get(req.params.id);
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
    } catch (error) {
        console.error('Error downloading video:', error);
        res.status(500).json({ error: 'Failed to download video' });
    }
});

// Serve video files directly
app.get('/api/projects/:id/video', (req, res) => {
    try {
        const project = projectOperations.getProjectById.get(req.params.id);
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
    } catch (error) {
        console.error('Error serving video:', error);
        res.status(500).json({ error: 'Failed to serve video' });
    }
});

// Project sharing endpoints
app.post('/api/projects/:id/share', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, permission = 'view' } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const result = await sharing.shareProject(id, req.user.id, username, permission);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Share project error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/projects/:id/shares', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const shares = sharing.getProjectShares(id);
        res.json({ success: true, shares });
    } catch (error) {
        console.error('Get shares error:', error);
        res.status(500).json({ error: 'Failed to get shares' });
    }
});

app.get('/api/projects/shared', authenticateToken, async (req, res) => {
    try {
        const sharedProjects = sharing.getSharedWithUser(req.user.id);
        res.json({ success: true, projects: sharedProjects });
    } catch (error) {
        console.error('Get shared projects error:', error);
        res.status(500).json({ error: 'Failed to get shared projects' });
    }
});

app.delete('/api/projects/:id/shares/:shareId', authenticateToken, async (req, res) => {
    try {
        const { shareId } = req.params;
        const result = await sharing.revokeShare(shareId, req.user.id);
        res.json(result);
    } catch (error) {
        console.error('Revoke share error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
    try {
        const project = projectOperations.getProjectById.get(req.params.id);
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

        // Delete from database
        projectOperations.deleteProject.run(req.params.id);
        
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Subscription endpoints
app.get('/api/subscriptions/plans', async (req, res) => {
    try {
        const plans = subscriptionOperations.getAllPlans.all();
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Error getting subscription plans:', error);
        res.status(500).json({ error: 'Failed to get subscription plans' });
    }
});

app.get('/api/subscriptions/current', authenticateToken, async (req, res) => {
    try {
        const subscription = subscriptionOperations.getUserSubscription.get(req.user.id);
        const videoCount = subscriptionOperations.getUserVideoCount.get(req.user.id);
        
        if (!subscription) {
            return res.json({ 
                success: true, 
                hasSubscription: false,
                message: 'No active subscription found'
            });
        }

        res.json({
            success: true,
            hasSubscription: true,
            subscription: {
                ...subscription,
                currentVideoCount: videoCount ? videoCount.count : 0
            }
        });
    } catch (error) {
        console.error('Error getting current subscription:', error);
        res.status(500).json({ error: 'Failed to get subscription info' });
    }
});

app.post('/api/subscriptions/create', authenticateToken, async (req, res) => {
    try {
        const { planId } = req.body;
        
        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }

        // Get plan details
        const plan = subscriptionOperations.getPlanById.get(planId);
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan ID' });
        }

        // Check if user already has an active subscription
        const existingSubscription = subscriptionOperations.getUserSubscription.get(req.user.id);
        if (existingSubscription) {
            return res.status(400).json({ 
                error: 'User already has an active subscription',
                currentPlan: existingSubscription.planName
            });
        }

        // Create subscription
        const subscriptionId = uuidv4();
        const now = new Date().toISOString();
        
        subscriptionOperations.createUserSubscription.run(
            subscriptionId,
            req.user.id,
            planId,
            now,
            plan.videoLimit,
            now
        );

        res.json({
            success: true,
            message: `Successfully subscribed to ${plan.name}`,
            subscription: {
                id: subscriptionId,
                planName: plan.name,
                maxVideos: plan.videoLimit,
                startDate: now
            }
        });

    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// Guest usage info endpoint
app.get('/api/guest/usage', async (req, res) => {
    try {
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const guestUsage = guestUsageOperations.getGuestUsageByIP.get(clientIP);
        
        if (!guestUsage) {
            return res.json({
                success: true,
                usageCount: 0,
                remaining: 1,
                isFirstTime: true
            });
        }

        const remaining = Math.max(0, 1 - guestUsage.usageCount);
        
        res.json({
            success: true,
            usageCount: guestUsage.usageCount,
            remaining: remaining,
            isFirstTime: false,
            blocked: guestUsage.blocked,
            blockedReason: guestUsage.blockedReason
        });

    } catch (error) {
        console.error('Error getting guest usage:', error);
        res.status(500).json({ error: 'Failed to get guest usage info' });
    }
});

// Analytics endpoints
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
    try {
        const stats = await analytics.getDashboardStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

app.get('/api/analytics/styles', authenticateToken, async (req, res) => {
    try {
        const styles = analytics.getPopularStyles();
        res.json({ success: true, styles });
    } catch (error) {
        console.error('Styles analytics error:', error);
        res.status(500).json({ error: 'Failed to get styles analytics' });
    }
});

app.get('/api/analytics/timeline', authenticateToken, async (req, res) => {
    try {
        const userActivity = analytics.getUserActivityTimeline();
        const projectTimeline = analytics.getProjectTimeline();
        res.json({ 
            success: true, 
            userActivity, 
            projectTimeline 
        });
    } catch (error) {
        console.error('Timeline analytics error:', error);
        res.status(500).json({ error: 'Failed to get timeline analytics' });
    }
});

app.get('/api/analytics/users', authenticateToken, async (req, res) => {
    try {
        const topUsers = analytics.getTopUsers();
        const storageUsage = analytics.getStorageUsage();
        res.json({ 
            success: true, 
            topUsers, 
            storageUsage 
        });
    } catch (error) {
        console.error('Users analytics error:', error);
        res.status(500).json({ error: 'Failed to get users analytics' });
    }
});

app.get('/api/analytics/user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const userAnalytics = await analytics.getUserAnalytics(userId);
        res.json({ success: true, analytics: userAnalytics });
    } catch (error) {
        console.error('User analytics error:', error);
        res.status(500).json({ error: 'Failed to get user analytics' });
    }
});

app.get('/api/analytics/system', authenticateToken, async (req, res) => {
    try {
        const systemMetrics = await analytics.getSystemMetrics();
        res.json({ success: true, metrics: systemMetrics });
    } catch (error) {
        console.error('System metrics error:', error);
        res.status(500).json({ error: 'Failed to get system metrics' });
    }
});

// AI Video Processor instance
const aiProcessor = new AIVideoProcessor();

// Real AI Processing with FFmpeg
async function processVideoWithAI(projectId) {
    try {
        const project = projectOperations.getProjectById.get(projectId);
        if (!project) return;

        // Update project status in database
        projectOperations.updateProjectStatus.run(
            'processing',
            0,
            'Starting AI processing',
            projectId
        );

        // Update progress function that updates database
        const updateProgress = async (progress, message) => {
            projectOperations.updateProjectStatus.run(
                'processing',
                progress,
                message,
                projectId
            );
            
            // Add to processing history
            historyOperations.addStep.run(
                uuidv4(),
                projectId,
                'progress_update',
                'success',
                message,
                new Date().toISOString()
            );
        };

        // Get file paths
        const inputPath = path.join(uploadsDir, project.originalVideo);
        const outputPath = path.join(projectsDir, `processed-${project.id}.mp4`);

        // Step 1: Analyze video (10%)
        await updateProgress(10, 'Analyzing video content...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 2: AI Scene Detection (25%)
        await updateProgress(25, 'Detecting scenes and cuts...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Apply AI Style (50%)
        await updateProgress(50, 'Applying AI editing style...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 4: Real AI Processing (75%)
        await updateProgress(75, 'Processing with AI algorithms...');
        
        // Use the real AI processor
        await aiProcessor.processVideo(
            inputPath,
            outputPath,
            project.style,
            project.intensity,
            project.quality
        );

        // Step 5: Final optimization (100%)
        await updateProgress(100, 'Finalizing video...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Processing complete - update database
        projectOperations.updateProject.run(
            project.name,
            project.style,
            project.intensity,
            project.quality,
            JSON.stringify(project.customEffects || []),
            project.platformOptimize || 'auto',
            project.aiIntelligence || 'smart',
            `thumbnail-${project.id}.jpg`,
            `processed-${project.id}.mp4`,
            projectId
        );
        
        // Update status to completed
        projectOperations.updateProjectStatus.run(
            'completed',
            100,
            'Processing completed successfully',
            projectId
        );
        
        console.log(`✅ Project ${projectId} completed successfully`);

    } catch (error) {
        console.error(`❌ AI processing failed for project ${projectId}:`, error);
        
        // Update status to error in database
        projectOperations.updateProjectStatus.run(
            'error',
            0,
            `Error: ${error.message}`,
            projectId
        );
        
        // Add error to processing history
        historyOperations.addStep.run(
            uuidv4(),
            projectId,
            'error',
            'error',
            error.message,
            new Date().toISOString()
        );
    }
}

// AI Processing Simulation (fallback)
function simulateAIProcessing(projectId) {
    try {
        const project = projectOperations.getProjectById.get(projectId);
        if (!project) return;

        // Update project status in database
        projectOperations.updateProjectStatus.run(
            'processing',
            0,
            'Starting simulation processing',
            projectId
        );

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
            // Processing complete - update database
            projectOperations.updateProjectStatus.run(
                'completed',
                100,
                'Simulation processing completed',
                projectId
            );
            
            // Update project with processed video info
            projectOperations.updateProject.run(
                project.name,
                project.style,
                project.intensity,
                project.quality,
                JSON.stringify(project.customEffects || []),
                project.platformOptimize || 'auto',
                project.aiIntelligence || 'smart',
                `thumbnail-${project.id}.jpg`,
                `processed-${project.id}.mp4`,
                projectId
            );
            
            // Add completion to history
            historyOperations.addStep.run(
                uuidv4(),
                projectId,
                'completion',
                'success',
                'Simulation processing completed successfully',
                new Date().toISOString()
            );
            return;
        }

        const step = processingSteps[currentStep];
        
        // Update progress in database
        projectOperations.updateProjectStatus.run(
            'processing',
            step.progress,
            step.name,
            projectId
        );

        setTimeout(() => {
            currentStep++;
            processStep();
        }, step.duration);
    };

    processStep();
    } catch (error) {
        console.error(`❌ Simulation processing failed for project ${projectId}:`, error);
        
        // Update status to error in database
        projectOperations.updateProjectStatus.run(
            'error',
            0,
            `Simulation error: ${error.message}`,
            projectId
        );
        
        // Add error to processing history
        historyOperations.addStep.run(
            uuidv4(),
            projectId,
            'error',
            'error',
            error.message,
            new Date().toISOString()
        );
    }
}

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// Serve registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'register.html'));
});

// Serve dashboard (requires authentication)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Serve dashboard with explicit route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Serve subscription plans page
app.get('/plans', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'subscription-plans.html'));
});

// Serve registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'register.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Edit Quick AI Server running on port ${PORT}`);
    console.log(`📱 Dashboard available at: http://localhost:${PORT}`);
    console.log(`🔌 API available at: http://localhost:${PORT}/api`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`📂 Projects directory: ${projectsDir}`);
});

module.exports = app;
