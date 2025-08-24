const { db } = require('./database');

// Analytics operations
const analyticsOperations = {
    // Get user statistics
    getUserStats: db.prepare(`
        SELECT 
            COUNT(*) as totalUsers,
            COUNT(CASE WHEN lastLogin > datetime('now', '-7 days') THEN 1 END) as activeUsers7d,
            COUNT(CASE WHEN lastLogin > datetime('now', '-30 days') THEN 1 END) as activeUsers30d,
            COUNT(CASE WHEN createdAt > datetime('now', '-7 days') THEN 1 END) as newUsers7d,
            COUNT(CASE WHEN createdAt > datetime('now', '-30 days') THEN 1 END) as newUsers30d
        FROM users
    `),

    // Get project statistics
    getProjectStats: db.prepare(`
        SELECT 
            COUNT(*) as totalProjects,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedProjects,
            COUNT(CASE WHEN status = 'processing' THEN 1 END) as processingProjects,
            COUNT(CASE WHEN status = 'error' THEN 1 END) as errorProjects,
            COUNT(CASE WHEN createdAt > datetime('now', '-7 days') THEN 1 END) as newProjects7d,
            COUNT(CASE WHEN createdAt > datetime('now', '-30 days') THEN 1 END) as newProjects30d,
            AVG(CASE WHEN status = 'completed' THEN progress END) as avgProgress,
            SUM(CASE WHEN fileSize IS NOT NULL THEN fileSize ELSE 0 END) as totalStorageUsed
        FROM projects
    `),

    // Get processing performance stats
    getProcessingStats: db.prepare(`
        SELECT 
            COUNT(*) as totalProcessingSteps,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successfulSteps,
            COUNT(CASE WHEN status = 'error' THEN 1 END) as failedSteps,
            AVG(CASE WHEN timestamp > datetime('now', '-7 days') THEN 1 ELSE 0 END) as avgStepsPerDay7d,
            COUNT(CASE WHEN step = 'upload' THEN 1 END) as uploads,
            COUNT(CASE WHEN step = 'start_processing' THEN 1 END) as processingStarts,
            COUNT(CASE WHEN step = 'completion' THEN 1 END) as completions
        FROM processing_history
    `),

    // Get popular editing styles
    getPopularStyles: db.prepare(`
        SELECT 
            style,
            COUNT(*) as usageCount,
            AVG(progress) as avgProgress
        FROM projects 
        WHERE style IS NOT NULL
        GROUP BY style 
        ORDER BY usageCount DESC 
        LIMIT 10
    `),

    // Get user activity timeline
    getUserActivityTimeline: db.prepare(`
        SELECT 
            DATE(createdAt) as date,
            COUNT(*) as newUsers,
            COUNT(CASE WHEN lastLogin > datetime(createdAt, '+1 day') THEN 1 END) as returningUsers
        FROM users 
        WHERE createdAt > datetime('now', '-30 days')
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
    `),

    // Get project creation timeline
    getProjectTimeline: db.prepare(`
        SELECT 
            DATE(createdAt) as date,
            COUNT(*) as newProjects,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedProjects
        FROM projects 
        WHERE createdAt > datetime('now', '-30 days')
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
    `),

    // Get top users by project count
    getTopUsers: db.prepare(`
        SELECT 
            u.username,
            COUNT(p.id) as projectCount,
            COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completedCount,
            AVG(p.progress) as avgProgress
        FROM users u
        LEFT JOIN projects p ON u.id = p.userId
        GROUP BY u.id, u.username
        HAVING projectCount > 0
        ORDER BY projectCount DESC
        LIMIT 10
    `),

    // Get storage usage by user
    getStorageUsage: db.prepare(`
        SELECT 
            u.username,
            COUNT(p.id) as projectCount,
            SUM(CASE WHEN p.fileSize IS NOT NULL THEN p.fileSize ELSE 0 END) as totalStorage,
            AVG(CASE WHEN p.fileSize IS NOT NULL THEN p.fileSize ELSE 0 END) as avgFileSize
        FROM users u
        LEFT JOIN projects p ON u.id = p.userId
        GROUP BY u.id, u.username
        HAVING totalStorage > 0
        ORDER BY totalStorage DESC
        LIMIT 10
    `)
};

// Analytics functions
const analytics = {
    // Get comprehensive dashboard stats
    async getDashboardStats() {
        try {
            const userStats = analyticsOperations.getUserStats.get();
            const projectStats = analyticsOperations.getProjectStats.get();
            const processingStats = analyticsOperations.getProcessingStats.get();

            return {
                users: {
                    total: userStats.totalUsers,
                    active7d: userStats.activeUsers7d,
                    active30d: userStats.activeUsers30d,
                    new7d: userStats.newUsers7d,
                    new30d: userStats.newUsers30d
                },
                projects: {
                    total: projectStats.totalProjects,
                    completed: projectStats.completedProjects,
                    processing: projectStats.processingProjects,
                    errors: projectStats.errorProjects,
                    new7d: projectStats.newProjects7d,
                    new30d: projectStats.newProjects30d,
                    avgProgress: Math.round(projectStats.avgProgress || 0),
                    totalStorage: projectStats.totalStorageUsed || 0
                },
                processing: {
                    totalSteps: processingStats.totalProcessingSteps,
                    successful: processingStats.successfulSteps,
                    failed: processingStats.failedSteps,
                    successRate: processingStats.totalProcessingSteps > 0 
                        ? Math.round((processingStats.successfulSteps / processingStats.totalProcessingSteps) * 100)
                        : 0,
                    avgStepsPerDay: Math.round(processingStats.avgStepsPerDay7d || 0)
                }
            };
        } catch (error) {
            throw error;
        }
    },

    // Get popular editing styles
    getPopularStyles() {
        try {
            return analyticsOperations.getPopularStyles.all();
        } catch (error) {
            throw error;
        }
    },

    // Get user activity timeline
    getUserActivityTimeline() {
        try {
            return analyticsOperations.getUserActivityTimeline.all();
        } catch (error) {
            throw error;
        }
    },

    // Get project creation timeline
    getProjectTimeline() {
        try {
            return analyticsOperations.getProjectTimeline.all();
        } catch (error) {
            throw error;
        }
    },

    // Get top users
    getTopUsers() {
        try {
            return analyticsOperations.getTopUsers.all();
        } catch (error) {
            throw error;
        }
    },

    // Get storage usage
    getStorageUsage() {
        try {
            return analyticsOperations.getStorageUsage.all();
        } catch (error) {
            throw error;
        }
    },

    // Get user-specific analytics
    async getUserAnalytics(userId) {
        try {
            const userProjects = db.prepare(`
                SELECT 
                    COUNT(*) as totalProjects,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedProjects,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processingProjects,
                    COUNT(CASE WHEN status = 'error' THEN 1 END) as errorProjects,
                    AVG(progress) as avgProgress,
                    SUM(CASE WHEN fileSize IS NOT NULL THEN fileSize ELSE 0 END) as totalStorage
                FROM projects 
                WHERE userId = ?
            `).get(userId);

            const userActivity = db.prepare(`
                SELECT 
                    DATE(createdAt) as date,
                    COUNT(*) as projectsCreated
                FROM projects 
                WHERE userId = ? AND createdAt > datetime('now', '-30 days')
                GROUP BY DATE(createdAt)
                ORDER BY date DESC
            `).all(userId);

            const favoriteStyles = db.prepare(`
                SELECT 
                    style,
                    COUNT(*) as usageCount
                FROM projects 
                WHERE userId = ? AND style IS NOT NULL
                GROUP BY style 
                ORDER BY usageCount DESC 
                LIMIT 5
            `).all(userId);

            return {
                projects: userProjects,
                activity: userActivity,
                favoriteStyles
            };
        } catch (error) {
            throw error;
        }
    },

    // Get system performance metrics
    async getSystemMetrics() {
        try {
            const dbSize = db.prepare(`
                SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()
            `).get();

            const tableSizes = db.prepare(`
                SELECT 
                    name as tableName,
                    COUNT(*) as rowCount
                FROM sqlite_master 
                WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                GROUP BY name
            `).all();

            return {
                databaseSize: dbSize.size,
                tableStats: tableSizes
            };
        } catch (error) {
            throw error;
        }
    }
};

module.exports = {
    analytics,
    analyticsOperations
};
