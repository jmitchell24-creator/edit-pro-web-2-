const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configure AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

// Configure multer for S3 uploads
const s3Storage = multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
        cb(null, `uploads/${uniqueName}`);
    }
});

// Upload video to S3
const uploadVideo = async (file) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: `uploads/${Date.now()}-${uuidv4()}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        };

        const result = await s3.upload(params).promise();
        return {
            url: result.Location,
            key: result.Key,
            filename: path.basename(result.Key)
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload video to cloud storage');
    }
};

// Download video from S3
const downloadVideo = async (key, res) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };

        const object = await s3.getObject(params).promise();
        
        // Set headers for download
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
        res.setHeader('Content-Length', object.ContentLength);
        
        // Send video data
        res.send(object.Body);
    } catch (error) {
        console.error('S3 download error:', error);
        throw new Error('Failed to download video from cloud storage');
    }
};

// Stream video from S3
const streamVideo = async (key, res) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };

        // Set headers for streaming
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');

        // Create readable stream from S3
        const s3Stream = s3.getObject(params).createReadStream();
        s3Stream.pipe(res);
    } catch (error) {
        console.error('S3 stream error:', error);
        throw new Error('Failed to stream video from cloud storage');
    }
};

// Delete video from S3
const deleteVideo = async (key) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete video from cloud storage');
    }
};

// Get video URL
const getVideoUrl = (key) => {
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
};

module.exports = {
    s3Storage,
    uploadVideo,
    downloadVideo,
    streamVideo,
    deleteVideo,
    getVideoUrl
};
