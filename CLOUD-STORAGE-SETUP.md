# 🚀 **Cloud Storage Setup for Live Video Downloads on Render**

## 🎯 **Why Cloud Storage?**

**Render Limitation:** Files are lost on every deployment, making video downloads impossible.

**Solution:** Store videos in AWS S3 (or similar) for persistent, reliable access.

---

## 📋 **Step 1: AWS S3 Setup**

### 1.1 **Create AWS Account**
- Go to [aws.amazon.com](https://aws.amazon.com)
- Sign up for free tier (12 months free, 5GB storage)

### 1.2 **Create S3 Bucket**
```bash
# In AWS Console:
1. Go to S3 Service
2. Click "Create bucket"
3. Name: your-app-name-videos
4. Region: us-east-1 (or your preference)
5. Block Public Access: Uncheck (for video streaming)
6. Create bucket
```

### 1.3 **Create IAM User**
```bash
# In AWS Console:
1. Go to IAM Service
2. Create User: video-upload-user
3. Attach Policy: AmazonS3FullAccess
4. Copy Access Key ID and Secret Access Key
```

---

## 🔧 **Step 2: Environment Variables**

### 2.1 **On Render Dashboard**
Add these environment variables:

```bash
STORAGE_MODE=cloud
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### 2.2 **Local Development**
Copy `config.env.example` to `config.env` and fill in your AWS credentials.

---

## 🎬 **Step 3: How It Works Now**

### 3.1 **Video Upload**
- Videos go directly to S3
- Database stores S3 key (not local path)
- No more lost files on deployment!

### 3.2 **Video Download**
- `/api/projects/:id/download` - Direct download
- `/api/projects/:id/video` - Stream for preview
- Both work from S3, not local files

### 3.3 **Database Changes**
Your projects table now stores:
- `processedVideoKey` - S3 object key
- `processedVideo` - Fallback local path

---

## 🚀 **Step 4: Deploy to Render**

### 4.1 **Push Your Code**
```bash
git add .
git commit -m "Add cloud storage support for video downloads"
git push
```

### 4.2 **Set Environment Variables**
In Render dashboard, add all AWS variables.

### 4.3 **Deploy**
Render will automatically:
- Install new dependencies (`aws-sdk`, `multer-s3`)
- Use cloud storage mode
- Enable persistent video downloads

---

## 🎯 **Step 5: Test Video Downloads**

### 5.1 **Upload a Video**
- Use your existing upload endpoint
- Video goes to S3 automatically

### 5.2 **Download Video**
- Process your video
- Use `/api/projects/:id/download` endpoint
- Video downloads from S3 (persistent!)

---

## 💰 **Costs (Free Tier)**
- **S3 Storage:** 5GB free for 12 months
- **Data Transfer:** 15GB free per month
- **Requests:** 20,000 free per month

**After Free Tier:**
- Storage: $0.023 per GB/month
- Transfer: $0.09 per GB
- Requests: $0.0004 per 1,000 requests

---

## 🔒 **Security Best Practices**

### 6.1 **IAM Permissions**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### 6.2 **Environment Variables**
- Never commit AWS keys to Git
- Use Render's environment variable system
- Rotate keys regularly

---

## 🚨 **Troubleshooting**

### 7.1 **"Access Denied" Error**
- Check AWS credentials in environment variables
- Verify IAM user has S3 permissions
- Ensure bucket name is correct

### 7.2 **"Video Not Found" Error**
- Check if `processedVideoKey` exists in database
- Verify S3 object exists
- Check bucket region matches environment

### 7.3 **Upload Fails**
- Verify bucket exists and is accessible
- Check file size limits (500MB)
- Ensure proper CORS configuration

---

## 🎉 **Result**

✅ **Videos persist between deployments**  
✅ **Downloads work 24/7**  
✅ **Scalable storage solution**  
✅ **Professional video hosting**  
✅ **No more lost files!**

---

## 📞 **Need Help?**

1. **Check Render logs** for error messages
2. **Verify AWS credentials** are correct
3. **Test locally** with `config.env` file
4. **Check S3 bucket** permissions and settings

Your videos will now download live from Render! 🎬✨
