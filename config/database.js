const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

class Database {
    constructor() {
        this.isConnected = false;
        this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/edit-quick-ai';
    }

    async connect() {
        try {
            console.log('🔌 Connecting to MongoDB...');
            
            // Connection options
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferMaxEntries: 0,
                maxPoolSize: 10
            };

            // Connect to MongoDB
            await mongoose.connect(this.connectionString, options);
            
            this.isConnected = true;
            console.log('✅ MongoDB connected successfully!');
            console.log(`📊 Database: ${mongoose.connection.name}`);
            console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('🔄 MongoDB reconnected');
                this.isConnected = true;
            });

            // Graceful shutdown
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });

        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            console.log('💡 Make sure MongoDB is running or check your connection string');
            console.log('🔧 You can install MongoDB locally or use MongoDB Atlas (cloud)');
            
            // Fallback to in-memory storage
            console.log('📝 Falling back to in-memory storage for now...');
            this.isConnected = false;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            try {
                await mongoose.connection.close();
                console.log('🔌 MongoDB connection closed');
                this.isConnected = false;
            } catch (error) {
                console.error('❌ Error closing MongoDB connection:', error);
            }
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            database: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port
        };
    }

    // Health check for database
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected', message: 'Database not connected' };
            }
            
            // Simple ping to check if database is responsive
            await mongoose.connection.db.admin().ping();
            return { status: 'healthy', message: 'Database responding normally' };
        } catch (error) {
            return { status: 'unhealthy', message: error.message };
        }
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;
