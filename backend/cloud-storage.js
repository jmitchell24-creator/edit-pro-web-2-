const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const s3 = new S3Client({
    region: AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});

// Upload video buffer to S3 (used by Shotstack helper)
const uploadVideo = async (file) => {
    try {
        const key = `uploads/${Date.now()}-${uuidv4()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        }));
        return {
            url: getVideoUrl(key),
            key,
            filename: path.basename(key)
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload video to cloud storage');
    }
};

// Download full object and send (small files)
const downloadVideo = async (key, res) => {
    try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        res.setHeader('Content-Type', obj.ContentType || 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
        if (obj.ContentLength != null) res.setHeader('Content-Length', obj.ContentLength.toString());
        obj.Body.pipe(res);
    } catch (error) {
        console.error('S3 download error:', error);
        throw new Error('Failed to download video from cloud storage');
    }
};

// Stream video (pipes the body)
const streamVideo = async (key, res) => {
    try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        res.setHeader('Content-Type', obj.ContentType || 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        obj.Body.pipe(res);
    } catch (error) {
        console.error('S3 stream error:', error);
        throw new Error('Failed to stream video from cloud storage');
    }
};

const deleteVideo = async (key) => {
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete video from cloud storage');
    }
};

const getVideoUrl = (key) => `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

module.exports = { uploadVideo, downloadVideo, streamVideo, deleteVideo, getVideoUrl };
