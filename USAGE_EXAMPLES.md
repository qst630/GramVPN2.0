# GramVPN2.0 - Usage Examples

This guide shows you how to use the new trial and free subscription features.

## 🎯 Key Features Implemented

### 1. **Free Trial Subscriptions**
- 3-day free trial for new users
- Multi-server access (all available servers)
- One trial per user restriction
- Automatic prevention of duplicate trials

### 2. **100% Promo Code Subscriptions** 
- Free subscriptions using 100% discount promo codes
- Support for different subscription types (trial, 30days, 90days, 365days)
- Promo code validation and usage tracking
- Multi-server configurations

### 3. **Multi-Server Support**
- Automatic client creation on all active servers
- Server connectivity testing before setup
- Fallback handling if some servers fail
- Subscription content generation for V2rayTun

## 🚀 Frontend Usage

### Starting a Free Trial

```typescript
import { subscriptionService } from '../services/subscriptionService';

// Start free trial for user
const result = await subscriptionService.startFreeTrial(telegramId);

if (result.success) {
  console.log('Trial created:', result.message);
  console.log('Servers used:', result.serversUsed);
  console.log('Subscription URLs:', result.subscriptionUrls);
  // Display success to user with subscription links
} else {
  console.error('Trial failed:', result.error);
  // Show error message to user
}
```

### Creating Free Subscription with 100% Promo Code

```typescript
// Validate promo code first
const validation = await subscriptionService.validatePromoCode('PROMO100');

if (validation.valid && validation.promoData.discount_percent === 100) {
  // Create free subscription
  const result = await subscriptionService.createFreeSubscriptionWithPromo(
    telegramId, 
    '30days', // or 'trial', '90days', '365days'
    'PROMO100'
  );
  
  if (result.success) {
    console.log('Free subscription created:', result.message);
    console.log('Servers:', result.serversUsed);
    // Show subscription links to user
  }
}
```

## 🔧 Backend Edge Function Usage

### Using VPN Management Function

#### 1. Start Free Trial
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/vpn-management' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "action": "start_trial",
    "telegram_id": 123456789
  }'
```

Response:
```json
{
  "success": true,
  "user": {...},
  "subscription": {...},
  "servers_count": 3,
  "subscription_links": {
    "direct": "https://vpntest.digital/subscription/123456789?expire=1234567890",
    "v2raytun": "v2raytun://import/...",
    "qr": "https://vpntest.digital/qr/123456789?expire=1234567890"
  },
  "message": "🎉 Free trial activated for 3 days with 3 server locations!"
}
```

#### 2. Create Free Subscription with 100% Promo Code
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/vpn-management' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "action": "create_free_subscription_with_promo",
    "telegram_id": 123456789,
    "subscription_type": "30days",
    "promo_code": "PROMO100"
  }'
```

## 🎯 Testing with Your Telegram Bot

### 1. Test Free Trial
1. Send `/start` to your bot
2. Click "Start Free Trial" button
3. Should receive subscription links for all servers
4. Try again - should get "already used trial" error

### 2. Test 100% Promo Code
1. First, create a 100% promo code in your database:
```sql
INSERT INTO promo_codes (code, discount_percent, is_active, max_usage, valid_for) 
VALUES ('FREE100', 100, true, 100, '30days');
```

2. Send promo code to bot
3. Should receive free subscription with all server locations

## 🔍 Debugging

### Check Logs
- Frontend: Open browser developer tools
- Backend: Check Supabase Edge Function logs
- XUI Panels: Check 3x-ui panel logs for client creation

### Common Issues

1. **"No available servers"**
   - Check server status in database
   - Verify server connectivity
   - Check XUI panel credentials

2. **"Failed to add client"**
   - Verify inbound_id in server configuration
   - Check XUI panel authentication
   - Ensure proper CORS headers

3. **"User already has subscription"**
   - Check existing subscriptions in database
   - Verify trial restrictions are working

## 📊 Database Structure

### Key Tables
- `users`: User information and subscription status
- `subscriptions`: Active subscriptions with type and expiry
- `servers`: VPN server configurations and credentials
- `promo_codes`: Promotional codes with discount percentages
- `payments`: Payment records including free trials/promos

### Server Configuration
Ensure your servers table has all required fields:
```sql
-- Example server record
UPDATE servers SET 
  xui_api_url = 'https://your-server.com:2053',
  xui_username = 'admin',
  xui_password = 'your-password',
  inbound_id = '1',
  vless_public_key = 'your-public-key',
  vless_sid = 'your-sid',
  vless_security = 'reality',
  vless_type = 'tcp',
  vless_fp = 'chrome',
  vless_sni = 'google.com'
WHERE id = 1;
```

## 🎉 Success Indicators

When everything is working correctly:
1. ✅ Users can start free trial (once per user)
2. ✅ 100% promo codes create free subscriptions
3. ✅ Multi-server configurations are generated
4. ✅ V2rayTun import links work
5. ✅ Server subscriber counts are updated
6. ✅ Payment records are created for tracking

Happy testing! 🚀