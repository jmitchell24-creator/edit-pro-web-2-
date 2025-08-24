const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// User operations
const userOperations = {
    // Create user
    createUser: db.prepare(`
        INSERT INTO users (id, username, email, passwordHash, createdAt)
        VALUES (?, ?, ?, ?, ?)
    `),

    // Get user by username
    getUserByUsername: db.prepare(`
        SELECT * FROM users WHERE username = ?
    `),

    // Get user by email
    getUserByEmail: db.prepare(`
        SELECT * FROM users WHERE email = ?
    `),

    // Get user by ID
    getUserById: db.prepare(`
        SELECT id, username, email, createdAt, lastLogin FROM users WHERE id = ?
    `),

    // Update last login
    updateLastLogin: db.prepare(`
        UPDATE users SET lastLogin = ? WHERE id = ?
    `)
};

// Authentication functions
const auth = {
    // Register new user
    async register(username, email, password) {
        try {
            // Check if username or email already exists
            const existingUser = userOperations.getUserByUsername.get(username);
            if (existingUser) {
                throw new Error('Username already exists');
            }

            const existingEmail = userOperations.getUserByEmail.get(email);
            if (existingEmail) {
                throw new Error('Email already exists');
            }

            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Create user
            const userId = require('uuid').v4();
            const createdAt = new Date().toISOString();

            userOperations.createUser.run(
                userId,
                username,
                email,
                passwordHash,
                createdAt
            );

            // Return user without password
            return {
                id: userId,
                username,
                email,
                createdAt
            };
        } catch (error) {
            throw error;
        }
    },

    // Login user
    async login(username, password) {
        try {
            // Find user by username
            const user = userOperations.getUserByUsername.get(username);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            // Update last login
            userOperations.updateLastLogin.run(
                new Date().toISOString(),
                user.id
            );

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    username: user.username,
                    email: user.email 
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Return user info and token
            return {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt
                },
                token
            };
        } catch (error) {
            throw error;
        }
    },

    // Verify JWT token
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded;
        } catch (error) {
            throw new Error('Invalid token');
        }
    },

    // Get user from token
    async getUserFromToken(token) {
        try {
            const decoded = this.verifyToken(token);
            const user = userOperations.getUserById.get(decoded.userId);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw error;
        }
    }
};

// Middleware to protect routes
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const user = await auth.getUserFromToken(token);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const user = await auth.getUserFromToken(token);
            req.user = user;
        }
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    auth,
    authenticateToken,
    optionalAuth,
    userOperations
};
