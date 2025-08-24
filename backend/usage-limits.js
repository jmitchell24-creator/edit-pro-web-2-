const { v4: uuidv4 } = require('uuid');
const { guestUsageOperations, subscriptionOperations } = require('./database');

// Guest usage limit middleware
const checkGuestUsage = async (req, res, next) => {
    try {
        // Get client IP address
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Check if user is authenticated
        if (req.user) {
            // Authenticated user - check subscription limits
            return checkSubscriptionLimits(req, res, next);
        }

        // Guest user - check usage limits
        const guestUsage = guestUsageOperations.getGuestUsageByIP.get(clientIP);
        
        if (!guestUsage) {
            // First time guest - create usage record
            const usageId = uuidv4();
            const now = new Date().toISOString();
            
            guestUsageOperations.createGuestUsage.run(
                usageId,
                clientIP,
                userAgent,
                1,
                now,
                now
            );
            
            // Allow first usage
            req.guestUsage = { usageCount: 1, isFirstTime: true };
            return next();
        }

        // Check if guest is blocked
        if (guestUsage.blocked) {
            return res.status(403).json({
                error: 'Guest usage blocked',
                reason: guestUsage.blockedReason || 'Exceeded free trial limit',
                requiresAccount: true
            });
        }

        // Check usage count (allow 1 free usage)
        if (guestUsage.usageCount >= 1) {
            // Block guest and require account creation
            guestUsageOperations.blockGuestUsage.run(
                true,
                'Exceeded free trial limit',
                clientIP
            );
            
            return res.status(403).json({
                error: 'Free trial limit reached',
                message: 'You have used your one free video edit. Please create an account and choose a subscription plan to continue.',
                requiresAccount: true,
                usageCount: guestUsage.usageCount
            });
        }

        // Increment usage count
        const newCount = guestUsage.usageCount + 1;
        const now = new Date().toISOString();
        
        guestUsageOperations.updateGuestUsage.run(
            newCount,
            now,
            clientIP
        );

        req.guestUsage = { usageCount: newCount, isFirstTime: false };
        next();

    } catch (error) {
        console.error('Guest usage check error:', error);
        // Allow request to proceed if there's an error
        next();
    }
};

// Subscription limits middleware for authenticated users
const checkSubscriptionLimits = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Get user's subscription
        const subscription = subscriptionOperations.getUserSubscription.get(userId);
        
        if (!subscription) {
            return res.status(403).json({
                error: 'No active subscription',
                message: 'Please choose a subscription plan to continue using the service.',
                requiresSubscription: true
            });
        }

        // Check video count limit
        const videoCount = subscriptionOperations.getUserVideoCount.get(userId);
        const currentCount = videoCount ? videoCount.count : 0;
        
        if (currentCount >= subscription.maxVideos) {
            return res.status(403).json({
                error: 'Video limit reached',
                message: `You have reached your limit of ${subscription.maxVideos} videos for the ${subscription.planName} plan.`,
                currentCount: currentCount,
                maxVideos: subscription.maxVideos,
                planName: subscription.planName,
                requiresUpgrade: true
            });
        }

        // Add subscription info to request
        req.userSubscription = subscription;
        req.userVideoCount = currentCount;
        next();

    } catch (error) {
        console.error('Subscription check error:', error);
        // Allow request to proceed if there's an error
        next();
    }
};

// Optional subscription check (for endpoints that can work with or without subscription)
const optionalSubscriptionCheck = async (req, res, next) => {
    try {
        if (req.user) {
            const userId = req.user.id;
            const subscription = subscriptionOperations.getUserSubscription.get(userId);
            const videoCount = subscriptionOperations.getUserVideoCount.get(userId);
            
            if (subscription) {
                req.userSubscription = subscription;
                req.userVideoCount = videoCount ? videoCount.count : 0;
            }
        }
        next();
    } catch (error) {
        console.error('Optional subscription check error:', error);
        next();
    }
};

module.exports = {
    checkGuestUsage,
    checkSubscriptionLimits,
    optionalSubscriptionCheck
};
