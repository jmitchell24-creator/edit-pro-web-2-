const fs = require('fs-extra');
const path = require('path');
const { uploadVideo, getVideoUrl } = require('./cloud-storage');

const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY || '';
const SHOTSTACK_BASE_URL = process.env.SHOTSTACK_BASE_URL || 'https://api.shotstack.io/stage';

async function http(method, url, body) {
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': SHOTSTACK_API_KEY,
    };
    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Shotstack ${method} ${url} failed: ${res.status} ${text}`);
    }
    return res.json();
}

function buildTimeline(inputUrl, style, quality, targetSeconds) {
    // Minimal timeline that renders the source video with optional filter
    const filtersByStyle = {
        cinematic: 'boost',
        mrbeast: 'bold',
        vlog: 'bright',
        podcast: 'muted',
    };
    const filter = filtersByStyle[style] || 'boost';

    const resolutionMap = {
        '720p': 'sd',
        '1080p': 'hd',
        '4k': 'ultra',
        '8k': 'ultra',
    };
    const resolution = resolutionMap[quality] || 'hd';

    const clipLength = (typeof targetSeconds === 'number' && targetSeconds > 0) ? targetSeconds : 10;
    return {
        timeline: {
            background: '#000000',
            tracks: [
                {
                    clips: [
                        {
                            asset: {
                                type: 'video',
                                src: inputUrl,
                            },
                            start: 0,
                            length: clipLength,
                            fit: 'cover',
                            filter,
                        },
                    ],
                },
            ],
        },
        output: {
            format: 'mp4',
            resolution,
        },
    };
}

async function submitRenderFromUrl(inputUrl, style, quality, targetSeconds) {
    const payload = buildTimeline(inputUrl, style, quality, targetSeconds);
    const data = await http('POST', `${SHOTSTACK_BASE_URL}/render`, payload);
    return data.response && data.response.id ? data.response.id : data.id;
}

async function getRenderStatus(id) {
    const data = await http('GET', `${SHOTSTACK_BASE_URL}/render/${id}`);
    return data.response || data;
}

async function pollUntilComplete(id, { intervalMs = 3000, timeoutMs = 5 * 60 * 1000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const status = await getRenderStatus(id);
        if (status.status === 'done') {
            // Find MP4 asset URL
            const url = status.output && status.output.url ? status.output.url : (status.assets && status.assets.find(a => a.type === 'video')?.url);
            return { success: true, url: url || null, status };
        }
        if (status.status === 'failed' || status.status === 'error' || status.status === 'cancelled') {
            return { success: false, status };
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return { success: false, status: { status: 'timeout' } };
}

async function ensureRemoteUrlForLocalFile(localFilePath, originalName) {
    const storageMode = process.env.STORAGE_MODE || 'local';
    const publicBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

    // If using local storage and PUBLIC_BASE_URL is provided, build a direct URL to /uploads
    if (storageMode !== 'cloud' && publicBase) {
        const filename = originalName || path.basename(localFilePath);
        return `${publicBase}/uploads/${encodeURIComponent(filename)}`;
    }

    // Fallback: upload to S3 and return public URL
    const buffer = await fs.readFile(localFilePath);
    const file = {
        originalname: originalName || path.basename(localFilePath),
        buffer,
        mimetype: 'video/mp4',
    };
    const uploaded = await uploadVideo(file);
    return uploaded.url || getVideoUrl(uploaded.key);
}

module.exports = {
    submitRenderFromUrl,
    pollUntilComplete,
    ensureRemoteUrlForLocalFile,
};

// New simplified render function using prompt-based request (per user spec)
async function renderWithPromptFromUrl(inputUrl, style, quality, targetSeconds) {
    const resolutionByQuality = {
        '720p': '720',
        '1080p': '1080',
        '4k': '2160',
        '8k': '4320',
    };
    const resolution = resolutionByQuality[quality] || '1080';
    const length = (typeof targetSeconds === 'number' && targetSeconds > 0) ? targetSeconds : 10;

    const body = {
        timeline: {
            tracks: [
                {
                    clips: [
                        {
                            asset: {
                                type: 'upload',
                                src: inputUrl,
                            },
                            start: 0,
                            length,
                        },
                    ],
                },
            ],
        },
        output: {
            format: 'mp4',
            resolution,
        },
        prompt: `
      You are an AI video editor.
      The user uploads a video. Your task is to automatically edit it for social media.

      Editing steps:
      1. Trim long pauses and silences.
      2. Add smooth transitions between cuts.
      3. Auto-generate subtitles (white text, bottom center).
      4. Sync cuts to background music if provided.
      5. Normalize audio and reduce noise.
      6. Export as MP4, 1080p, optimized for Instagram/TikTok.

      Output:
      - Provide a downloadable link to the final video.
      - Provide a JSON summary with:
        • Scenes detected
        • Transcript
        • Effects applied
    `,
    };

    const res = await fetch(`${SHOTSTACK_BASE_URL}/render`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': SHOTSTACK_API_KEY,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Shotstack prompt render failed: ${res.status} ${text}`);
    }
    const result = await res.json();
    return { success: true, url: result.outputUrl || result.url || null, raw: result };
}

module.exports.renderWithPromptFromUrl = renderWithPromptFromUrl;


