# Edit Quick Database Setup & Management

This document explains how to set up and manage the SQLite database for the Edit Quick AI video editing platform.

## 🗄️ Database Overview

The application uses **SQLite** as its database, which provides:
- **Lightweight**: No separate database server required
- **File-based**: Database is stored in `backend/data/editquick.db`
- **Reliable**: ACID compliant with excellent performance
- **Zero-config**: Works out of the box

## 📁 Database Structure

### Tables

#### 1. `projects` - Main project storage
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,           -- Unique project identifier
    name TEXT NOT NULL,            -- Project name
    status TEXT DEFAULT 'pending', -- Current status
    style TEXT DEFAULT 'cinematic', -- AI editing style
    intensity TEXT DEFAULT 'medium', -- Effect intensity
    quality TEXT DEFAULT 'high',   -- Output quality
    customEffects TEXT DEFAULT '[]', -- JSON array of custom effects
    platformOptimize TEXT DEFAULT 'auto', -- Platform optimization
    aiIntelligence TEXT DEFAULT 'smart', -- AI processing level
    createdAt TEXT NOT NULL,       -- Creation timestamp
    fileSize INTEGER,              -- Original video size
    progress INTEGER DEFAULT 0,    -- Processing progress (0-100)
    currentStep TEXT DEFAULT '',   -- Current processing step
    thumbnail TEXT,                -- Thumbnail file path
    processedVideo TEXT,           -- Final video file path
    originalVideo TEXT,            -- Original video file path
    userId TEXT DEFAULT 'default'  -- User identifier (for future auth)
);
```

#### 2. `users` - User management (for future authentication)
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- Unique user identifier
    username TEXT UNIQUE NOT NULL, -- Username
    email TEXT UNIQUE,             -- Email address
    createdAt TEXT NOT NULL,       -- Account creation timestamp
    lastLogin TEXT                 -- Last login timestamp
);
```

#### 3. `processing_history` - Processing step tracking
```sql
CREATE TABLE processing_history (
    id TEXT PRIMARY KEY,           -- Unique history entry ID
    projectId TEXT NOT NULL,       -- Reference to project
    step TEXT NOT NULL,            -- Processing step name
    status TEXT NOT NULL,          -- Step status (success/error)
    message TEXT,                  -- Step description/message
    timestamp TEXT NOT NULL,       -- When the step occurred
    FOREIGN KEY (projectId) REFERENCES projects (id)
);
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start the Server
```bash
npm start
```

The database will be automatically created when the server starts.

### 3. Verify Database Creation
```bash
npm run db-info
```

## 🛠️ Database Management

### Interactive Database Manager
```bash
npm run db
```

This opens an interactive CLI with the following commands:
- `info` - Show database statistics
- `projects [limit]` - Show recent projects
- `history <projectId>` - Show project processing history
- `cleanup [days]` - Remove old history entries
- `reset` - Reset database (⚠️ **DANGEROUS**)
- `exit` - Close the manager

### Quick Commands
```bash
# Show database info
npm run db-info

# Reset database (⚠️ **DANGEROUS**)
npm run db-reset
```

## 📊 Database Operations

### Project Management
- **Create**: Automatically created when uploading videos
- **Read**: All API endpoints now use database queries
- **Update**: Progress and status updates during processing
- **Delete**: Project cleanup with file removal

### Processing History
- **Automatic tracking** of all processing steps
- **Error logging** with timestamps
- **Progress updates** stored in database
- **Cleanup** of old entries to prevent bloat

## 🔧 API Endpoints Updated

All API endpoints now use the database instead of in-memory storage:

- `GET /api/projects` - List all projects from database
- `GET /api/projects/:id` - Get specific project details
- `POST /api/upload` - Create project in database
- `POST /api/projects/:id/process` - Update processing status
- `GET /api/projects/:id/progress` - Get current progress
- `DELETE /api/projects/:id` - Remove project and files

## 📈 Performance Benefits

### Before (In-Memory)
- ❌ Data lost on server restart
- ❌ No persistence between sessions
- ❌ Limited scalability
- ❌ No data backup/recovery

### After (SQLite Database)
- ✅ **Persistent storage** - Data survives restarts
- ✅ **Reliable queries** - ACID compliant operations
- ✅ **Better performance** - Optimized queries and indexing
- ✅ **Data integrity** - Foreign key constraints
- ✅ **Processing history** - Complete audit trail
- ✅ **Scalability** - Can handle thousands of projects

## 🗂️ File Structure

```
backend/
├── data/                    # Database files
│   └── editquick.db        # SQLite database
├── database.js             # Database configuration
├── db-manager.js           # Database management CLI
├── server.js               # Main server (updated)
├── package.json            # Dependencies
└── DATABASE-README.md      # This file
```

## 🔍 Troubleshooting

### Database Locked
```bash
# Stop the server first
npm run db-reset
```

### Corrupted Database
```bash
# Remove and recreate
rm backend/data/editquick.db
npm start  # Will recreate automatically
```

### Permission Issues
```bash
# Ensure write permissions to backend/data/
chmod 755 backend/data/
```

## 🔮 Future Enhancements

### Planned Features
- **User Authentication** - Multi-user support
- **Project Sharing** - Collaborative editing
- **Backup System** - Automatic database backups
- **Analytics** - Processing statistics and insights
- **API Rate Limiting** - User-based limits

### Migration Path
The current SQLite setup can easily migrate to:
- **PostgreSQL** - For production deployments
- **MySQL** - Alternative relational database
- **MongoDB** - If NoSQL is preferred

## 📚 Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Better-SQLite3](https://github.com/JoshuaWise/better-sqlite3)
- [Node.js Database Best Practices](https://nodejs.org/en/docs/guides/)

## 🤝 Support

If you encounter issues with the database:
1. Check the server logs for error messages
2. Use `npm run db-info` to verify database health
3. Try `npm run db-reset` as a last resort
4. Check file permissions in the `backend/data/` directory

---

**Note**: The database is automatically created and managed. No manual setup required!
