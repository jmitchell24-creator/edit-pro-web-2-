# 🚀 Edit Quick AI - Deployment Guide

## 🎯 **Ready to Go Live!**

Your Edit Quick AI website is now properly organized and ready for deployment. Here's everything you need to know to get it running.

## 📁 **File Structure (Final)**

```
edit-quick-website/
├── 📁 backend/                    # Backend server files
│   ├── server.js                  # Main server file
│   ├── database.js                # Database setup & operations
│   ├── auth.js                    # Authentication system
│   ├── usage-limits.js            # Guest usage & subscription limits
│   ├── analytics.js               # Analytics & reporting
│   ├── sharing.js                 # Project sharing system
│   ├── ai-processor.js            # AI video processing
│   └── 📁 data/                   # SQLite database files
├── 📁 config/                     # Configuration files
├── 📁 projects/                   # Processed video storage
├── 📁 uploads/                    # Uploaded video storage
├── 📁 ffmpeg-8.0/                 # FFmpeg binaries
├── 📁 ffmpeg-extracted/           # Extracted FFmpeg
├── dashboard.html                  # Main dashboard
├── subscription-plans.html         # Subscription plans page
├── register.html                   # User registration
├── login.html                      # User login
├── index.html                      # Landing page
├── package.json                    # Dependencies & scripts
├── start.js                        # Startup script
├── config.env                      # Environment variables
└── README.md                       # Project documentation
```

## 🛠️ **Installation & Setup**

### 1. **Install Dependencies**
```bash
# Install all dependencies
npm run install-deps

# Or manually:
npm install
```

### 2. **Environment Setup**
Create/update your `config.env` file:
```env
PORT=8080
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=production
```

### 3. **Database Setup**
The database will be automatically created on first run:
```bash
# Optional: Manual database setup
npm run setup
```

## 🚀 **Starting the Server**

### **Development Mode**
```bash
npm run dev
```

### **Production Mode**
```bash
npm start
```

### **Manual Start**
```bash
node start.js
```

## 🌐 **Accessing Your Website**

Once started, your website will be available at:
- **Main Dashboard**: `http://localhost:8080`
- **Subscription Plans**: `http://localhost:8080/plans`
- **Registration**: `http://localhost:8080/register`
- **Login**: `http://localhost:8080/login`

## 🔧 **Production Deployment**

### **Option 1: VPS/Cloud Server**
1. Upload files to your server
2. Install Node.js (v16+)
3. Run `npm install`
4. Set up environment variables
5. Use PM2 or similar for process management:
   ```bash
   npm install -g pm2
   pm2 start start.js --name "edit-quick"
   pm2 startup
   pm2 save
   ```

### **Option 2: Heroku**
1. Create Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy using Git:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push heroku main
   ```

### **Option 3: Railway/Render**
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

## 🔒 **Security Checklist**

- [ ] Change `JWT_SECRET` in production
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Use HTTPS in production
- [ ] Regular security updates

## 📊 **Monitoring & Maintenance**

### **Health Check**
```bash
curl http://localhost:8080/api/health
```

### **Database Management**
```bash
# View database info
node backend/db-manager.js

# Reset database (careful!)
node -e "require('./backend/db-manager').resetDatabase()"
```

### **Logs**
```bash
# View logs if using PM2
pm2 logs edit-quick

# View real-time logs
pm2 logs edit-quick --lines 100
```

## 🎬 **Testing Your Deployment**

1. **Visit the dashboard** - should load without errors
2. **Try guest upload** - should allow 1 free video
3. **Register account** - should create user successfully
4. **Choose subscription** - should create subscription
5. **Upload more videos** - should respect limits

## 🚨 **Common Issues & Solutions**

### **Port Already in Use**
```bash
# Find process using port 8080
lsof -i :8080
# Kill process
kill -9 <PID>
```

### **Database Errors**
```bash
# Reset database
rm backend/data/editquick.db
npm start
```

### **Permission Errors**
```bash
# Fix uploads/projects directories
chmod 755 uploads projects
```

### **FFmpeg Issues**
```bash
# Ensure FFmpeg is executable
chmod +x ffmpeg-8.0/ffmpeg
chmod +x ffmpeg-extracted/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe
```

## 📈 **Performance Optimization**

- **Enable compression** in production
- **Use CDN** for static assets
- **Database indexing** for large datasets
- **Video processing queue** for high traffic
- **Caching** for frequently accessed data

## 🔄 **Updates & Maintenance**

### **Regular Updates**
```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### **Backup Strategy**
- Database: `backend/data/editquick.db`
- Uploads: `uploads/` directory
- Projects: `projects/` directory
- Configuration: `config.env`

## 🎉 **You're Ready!**

Your Edit Quick AI website is now properly organized and ready for production deployment. The guest usage system, subscription plans, and all features are working correctly.

**Next Steps:**
1. Choose your deployment platform
2. Set up environment variables
3. Deploy and test
4. Monitor performance
5. Start accepting users!

## 📞 **Support**

If you encounter any issues:
1. Check the logs for error messages
2. Verify all dependencies are installed
3. Ensure environment variables are set
4. Check file permissions
5. Review the `GUEST-USAGE-README.md` for system details

**Happy Deploying! 🚀**
