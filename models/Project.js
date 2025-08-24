const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    // Basic Project Info
    projectName: {
        type: String,
        required: true,
        trim: true
    },
    projectId: {
        type: String,
        required: true,
        unique: true
    },
    
    // Video Files
    originalVideos: [{
        filename: String,
        originalName: String,
        size: Number,
        path: String
    }],
    videoCount: {
        type: Number,
        default: 1
    },
    totalFileSize: {
        type: Number,
        default: 0
    },
    
    // AI Processing Settings
    style: {
        type: String,
        required: true,
        enum: [
            'gaming-montage', 'sports-mixtape', 'music-video', 'social-media',
            'cinematic-trailer', 'corporate-presentation', 'education-tutorial',
            'travel-vlog', 'wedding-event', 'comedy-meme', 'documentary'
        ]
    },
    intensity: {
        type: String,
        default: 'medium',
        enum: ['light', 'medium', 'high', 'extreme']
    },
    quality: {
        type: String,
        default: '1080p',
        enum: ['720p', '1080p', '4k', '8k']
    },
    
    // AI Customization
    aiInstructions: {
        type: String,
        trim: true
    },
    customEffects: {
        type: String,
        trim: true
    },
    platformOptimize: {
        type: String,
        default: 'youtube',
        enum: ['youtube', 'tiktok', 'instagram', 'linkedin', 'custom']
    },
    aiIntelligence: {
        type: String,
        default: 'smart',
        enum: ['basic', 'smart', 'expert', 'creative']
    },
    
    // Processing Status
    status: {
        type: String,
        default: 'uploaded',
        enum: ['uploaded', 'processing', 'completed', 'error', 'cancelled']
    },
    currentStep: {
        type: String,
        default: 'Ready to process'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    
    // Output Files
    processedVideo: {
        filename: String,
        path: String,
        size: Number,
        duration: Number,
        resolution: String
    },
    thumbnail: {
        filename: String,
        path: String
    },
    
    // AI Analysis Results
    aiAnalysis: {
        contentType: String,
        keyMoments: [{
            timestamp: Number,
            type: String,
            intensity: Number
        }],
        editingSuggestions: [String],
        duration: Number,
        originalResolution: String,
        originalFPS: Number
    },
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    processingStartedAt: Date,
    processingCompletedAt: Date,
    
    // Error Handling
    errorMessage: String,
    retryCount: {
        type: Number,
        default: 0
    }
});

// Update timestamp on save
ProjectSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Index for faster queries
ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ projectId: 1 });
ProjectSchema.index({ style: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
