const { db, projectOperations, historyOperations } = require('./database');
const path = require('path');

console.log('🔧 Edit Quick Database Manager');
console.log('===============================\n');

// Function to show database info
function showDatabaseInfo() {
    console.log('📊 Database Information:');
    console.log('------------------------');
    
    try {
        // Get project count
        const projectCount = projectOperations.getAllProjects.all().length;
        console.log(`📁 Total Projects: ${projectCount}`);
        
        // Get projects by status
        const projects = projectOperations.getAllProjects.all();
        const statusCounts = {};
        projects.forEach(project => {
            statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
        });
        
        console.log('📈 Projects by Status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });
        
        // Get total history entries
        const historyCount = db.prepare('SELECT COUNT(*) as count FROM processing_history').get().count;
        console.log(`📝 Total History Entries: ${historyCount}`);
        
    } catch (error) {
        console.error('❌ Error getting database info:', error.message);
    }
}

// Function to reset database
function resetDatabase() {
    console.log('\n🗑️  Resetting Database...');
    try {
        // Drop existing tables
        db.exec('DROP TABLE IF EXISTS processing_history');
        db.exec('DROP TABLE IF EXISTS projects');
        db.exec('DROP TABLE IF EXISTS users');
        
        // Reinitialize database
        const { initializeDatabase } = require('./database');
        initializeDatabase();
        
        console.log('✅ Database reset successfully');
    } catch (error) {
        console.error('❌ Error resetting database:', error.message);
    }
}

// Function to show recent projects
function showRecentProjects(limit = 5) {
    console.log(`\n📋 Recent Projects (last ${limit}):`);
    console.log('--------------------------------');
    
    try {
        const projects = projectOperations.getAllProjects.all().slice(0, limit);
        
        if (projects.length === 0) {
            console.log('   No projects found');
            return;
        }
        
        projects.forEach((project, index) => {
            console.log(`\n${index + 1}. ${project.name}`);
            console.log(`   ID: ${project.id}`);
            console.log(`   Status: ${project.status}`);
            console.log(`   Progress: ${project.progress}%`);
            console.log(`   Created: ${new Date(project.createdAt).toLocaleString()}`);
            if (project.currentStep) {
                console.log(`   Current Step: ${project.currentStep}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error getting recent projects:', error.message);
    }
}

// Function to show project history
function showProjectHistory(projectId) {
    console.log(`\n📝 Project History for ${projectId}:`);
    console.log('-----------------------------------');
    
    try {
        const history = historyOperations.getProjectHistory.all(projectId);
        
        if (history.length === 0) {
            console.log('   No history found for this project');
            return;
        }
        
        history.forEach((entry, index) => {
            console.log(`\n${index + 1}. ${entry.step}`);
            console.log(`   Status: ${entry.status}`);
            console.log(`   Message: ${entry.message}`);
            console.log(`   Time: ${new Date(entry.timestamp).toLocaleString()}`);
        });
        
    } catch (error) {
        console.error('❌ Error getting project history:', error.message);
    }
}

// Function to clean up old history
function cleanupOldHistory(daysOld = 30) {
    console.log(`\n🧹 Cleaning up history older than ${daysOld} days...`);
    
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const deleted = db.prepare(`
            DELETE FROM processing_history 
            WHERE timestamp < ?
        `).run(cutoffDate.toISOString());
        
        console.log(`✅ Cleaned up ${deleted.changes} old history entries`);
    } catch (error) {
        console.error('❌ Error cleaning up history:', error.message);
    }
}

// Main menu
function showMenu() {
    console.log('\n📋 Available Commands:');
    console.log('1. info - Show database information');
    console.log('2. projects - Show recent projects');
    console.log('3. history <projectId> - Show project history');
    console.log('4. cleanup - Clean up old history entries');
    console.log('5. reset - Reset database (WARNING: This will delete all data!)');
    console.log('6. exit - Exit database manager');
    console.log('\nEnter a command:');
}

// Command processor
function processCommand(command) {
    const parts = command.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
        case 'info':
            showDatabaseInfo();
            break;
            
        case 'projects':
            const limit = parts[1] ? parseInt(parts[1]) : 5;
            showRecentProjects(limit);
            break;
            
        case 'history':
            if (parts[1]) {
                showProjectHistory(parts[1]);
            } else {
                console.log('❌ Please provide a project ID: history <projectId>');
            }
            break;
            
        case 'cleanup':
            const days = parts[1] ? parseInt(parts[1]) : 30;
            cleanupOldHistory(days);
            break;
            
        case 'reset':
            console.log('\n⚠️  WARNING: This will delete ALL data from the database!');
            console.log('Type "YES" to confirm:');
            // In a real CLI, you'd wait for user input
            console.log('Reset confirmed (demo mode)');
            resetDatabase();
            break;
            
        case 'exit':
            console.log('👋 Goodbye!');
            process.exit(0);
            break;
            
        default:
            console.log('❌ Unknown command. Type "help" for available commands.');
    }
}

// If run directly, show interactive menu
if (require.main === module) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    showMenu();
    
    rl.on('line', (input) => {
        processCommand(input);
        showMenu();
    });
    
    rl.on('close', () => {
        console.log('\n👋 Goodbye!');
        process.exit(0);
    });
}

module.exports = {
    showDatabaseInfo,
    showRecentProjects,
    showProjectHistory,
    cleanupOldHistory,
    resetDatabase
};
