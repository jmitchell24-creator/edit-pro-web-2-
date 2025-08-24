const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

// Project sharing operations
const sharingOperations = {
    // Create share invitation
    createShare: db.prepare(`
        INSERT INTO project_shares (
            id, projectId, ownerId, sharedWithId, permission, status, createdAt, expiresAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

    // Get project shares for a project
    getProjectShares: db.prepare(`
        SELECT ps.*, u.username as sharedWithUsername, u.email as sharedWithEmail
        FROM project_shares ps
        JOIN users u ON ps.sharedWithId = u.id
        WHERE ps.projectId = ? AND ps.status = 'active'
        ORDER BY ps.createdAt DESC
    `),

    // Get shared projects for a user
    getSharedWithUser: db.prepare(`
        SELECT ps.*, p.name as projectName, p.status as projectStatus, 
               p.thumbnail, p.processedVideo, u.username as ownerUsername
        FROM project_shares ps
        JOIN projects p ON ps.projectId = p.id
        JOIN users u ON ps.ownerId = u.id
        WHERE ps.sharedWithId = ? AND ps.status = 'active'
        ORDER BY ps.createdAt DESC
    `),

    // Update share status
    updateShareStatus: db.prepare(`
        UPDATE project_shares SET status = ? WHERE id = ?
    `),

    // Delete share
    deleteShare: db.prepare(`
        DELETE FROM project_shares WHERE id = ?
    `),

    // Check if user has access to project
    checkProjectAccess: db.prepare(`
        SELECT ps.permission, ps.status
        FROM project_shares ps
        WHERE ps.projectId = ? AND ps.sharedWithId = ? AND ps.status = 'active'
        UNION
        SELECT 'owner' as permission, 'active' as status
        FROM projects
        WHERE id = ? AND userId = ?
    `)
};

// Project sharing functions
const sharing = {
    // Share project with another user
    async shareProject(projectId, ownerId, sharedWithUsername, permission = 'view') {
        try {
            // Get the user to share with
            const { userOperations } = require('./auth');
            const sharedWithUser = userOperations.getUserByUsername.get(sharedWithUsername);
            
            if (!sharedWithUser) {
                throw new Error('User not found');
            }

            if (sharedWithUser.id === ownerId) {
                throw new Error('Cannot share project with yourself');
            }

            // Check if already shared
            const existingShare = db.prepare(`
                SELECT * FROM project_shares 
                WHERE projectId = ? AND sharedWithId = ? AND status = 'active'
            `).get(projectId, sharedWithUser.id);

            if (existingShare) {
                throw new Error('Project already shared with this user');
            }

            // Create share
            const shareId = uuidv4();
            const createdAt = new Date().toISOString();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

            sharingOperations.createShare.run(
                shareId,
                projectId,
                ownerId,
                sharedWithUser.id,
                permission,
                'active',
                createdAt,
                expiresAt
            );

            return {
                id: shareId,
                projectId,
                sharedWith: {
                    id: sharedWithUser.id,
                    username: sharedWithUser.username,
                    email: sharedWithUser.email
                },
                permission,
                status: 'active',
                createdAt,
                expiresAt
            };
        } catch (error) {
            throw error;
        }
    },

    // Get all shares for a project
    getProjectShares(projectId) {
        try {
            return sharingOperations.getProjectShares.all(projectId);
        } catch (error) {
            throw error;
        }
    },

    // Get projects shared with a user
    getSharedWithUser(userId) {
        try {
            return sharingOperations.getSharedWithUser.all(userId);
        } catch (error) {
            throw error;
        }
    },

    // Revoke project share
    async revokeShare(shareId, ownerId) {
        try {
            // Verify ownership
            const share = db.prepare(`
                SELECT * FROM project_shares WHERE id = ?
            `).get(shareId);

            if (!share || share.ownerId !== ownerId) {
                throw new Error('Share not found or access denied');
            }

            sharingOperations.updateShareStatus.run('revoked', shareId);
            return { success: true, message: 'Share revoked successfully' };
        } catch (error) {
            throw error;
        }
    },

    // Check if user has access to project
    checkProjectAccess(projectId, userId) {
        try {
            const access = sharingOperations.checkProjectAccess.get(projectId, userId, projectId, userId);
            return access || null;
        } catch (error) {
            return null;
        }
    },

    // Accept project share
    async acceptShare(shareId, userId) {
        try {
            const share = db.prepare(`
                SELECT * FROM project_shares WHERE id = ? AND sharedWithId = ?
            `).get(shareId, userId);

            if (!share) {
                throw new Error('Share not found');
            }

            if (share.status !== 'pending') {
                throw new Error('Share is not pending');
            }

            sharingOperations.updateShareStatus.run('active', shareId);
            return { success: true, message: 'Share accepted successfully' };
        } catch (error) {
            throw error;
        }
    }
};

module.exports = {
    sharing,
    sharingOperations
};
