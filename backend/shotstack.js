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


