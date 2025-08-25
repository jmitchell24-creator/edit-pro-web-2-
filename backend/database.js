const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'data');
fs.ensureDirSync(dbDir);

// Initialize database
const db = new Database(path.join(dbDir, 'editquick.db'));

// Create tables if they don't exist
function initializeDatabase() {
    // Projects table
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            style TEXT DEFAULT 'cinematic',
            intensity TEXT DEFAULT 'medium',
            quality TEXT DEFAULT 'high',
            customEffects TEXT DEFAULT '[]',
            platformOptimize TEXT DEFAULT 'auto',
            aiIntelligence TEXT DEFAULT 'smart',
            createdAt TEXT NOT NULL,
            fileSize INTEGER,
            progress INTEGER DEFAULT 0,
            currentStep TEXT DEFAULT '',
            thumbnail TEXT,
            processedVideo TEXT,
            originalVideo TEXT,
            userId TEXT DEFAULT 'default'
        )
    `);

    // Users table (for authentication)
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            lastLogin TEXT
        )
    `);

    // Guest usage tracking table
    db.exec(`
        CREATE TABLE IF NOT EXISTS guest_usage (
            id TEXT PRIMARY KEY,
            ipAddress TEXT NOT NULL,
            userAgent TEXT,
            usageCount INTEGER DEFAULT 0,
            firstUsed TEXT NOT NULL,
            lastUsed TEXT NOT NULL,
            blocked BOOLEAN DEFAULT FALSE,
            blockedReason TEXT
        )
    `);

    // Subscription plans table
    db.exec(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            currency TEXT DEFAULT 'USD',
            videoLimit INTEGER NOT NULL,
            features TEXT DEFAULT '[]',
            isActive BOOLEAN DEFAULT TRUE,
            createdAt TEXT NOT NULL
        )
    `);

    // User subscriptions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            planId TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            startDate TEXT NOT NULL,
            endDate TEXT,
            videoCount INTEGER DEFAULT 0,
            maxVideos INTEGER NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users (id),
            FOREIGN KEY (planId) REFERENCES subscription_plans (id)
        )
    `);

    // Processing history table
    db.exec(`
        CREATE TABLE IF NOT EXISTS processing_history (
            id TEXT PRIMARY KEY,
            projectId TEXT NOT NULL,
            step TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (projectId) REFERENCES projects (id)
        )
    `);

    // Project sharing table
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_shares (
            id TEXT PRIMARY KEY,
            projectId TEXT NOT NULL,
            ownerId TEXT NOT NULL,
            sharedWithId TEXT NOT NULL,
            permission TEXT DEFAULT 'view',
            status TEXT DEFAULT 'pending',
            createdAt TEXT NOT NULL,
            expiresAt TEXT,
            FOREIGN KEY (projectId) REFERENCES projects (id),
            FOREIGN KEY (ownerId) REFERENCES users (id),
            FOREIGN KEY (sharedWithId) REFERENCES users (id)
        )
    `);

    console.log('Database initialized successfully');
    
    // Insert default subscription plans if they don't exist
    insertDefaultPlans();
}

// Insert default subscription plans
function insertDefaultPlans() {
    try {
        // Check if plans already exist
        const existingPlans = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get();
        
        if (existingPlans.count === 0) {
            const defaultPlans = [
                {
                    id: 'basic',
                    name: 'Basic Plan',
                    description: 'Perfect for casual users',
                    price: 9.99,
                    videoLimit: 10,
                    features: JSON.stringify(['HD Quality', 'Basic Effects', 'Email Support'])
                },
                {
                    id: 'pro',
                    name: 'Pro Plan',
                    description: 'For content creators and professionals',
                    price: 24.99,
                    videoLimit: 50,
                    features: JSON.stringify(['4K Quality', 'Advanced Effects', 'Priority Support', 'Custom Effects'])
                },
                {
                    id: 'enterprise',
                    name: 'Enterprise Plan',
                    description: 'For businesses and teams',
                    price: 99.99,
                    videoLimit: 500,
                    features: JSON.stringify(['8K Quality', 'All Effects', '24/7 Support', 'Team Management', 'API Access'])
                }
            ];

            const insertPlan = db.prepare(`
                INSERT INTO subscription_plans (id, name, description, price, videoLimit, features, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            defaultPlans.forEach(plan => {
                insertPlan.run(
                    plan.id,
                    plan.name,
                    plan.description,
                    plan.price,
                    plan.videoLimit,
                    plan.features,
                    new Date().toISOString()
                );
            });

            console.log('Default subscription plans created');
        }
    } catch (error) {
        console.error('Error creating default plans:', error);
    }
}

// Project operations - will be initialized after tables are created
let projectOperations = {};
let historyOperations = {};
let guestUsageOperations = {};
let subscriptionOperations = {};

// Initialize prepared statements after tables are created
function initializePreparedStatements() {
    projectOperations = {
        // Create a new project
        createProject: db.prepare(`
            INSERT INTO projects (
                id, name, status, style, intensity, quality, customEffects, 
                platformOptimize, aiIntelligence, createdAt, fileSize, 
                originalVideo, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),

        // Get all projects
        getAllProjects: db.prepare(`
            SELECT * FROM projects ORDER BY createdAt DESC
        `),

        // Get all projects by user
        getAllProjectsByUser: db.prepare(`
            SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC
        `),

        // Get project by ID
        getProjectById: db.prepare(`
            SELECT * FROM projects WHERE id = ?
        `),

        // Update project status
        updateProjectStatus: db.prepare(`
            UPDATE projects SET status = ?, progress = ?, currentStep = ? WHERE id = ?
        `),

        // Update project details
        updateProject: db.prepare(`
            UPDATE projects SET 
                name = ?, style = ?, intensity = ?, quality = ?, 
                customEffects = ?, platformOptimize = ?, aiIntelligence = ?,
                thumbnail = ?, processedVideo = ?
            WHERE id = ?
        `),

        // Delete project
        deleteProject: db.prepare(`
            DELETE FROM projects WHERE id = ?
        `)
    };

    historyOperations = {
        // Add processing step
        addStep: db.prepare(`
            INSERT INTO processing_history (id, projectId, step, status, message, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        `)
    };

    // Guest usage operations
    guestUsageOperations = {
        // Get guest usage by IP
        getGuestUsageByIP: db.prepare(`
            SELECT * FROM guest_usage WHERE ipAddress = ?
        `),

        // Create new guest usage record
        createGuestUsage: db.prepare(`
            INSERT INTO guest_usage (id, ipAddress, userAgent, usageCount, firstUsed, lastUsed)
            VALUES (?, ?, ?, ?, ?, ?)
        `),

        // Update guest usage count
        updateGuestUsage: db.prepare(`
            UPDATE guest_usage SET usageCount = ?, lastUsed = ? WHERE ipAddress = ?
        `),

        // Block guest usage
        blockGuestUsage: db.prepare(`
            UPDATE guest_usage SET blocked = ?, blockedReason = ? WHERE ipAddress = ?
        `)
    };

    // Subscription operations
    subscriptionOperations = {
        // Get all subscription plans
        getAllPlans: db.prepare(`
            SELECT * FROM subscription_plans WHERE isActive = TRUE ORDER BY price ASC
        `),

        // Get plan by ID
        getPlanById: db.prepare(`
            SELECT * FROM subscription_plans WHERE id = ? AND isActive = TRUE
        `),

        // Get user's active subscription
        getUserSubscription: db.prepare(`
            SELECT us.*, sp.name as planName, sp.price, sp.videoLimit as maxVideos, sp.features
            FROM user_subscriptions us
            JOIN subscription_plans sp ON us.planId = sp.id
            WHERE us.userId = ? AND us.status = 'active'
            ORDER BY us.createdAt DESC
            LIMIT 1
        `),

        // Create user subscription
        createUserSubscription: db.prepare(`
            INSERT INTO user_subscriptions (id, userId, planId, startDate, maxVideos, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `),

        // Update subscription video count
        updateSubscriptionVideoCount: db.prepare(`
            UPDATE user_subscriptions SET videoCount = ? WHERE id = ?
        `),

        // Get user's video count
        getUserVideoCount: db.prepare(`
            SELECT COUNT(*) as count FROM projects WHERE userId = ?
        `)
    };

    console.log('Prepared statements initialized');
}

// Initialize database when module is loaded
initializeDatabase();
initializePreparedStatements();

module.exports = {
    db,
    projectOperations,
    historyOperations,
    guestUsageOperations,
    subscriptionOperations,
    initializeDatabase
};
