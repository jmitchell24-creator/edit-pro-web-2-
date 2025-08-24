# Edit Quick - Guest Usage & Subscription System

## Overview

This system implements a freemium model where users can:
1. **Use the service once for free** as a guest (one-time trial)
2. **Create an account** to access subscription plans
3. **Choose from different subscription tiers** with varying video limits

## How It Works

### Guest Users (Free Trial)
- **First-time visitors** can upload and process **1 video for free**
- Usage is tracked by **IP address** to prevent abuse
- After using the free trial, guests must create an account and subscribe
- Guest projects are stored with a unique guest identifier

### Authenticated Users
- Must have an **active subscription** to continue using the service
- Subscription plans determine **monthly video limits**
- Users can view their current usage and plan details
- Subscription status is displayed in the user dropdown

## Subscription Plans

### Basic Plan - $9.99/month
- **10 videos per month**
- HD Quality
- Basic Effects
- Email Support

### Pro Plan - $24.99/month
- **50 videos per month**
- 4K Quality
- Advanced Effects
- Priority Support
- Custom Effects

### Enterprise Plan - $99.99/month
- **500 videos per month**
- 8K Quality
- All Effects
- 24/7 Support
- Team Management
- API Access

## Technical Implementation

### Database Tables
- `guest_usage` - Tracks guest usage by IP address
- `subscription_plans` - Stores available subscription tiers
- `user_subscriptions` - Links users to their active plans

### API Endpoints
- `GET /api/guest/usage` - Get current guest usage status
- `GET /api/subscriptions/plans` - List available subscription plans
- `GET /api/subscriptions/current` - Get user's current subscription
- `POST /api/subscriptions/create` - Create new subscription

### Middleware
- `checkGuestUsage` - Enforces guest usage limits
- `checkSubscriptionLimits` - Enforces subscription video limits
- `optionalAuth` - Allows both guest and authenticated access

### Frontend Features
- **Guest Banner** - Shows remaining free edits
- **Subscription Info** - Displays current plan and usage
- **Plans Page** - Beautiful subscription selection interface
- **Usage Tracking** - Real-time usage monitoring

## Usage Flow

1. **Guest visits** → Can upload 1 video for free
2. **Free trial used** → System blocks further uploads
3. **User registers** → Creates account
4. **User subscribes** → Chooses plan and continues
5. **Monthly limits** → Enforced based on subscription tier

## Security Features

- **IP-based tracking** prevents simple workarounds
- **Rate limiting** on authentication endpoints
- **JWT tokens** for authenticated users
- **Database constraints** ensure data integrity

## Getting Started

1. **Start the server**: `node backend/server.js`
2. **Visit the dashboard**: `http://localhost:8080`
3. **Try as guest**: Upload one video for free
4. **Create account**: Register for continued access
5. **Choose plan**: Select subscription tier

## Customization

### Adding New Plans
Edit the `insertDefaultPlans()` function in `backend/database.js`:

```javascript
{
    id: 'custom',
    name: 'Custom Plan',
    description: 'Your custom description',
    price: 49.99,
    videoLimit: 100,
    features: JSON.stringify(['Feature 1', 'Feature 2'])
}
```

### Modifying Guest Limits
Change the guest usage limit in `backend/usage-limits.js`:

```javascript
// Change from 1 to desired limit
if (guestUsage.usageCount >= 1) {
    // ... limit enforcement
}
```

### Styling Changes
Modify CSS in the respective HTML files:
- `subscription-plans.html` - Plans page styling
- `dashboard.html` - Dashboard subscription elements
- `register.html` - Registration form styling

## Monitoring & Analytics

The system tracks:
- Guest usage patterns
- Subscription conversions
- Video processing metrics
- User engagement data

## Future Enhancements

- **Payment integration** (Stripe, PayPal)
- **Trial extensions** for special promotions
- **Referral system** with free credits
- **Team management** for enterprise users
- **Usage analytics** dashboard
- **Automated billing** and renewals

## Support

For technical issues or questions about the subscription system, check the main project documentation or create an issue in the repository.
