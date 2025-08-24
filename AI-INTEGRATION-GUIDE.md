# 🚀 AI Integration Guide for Edit Quick

This guide will show you how to integrate real AI video processing into your Edit Quick website.

## 🎯 What We've Built

### ✅ **FFmpeg + AI Processing Pipeline**
- **Scene Detection** - AI analyzes audio for scene boundaries
- **Style Application** - Professional color grading and effects
- **Jump Cut Detection** - Automatic editing based on content analysis
- **Quality Optimization** - AI-powered video enhancement

### ✅ **15+ Editing Styles**
- **MrBeast Style** - High-energy, fast-paced cuts
- **Cinematic** - Hollywood-quality color grading
- **Vlog** - Smooth, engaging storytelling
- **Podcast** - Clean, professional editing

## 🛠️ Installation Requirements

### 1. **Install FFmpeg**

#### Windows:
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
# Add to PATH environment variable
```

#### macOS:
```bash
# Using Homebrew
brew install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Linux (CentOS/RHEL):
```bash
sudo yum install ffmpeg
# or
sudo dnf install ffmpeg
```

### 2. **Verify Installation**
```bash
ffmpeg -version
ffprobe -version
```

### 3. **Install Node.js Dependencies**
```bash
cd backend
npm install
```

## 🔧 How the AI Works

### **1. Scene Detection Algorithm**
```javascript
// Audio-based scene detection
const silenceInfo = await this.runCommand(this.ffmpegPath, [
    '-i', audioPath,
    '-af', 'silencedetect=noise=-50dB:d=0.5',
    '-f', 'null', '-'
]);
```

**What it does:**
- Extracts audio from video
- Detects silence patterns (scene changes often have silence)
- Identifies optimal cut points
- Creates smooth transitions

### **2. AI Style Application**
```javascript
const styleConfig = {
    mrbeast: {
        colorGrading: 'colorlevels=rimin=0.1:gimin=0.1:bimin=0.1:rimax=0.9:gimax=0.9:bimax=0.9',
        contrast: 'eq=contrast=1.5:brightness=0.1:saturation=1.3',
        sharpness: 'unsharp=5:5:2:5:5:1',
        fps: 30
    }
};
```

**What it does:**
- Applies professional color grading
- Adjusts contrast and saturation
- Enhances sharpness
- Optimizes frame rate for style

### **3. Jump Cut Processing**
```javascript
// For MrBeast style, create more aggressive cuts
const cutThreshold = style === 'mrbeast' ? 0.3 : 0.5;

scenes.forEach((scene, index) => {
    if (scene.duration > cutThreshold) {
        inputs.push(`[0:v]trim=start=${scene.start}:end=${scene.end},setpts=PTS-STARTPTS[v${index}]`);
    }
});
```

**What it does:**
- Removes boring/silent sections
- Creates fast-paced editing
- Maintains video flow
- Style-specific cut timing

## 🚀 Advanced AI Features

### **1. OpenAI Whisper Integration (Transcription)**
```javascript
// Add to ai-processor.js
const { OpenAI } = require('openai');

async function generateCaptions(videoPath, style) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    // Extract audio
    const audioPath = await extractAudio(videoPath);
    
    // Transcribe with Whisper
    const transcript = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        language: "en"
    });

    // Generate style-specific captions
    return await generateStyleCaptions(transcript.text, style);
}
```

### **2. AI Music Generation**
```javascript
// Integrate with AIVA or Boomy
async function generateBackgroundMusic(style, duration) {
    const musicAPI = new MusicAPI({
        apiKey: process.env.MUSIC_API_KEY
    });

    const prompt = this.getMusicPrompt(style);
    return await musicAPI.generate({
        prompt: prompt,
        duration: duration,
        style: style
    });
}
```

### **3. AI Voiceover Generation**
```javascript
// Integrate with ElevenLabs
async function generateVoiceover(text, style) {
    const elevenlabs = new ElevenLabs({
        apiKey: process.env.ELEVENLABS_API_KEY
    });

    const voice = this.getStyleVoice(style);
    return await elevenlabs.generate({
        text: text,
        voice: voice,
        model: "eleven_monolingual_v1"
    });
}
```

## 🌐 Cloud AI Services Integration

### **1. Runway ML API**
```javascript
const runway = new RunwayML({
    apiKey: process.env.RUNWAY_API_KEY
});

async function runwayProcessing(videoPath, style) {
    const result = await runway.process({
        input: videoPath,
        operation: 'video-editing',
        style: style,
        quality: 'high'
    });
    
    return result.output;
}
```

### **2. Kaiber AI**
```javascript
const kaiber = new KaiberAI({
    apiKey: process.env.KAIBER_API_KEY
});

async function kaiberGeneration(prompt, style) {
    const result = await kaiber.generate({
        prompt: prompt,
        style: style,
        duration: 30,
        quality: 'high'
    });
    
    return result.video;
}
```

## 📊 Performance Optimization

### **1. GPU Acceleration**
```javascript
// Enable NVIDIA GPU acceleration
const gpuFilters = [
    '-hwaccel', 'cuda',
    '-hwaccel_output_format', 'cuda',
    '-c:v', 'h264_nvenc'
];
```

### **2. Parallel Processing**
```javascript
// Process multiple videos simultaneously
const maxConcurrent = 3;
const processingQueue = [];

async function processQueue() {
    while (processingQueue.length > 0 && activeProcesses < maxConcurrent) {
        const project = processingQueue.shift();
        activeProcesses++;
        
        try {
            await processVideoWithAI(project.id);
        } finally {
            activeProcesses--;
        }
        
        // Process next item
        processQueue();
    }
}
```

### **3. Caching System**
```javascript
// Cache processed videos
const videoCache = new Map();

async function getCachedVideo(style, intensity, quality) {
    const cacheKey = `${style}-${intensity}-${quality}`;
    
    if (videoCache.has(cacheKey)) {
        return videoCache.get(cacheKey);
    }
    
    // Generate and cache
    const video = await generateStyleVideo(style, intensity, quality);
    videoCache.set(cacheKey, video);
    
    return video;
}
```

## 🔒 Security & Rate Limiting

### **1. API Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 uploads per windowMs
    message: 'Too many uploads, please try again later'
});

app.use('/api/upload', uploadLimiter);
```

### **2. File Validation**
```javascript
const fileFilter = (req, file, cb) => {
    // Check file type
    if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files allowed'), false);
    }
    
    // Check file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
        return cb(new Error('File too large'), false);
    }
    
    // Check for malicious content
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
        return cb(new Error('Invalid filename'), false);
    }
    
    cb(null, true);
};
```

## 🧪 Testing Your AI Integration

### **1. Test Video Processing**
```bash
# Start the server
cd backend
npm run dev

# Test with a sample video
curl -X POST http://localhost:3001/api/upload \
  -F "video=@sample-video.mp4" \
  -F "style=mrbeast" \
  -F "intensity=high" \
  -F "quality=1080p"
```

### **2. Monitor Processing**
```bash
# Check processing status
curl http://localhost:3001/api/projects/PROJECT_ID/progress

# View server logs
tail -f backend/logs/server.log
```

### **3. Performance Testing**
```javascript
// Test different video sizes and styles
const testCases = [
    { size: '10MB', style: 'mrbeast', expectedTime: '2-3 minutes' },
    { size: '100MB', style: 'cinematic', expectedTime: '5-7 minutes' },
    { size: '500MB', style: 'vlog', expectedTime: '10-15 minutes' }
];
```

## 🚀 Deployment Considerations

### **1. Server Requirements**
- **CPU**: 8+ cores for video processing
- **RAM**: 16GB+ for large video files
- **Storage**: SSD for fast I/O
- **GPU**: NVIDIA GPU for acceleration (optional)

### **2. Environment Variables**
```bash
# .env file
FFMPEG_PATH=/usr/bin/ffmpeg
OPENAI_API_KEY=your_openai_key
RUNWAY_API_KEY=your_runway_key
ELEVENLABS_API_KEY=your_elevenlabs_key
MAX_FILE_SIZE=500000000
MAX_CONCURRENT_PROCESSES=3
```

### **3. Docker Configuration**
```dockerfile
FROM node:18

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Copy application
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm install

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]
```

## 🎯 Next Steps

### **Phase 1: Basic AI (Current)**
- ✅ FFmpeg integration
- ✅ Scene detection
- ✅ Style application
- ✅ Quality optimization

### **Phase 2: Advanced AI**
- 🔄 OpenAI Whisper transcription
- 🔄 AI music generation
- 🔄 AI voiceover
- 🔄 Advanced effects

### **Phase 3: Cloud AI**
- 🔄 Runway ML integration
- 🔄 Kaiber AI generation
- 🔄 Cloud rendering
- 🔄 AI model training

## 🆘 Troubleshooting

### **Common Issues:**

1. **FFmpeg not found**
   ```bash
   # Check PATH
   echo $PATH
   which ffmpeg
   
   # Reinstall FFmpeg
   brew reinstall ffmpeg  # macOS
   sudo apt reinstall ffmpeg  # Ubuntu
   ```

2. **Memory issues with large videos**
   ```javascript
   // Increase Node.js memory limit
   node --max-old-space-size=8192 server.js
   ```

3. **Processing too slow**
   ```javascript
   // Use faster presets
   '-preset', 'ultrafast'  // Instead of 'slow'
   ```

4. **GPU acceleration not working**
   ```bash
   # Check NVIDIA drivers
   nvidia-smi
   
   # Verify FFmpeg GPU support
   ffmpeg -encoders | grep nvenc
   ```

## 📚 Resources

- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html
- **OpenAI API**: https://platform.openai.com/docs
- **Runway ML**: https://runwayml.com/docs/
- **ElevenLabs**: https://docs.elevenlabs.io/

---

**🎬 Your AI video editing website is now ready for real AI processing!**

Start with FFmpeg integration, then gradually add cloud AI services as you scale.

