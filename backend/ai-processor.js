const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class AIVideoProcessor {
    constructor() {
        // Prefer bundled static binaries; fallback to system PATH
        try {
            // eslint-disable-next-line global-require
            this.ffmpegPath = require('ffmpeg-static') || 'ffmpeg';
        } catch (e) {
            this.ffmpegPath = 'ffmpeg';
        }
        try {
            // eslint-disable-next-line global-require
            const ffprobeStatic = require('ffprobe-static');
            this.ffprobePath = (ffprobeStatic && ffprobeStatic.path) || 'ffprobe';
        } catch (e) {
            this.ffprobePath = 'ffprobe';
        }
    }

    // Check if FFmpeg is available
    async checkFFmpeg() {
        try {
            await this.runCommand(this.ffmpegPath, ['-version']);
            return true;
        } catch (error) {
            console.error('FFmpeg not found. Please install FFmpeg first.');
            return false;
        }
    }

    // Get video information using ffprobe
    async getVideoInfo(videoPath) {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn(this.ffprobePath, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                videoPath
            ]);

            let output = '';
            let error = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.stderr.on('data', (data) => {
                error += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const info = JSON.parse(output);
                        resolve(info);
                    } catch (e) {
                        reject(new Error('Failed to parse video info'));
                    }
                } else {
                    reject(new Error(`FFprobe failed: ${error}`));
                }
            });
        });
    }

    // AI Scene Detection using audio analysis
    async detectScenes(videoPath, outputPath) {
        const scenes = [];
        
        try {
            // Extract audio for analysis
            const audioPath = path.join(path.dirname(outputPath), 'temp_audio.wav');
            
            // Extract audio
            await this.runCommand(this.ffmpegPath, [
                '-i', videoPath,
                '-vn', '-acodec', 'pcm_s16le',
                '-ar', '44100',
                '-ac', '1',
                audioPath
            ]);

            // Analyze audio for silence detection (scene changes often have silence)
            const silenceInfo = await this.runCommand(this.ffmpegPath, [
                '-i', audioPath,
                '-af', 'silencedetect=noise=-50dB:d=0.5',
                '-f', 'null', '-'
            ]);

            // Parse silence detection output to find scene boundaries
            const silenceMatches = silenceInfo.match(/silence_start: (\d+\.?\d*)/g);
            const silenceEndMatches = silenceInfo.match(/silence_end: (\d+\.?\d*)/g);

            if (silenceMatches && silenceEndMatches) {
                for (let i = 0; i < silenceMatches.length; i++) {
                    const start = parseFloat(silenceMatches[i].split(': ')[1]);
                    const end = parseFloat(silenceEndMatches[i].split(': ')[1]);
                    
                    if (end - start > 0.5) { // Only consider significant silences
                        scenes.push({
                            start: start,
                            end: end,
                            duration: end - start
                        });
                    }
                }
            }

            // Clean up temp audio
            await fs.remove(audioPath);

            return scenes;
        } catch (error) {
            console.error('Scene detection failed:', error);
            return [];
        }
    }

    // Apply AI-powered editing style
    async applyStyle(videoPath, outputPath, style, intensity) {
        const styleConfig = this.getStyleConfig(style, intensity);
        
        try {
            // Apply the style using FFmpeg filters
            const filters = this.buildStyleFilters(styleConfig);
            
            await this.runCommand(this.ffmpegPath, [
                '-i', videoPath,
                '-vf', filters,
                '-c:a', 'copy',
                '-preset', 'medium',
                outputPath
            ]);

            return true;
        } catch (error) {
            console.error('Style application failed:', error);
            throw error;
        }
    }

    // Get style configuration based on style and intensity
    getStyleConfig(style, intensity) {
        const baseConfigs = {
            cinematic: {
                colorGrading: 'colorlevels=rimin=0.058:gimin=0.058:bimin=0.058:rimax=0.942:gimax=0.942:bimax=0.942',
                contrast: 'eq=contrast=1.2:brightness=0.05:saturation=1.1',
                sharpness: 'unsharp=3:3:1.5:3:3:0.5',
                fps: 24
            },
            mrbeast: {
                colorGrading: 'colorlevels=rimin=0.1:gimin=0.1:bimin=0.1:rimax=0.9:gimax=0.9:bimax=0.9',
                contrast: 'eq=contrast=1.5:brightness=0.1:saturation=1.3',
                sharpness: 'unsharp=5:5:2:5:5:1',
                fps: 30
            },
            vlog: {
                colorGrading: 'colorlevels=rimin=0.05:gimin=0.05:bimin=0.05:rimax=0.95:gimax=0.95:bimax=0.95',
                contrast: 'eq=contrast=1.1:brightness=0.02:saturation=1.05',
                sharpness: 'unsharp=2:2:0.8:2:2:0.4',
                fps: 30
            },
            podcast: {
                colorGrading: 'colorlevels=rimin=0.02:gimin=0.02:bimin=0.02:rimax=0.98:gimax=0.98:bimax=0.98',
                contrast: 'eq=contrast=1.05:brightness=0:saturation=0.95',
                sharpness: 'unsharp=1:1:0.5:1:1:0.25',
                fps: 30
            }
        };

        const intensityMultipliers = {
            light: 0.5,
            medium: 1.0,
            high: 1.5,
            extreme: 2.0
        };

        const baseConfig = baseConfigs[style] || baseConfigs.cinematic;
        const multiplier = intensityMultipliers[intensity] || 1.0;

        return {
            ...baseConfig,
            intensity: multiplier
        };
    }

    // Build FFmpeg filters for the style
    buildStyleFilters(styleConfig) {
        const filters = [];

        // Apply color grading
        if (styleConfig.colorGrading) {
            filters.push(styleConfig.colorGrading);
        }

        // Apply contrast and brightness adjustments
        if (styleConfig.contrast) {
            filters.push(styleConfig.contrast);
        }

        // Apply sharpness
        if (styleConfig.sharpness) {
            filters.push(styleConfig.sharpness);
        }

        // Apply intensity-based adjustments
        if (styleConfig.intensity !== 1.0) {
            filters.push(`eq=contrast=${1 + (styleConfig.intensity - 1) * 0.3}:saturation=${1 + (styleConfig.intensity - 1) * 0.2}`);
        }

        // Add cinematic effects for certain styles
        if (styleConfig.fps === 24) {
            filters.push('fps=fps=24');
        }

        return filters.join(',');
    }

    // AI-powered jump cut detection and application
    async applyJumpCuts(videoPath, outputPath, style) {
        try {
            // Detect scenes for jump cuts
            const scenes = await this.detectScenes(videoPath, outputPath);
            
            if (scenes.length === 0) {
                // No scenes detected, return original
                await fs.copy(videoPath, outputPath);
                return;
            }

            // Create complex filter for jump cuts
            const filterComplex = this.buildJumpCutFilter(scenes, style);
            
            await this.runCommand(this.ffmpegPath, [
                '-i', videoPath,
                '-filter_complex', filterComplex,
                '-c:a', 'copy',
                '-preset', 'fast',
                outputPath
            ]);

        } catch (error) {
            console.error('Jump cut application failed:', error);
            // Fallback to original video
            await fs.copy(videoPath, outputPath);
        }
    }

    // Build complex filter for jump cuts
    buildJumpCutFilter(scenes, style) {
        const inputs = [];
        const outputs = [];
        let filterString = '';

        // For MrBeast style, create more aggressive cuts
        const cutThreshold = style === 'mrbeast' ? 0.3 : 0.5;

        scenes.forEach((scene, index) => {
            if (scene.duration > cutThreshold) {
                inputs.push(`[0:v]trim=start=${scene.start}:end=${scene.end},setpts=PTS-STARTPTS[v${index}]`);
                outputs.push(`[v${index}]`);
            }
        });

        if (outputs.length > 0) {
            filterString = inputs.join(';') + ';' + outputs.join('') + `concat=n=${outputs.length}:v=1:a=0[outv]`;
        } else {
            filterString = '[0:v]copy[outv]';
        }

        return filterString;
    }

    // Add AI-generated captions (simulated)
    async addCaptions(videoPath, outputPath, style) {
        try {
            // For now, we'll add a simple text overlay
            // In production, you'd integrate with OpenAI Whisper for transcription
            const captionText = this.getStyleCaption(style);
            
            const filter = `drawtext=text='${captionText}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th-10`;

            await this.runCommand(this.ffmpegPath, [
                '-i', videoPath,
                '-vf', filter,
                '-c:a', 'copy',
                '-preset', 'medium',
                outputPath
            ]);

        } catch (error) {
            console.error('Caption addition failed:', error);
            // Fallback to original video
            await fs.copy(videoPath, outputPath);
        }
    }

    // Get style-specific caption text
    getStyleCaption(style) {
        const captions = {
            mrbeast: '🔥 EPIC CONTENT 🔥',
            cinematic: '🎬 CINEMATIC MASTERPIECE 🎬',
            vlog: '📹 DAILY VLOG 📹',
            podcast: '🎙️ PODCAST EPISODE 🎙️'
        };

        return captions[style] || '✨ AI EDITED ✨';
    }

    // Main AI processing pipeline
    async processVideo(inputPath, outputPath, style, intensity, quality) {
        try {
            console.log('🎬 Starting AI video processing...');
            
            // Check FFmpeg availability
            const ffmpegAvailable = await this.checkFFmpeg();
            if (!ffmpegAvailable) {
                throw new Error('FFmpeg not available');
            }

            // Get video info
            const videoInfo = await this.getVideoInfo(inputPath);
            console.log('📊 Video info:', videoInfo.format.duration, 'seconds');

            // Create temp working directory
            const tempDir = path.join(path.dirname(outputPath), 'temp_processing');
            await fs.ensureDir(tempDir);

            // Step 1: Apply AI style
            const styledPath = path.join(tempDir, 'styled.mp4');
            console.log('🎨 Applying AI style...');
            await this.applyStyle(inputPath, styledPath, style, intensity);

            // Step 2: Apply jump cuts (for certain styles)
            const cutPath = path.join(tempDir, 'cut.mp4');
            if (['mrbeast', 'cinematic', 'vlog'].includes(style)) {
                console.log('✂️ Applying AI jump cuts...');
                await this.applyJumpCuts(styledPath, cutPath, style);
            } else {
                await fs.copy(styledPath, cutPath);
            }

            // Step 3: Add captions
            const captionedPath = path.join(tempDir, 'captioned.mp4');
            console.log('📝 Adding AI captions...');
            await this.addCaptions(cutPath, captionedPath, style);

            // Step 4: Final quality optimization
            console.log('⚡ Optimizing quality...');
            await this.optimizeQuality(captionedPath, outputPath, quality);

            // Clean up temp files
            await fs.remove(tempDir);

            console.log('✅ AI processing complete!');
            return true;

        } catch (error) {
            console.error('❌ AI processing failed:', error);
            throw error;
        }
    }

    // Optimize video quality
    async optimizeQuality(inputPath, outputPath, quality) {
        const qualitySettings = {
            '720p': ['-vf', 'scale=1280:720', '-crf', '23'],
            '1080p': ['-vf', 'scale=1920:1080', '-crf', '20'],
            '4k': ['-vf', 'scale=3840:2160', '-crf', '18'],
            '8k': ['-vf', 'scale=7680:4320', '-crf', '16']
        };

        const settings = qualitySettings[quality] || qualitySettings['1080p'];

        await this.runCommand(this.ffmpegPath, [
            '-i', inputPath,
            ...settings,
            '-c:a', 'aac',
            '-b:a', '128k',
            '-preset', 'slow',
            '-movflags', '+faststart',
            outputPath
        ]);
    }

    // Run FFmpeg command
    async runCommand(command, args) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args);
            
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Command failed: ${error}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Failed to start command: ${err.message}`));
            });
        });
    }
}

module.exports = AIVideoProcessor;

