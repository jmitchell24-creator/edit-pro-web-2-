# 🚂 Railway Deployment Guide for Edit Quick AI

## Quick Steps to Deploy on Railway:

### 1. **Install Railway CLI** (if you haven't already)
```bash
npm install -g @railway/cli
```

### 2. **Login to Railway**
```bash
railway login
```

### 3. **Initialize Railway Project**
```bash
railway init
```

### 4. **Deploy Your Project**
```bash
railway up
```

## 🔧 What I Fixed for You:

✅ **Fixed package.json** - Now points to correct start script  
✅ **Added railway.json** - Railway-specific configuration  
✅ **Added .railwayignore** - Excludes large files from deployment  
✅ **Server.js** - Already properly configured for Railway  

## 🌍 Environment Variables to Set in Railway:

Go to your Railway project dashboard and add these environment variables:

```
PORT=8080
NODE_ENV=production
MAX_FILE_SIZE=100MB
MAX_FILES=10
```

## 📱 After Deployment:

1. Railway will give you a public URL (like `https://your-app.railway.app`)
2. Your dashboard will be available at that URL
3. The API will be at `https://your-app.railway.app/api`

## 🚨 Important Notes:

- **FFmpeg files are excluded** (too large for Railway)
- **Database will be SQLite** (stored in Railway's ephemeral storage)
- **File uploads** will work but files won't persist between deployments

## 🔍 Troubleshooting:

If deployment fails:
1. Check Railway logs in the dashboard
2. Make sure all dependencies are in package.json
3. Verify the start script is correct

## 📞 Need Help?

Check Railway's logs in your project dashboard for any error messages!
