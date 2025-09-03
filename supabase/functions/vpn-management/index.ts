import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Generate unique referral code
function generateReferralCode(telegramId: number): string {
  // Generate exactly 5-character code with uppercase letters and numbers only
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  // Generate 5 random characters
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  console.log('🎫 Generated referral code:', code);
  return code;
}

// Generate V2rayTun subscription link with multi-server support
function generateSubscriptionLink(userId: number, serverConfigs: any[]): any {
  const subscriptionContent = serverConfigs.map(config => {
    const vlessConfig = {
      server: config.vless_domain || config.server_ip,
      port: config.vless_port || config.server_port || 443,
      id: `user_${userId}_${Date.now()}_${config.id}`,
      path: config.vless_path || '/ws',
      security: config.vless_security || 'tls',
      sni: config.vless_sni || 'google.com',
      fp: config.vless_fp || 'chrome',
      type: config.vless_type || 'tcp',
      flow: config.vless_flow,
      pbk: config.vless_public_key,
      sid: config.vless_sid,
      spx: config.vless_spx
    };
    
    // Generate VLESS URL
    const params = new URLSearchParams();
    Object.entries(vlessConfig).forEach(([key, value]) => {
      if (value && key !== 'server' && key !== 'port' && key !== 'id') {
        params.set(key, value as string);
      }
    });
    
    return `vless://${vlessConfig.id}@${vlessConfig.server}:${vlessConfig.port}?${params.toString()}#${encodeURIComponent(`${config.country}-${config.server_name}`)}`;
  }).join('\n');
  
  const base64Content = btoa(unescape(encodeURIComponent(subscriptionContent)));
  const baseUrl = 'https://vpntest.digital';
  const expireTimestamp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
  
  const directUrl = `${baseUrl}/subscription/${userId}?expire=${expireTimestamp}`;
  
  return {
    direct: directUrl,
    v2raytun: `v2raytun://import/${encodeURIComponent(directUrl)}`,
    content: base64Content,
    qr: `${baseUrl}/qr/${userId}?expire=${expireTimestamp}`
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  console.log('🚀 VPN Function called:', req.method, req.url)
  console.log('📡 Headers:', Object.fromEntries(req.headers.entries()))

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    let requestBody;
    try {
      requestBody = await req.json()
    } catch (jsonError) {
      console.error('❌ JSON parse error:', jsonError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { action, ...payload } = requestBody
    console.log('🎯 Action:', action, 'Payload:', payload)

    switch (action) {
      case 'get_or_create_user': {
        const { telegram_id, username, full_name, referral_code } = payload
        
        // Try to get existing user
        let { data: user, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('telegram_id', telegram_id)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        // Create user if doesn't exist
        if (!user) {
          const newReferralCode = generateReferralCode(telegram_id)
          
          // Find referrer if referral code provided
          let referrerId = null;
          if (referral_code) {
            const { data: referrer } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('referral_code', referral_code)
              .single()
            
            if (referrer) {
              referrerId = referrer.id;
            }
          }

          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              telegram_id,
              username,
              full_name,
              referral_code: newReferralCode,
              referred_by: referrerId,
              subscription_status: false
            })
            .select()
            .single()

          if (createError) throw createError
          user = newUser

          // Process referral bonus if applicable
          if (referrerId) {
            await supabaseAdmin
              .from('referral_bonuses')
              .insert({
                referrer_id: referrerId,
                referred_id: user.id,
                bonus_days: 7
              })
          }
        }

        return new Response(
          JSON.stringify({ user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'start_trial': {
        const { telegram_id } = payload
        
        // Get user
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, subscription_status')
          .eq('telegram_id', telegram_id)
          .single()

        if (userError || !user) {
          throw new Error('User not found')
        }

        // Check if user already has any subscription (including trial)
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id, subscription_type')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (existingSubscription) {
          throw new Error(`User already has an active ${existingSubscription.subscription_type} subscription`)
        }

        // Check if user has already used trial
        const { data: previousTrial } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('subscription_type', 'trial')
          .single()

        if (previousTrial) {
          throw new Error('User has already used their free trial')
        }

        // Get all active servers
        const { data: servers, error: serversError } = await supabaseAdmin
          .from('servers')
          .select('*')
          .eq('status', true)
          .order('active_subscribers', { ascending: true })

        if (serversError || !servers || servers.length === 0) {
          throw new Error('No active servers available')
        }

        // Create trial subscription
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 3)

        const { data: subscription, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: user.id,
            subscription_type: 'trial',
            end_date: trialEndDate.toISOString(),
            is_active: true
          })
          .select()
          .single()

        if (subError) throw subError

        // Generate subscription link for all servers
        const subscriptionLinks = generateSubscriptionLink(user.id, servers)

        // Update user with subscription link and status
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: true,
            subscription_link: subscriptionLinks.direct
          })
          .eq('id', user.id)
          .select()
          .single()

        if (updateError) throw updateError

        // Update server subscriber counts
        const updatePromises = servers.map(server =>
          supabaseAdmin
            .from('servers')
            .update({
              active_subscribers: server.active_subscribers + 1
            })
            .eq('id', server.id)
        )
        await Promise.allSettled(updatePromises)

        // Create payment record for tracking
        await supabaseAdmin
          .from('payments')
          .insert({
            user_id: user.id,
            amount: 0,
            payment_method: 'free_trial',
            subscription_id: subscription.id
          })

        return new Response(
          JSON.stringify({ 
            success: true,
            user: updatedUser, 
            subscription,
            servers_count: servers.length,
            subscription_links: subscriptionLinks,
            message: `\ud83c\udf89 Free trial activated for 3 days with ${servers.length} server locations!`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_user_status': {
        const { telegram_id } = payload
        
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select(`
            *,
            subscriptions!inner(
              subscription_type,
              start_date,
              end_date,
              is_active
            )
          `)
          .eq('telegram_id', telegram_id)
          .eq('subscriptions.is_active', true)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        // Calculate days remaining
        let daysRemaining = 0;
        let subscriptionType = null;
        
        if (user && user.subscriptions && user.subscriptions.length > 0) {
          const subscription = user.subscriptions[0];
          const endDate = new Date(subscription.end_date);
          const now = new Date();
          daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
          subscriptionType = subscription.subscription_type;
        }

        return new Response(
          JSON.stringify({ 
            user,
            subscription_type: subscriptionType,
            days_remaining: daysRemaining,
            has_active_subscription: daysRemaining > 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_referral_stats': {
        const { telegram_id } = payload
        
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('telegram_id', telegram_id)
          .single()

        if (!user) {
          throw new Error('User not found')
        }

        // Get referral count
        const { count: referralCount } = await supabaseAdmin
          .from('users')
          .select('id', { count: 'exact' })
          .eq('referred_by', user.id)

        // Get bonus days earned
        const { data: bonuses } = await supabaseAdmin
          .from('referral_bonuses')
          .select('bonus_days')
          .eq('referrer_id', user.id)

        const totalBonusDays = bonuses?.reduce((sum, bonus) => sum + bonus.bonus_days, 0) || 0

        return new Response(
          JSON.stringify({ 
            referrals_count: referralCount || 0,
            bonus_days_earned: totalBonusDays
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'validate_promo_code': {
        const { code } = payload
        
        const { data: promoCode, error } = await supabaseAdmin
          .from('promo_codes')
          .select('*')
          .eq('code', code.toUpperCase())
          .eq('is_active', true)
          .single()

        if (error || !promoCode) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Промокод не найден или неактивен' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check expiration
        if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Промокод истек' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check usage limit
        if (promoCode.max_usage && promoCode.usage_count >= promoCode.max_usage) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Промокод исчерпан' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            valid: true, 
            promo_code: promoCode 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_free_subscription_with_promo': {
        const { telegram_id, subscription_type, promo_code } = payload
        
        // Validate required parameters
        if (!telegram_id || !subscription_type || !promo_code) {
          throw new Error('Missing required parameters: telegram_id, subscription_type, promo_code')
        }

        // Get user
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('telegram_id', telegram_id)
          .single()

        if (userError || !user) {
          throw new Error('User not found')
        }

        // Validate promo code
        const { data: promoCode, error: promoError } = await supabaseAdmin
          .from('promo_codes')
          .select('*')
          .eq('code', promo_code.toUpperCase())
          .eq('is_active', true)
          .single()

        if (promoError || !promoCode) {
          throw new Error('Invalid or inactive promo code')
        }

        // Check if promo code is 100% discount
        if (promoCode.discount_percent < 100) {
          throw new Error('This endpoint is only for 100% discount promo codes')
        }

        // Check expiration
        if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
          throw new Error('Promo code has expired')
        }

        // Check usage limit
        if (promoCode.max_usage && promoCode.usage_count >= promoCode.max_usage) {
          throw new Error('Promo code has reached its usage limit')
        }

        // Calculate subscription duration
        const daysMap = {
          'trial': 3,
          '30days': 30,
          '90days': 90,
          '365days': 365
        }

        const days = daysMap[subscription_type as keyof typeof daysMap]
        if (!days) {
          throw new Error('Invalid subscription type')
        }

        // Check for existing active subscription
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id, subscription_type')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (existingSubscription) {
          throw new Error(`User already has an active ${existingSubscription.subscription_type} subscription`)
        }

        // Get all active servers
        const { data: servers, error: serversError } = await supabaseAdmin
          .from('servers')
          .select('*')
          .eq('status', true)
          .order('active_subscribers', { ascending: true })

        if (serversError || !servers || servers.length === 0) {
          throw new Error('No active servers available')
        }

        // Create subscription
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + days)

        const { data: subscription, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: user.id,
            subscription_type,
            end_date: endDate.toISOString(),
            is_active: true
          })
          .select()
          .single()

        if (subError) throw subError

        // Create payment record with 100% discount
        await supabaseAdmin
          .from('payments')
          .insert({
            user_id: user.id,
            amount: 0,
            payment_method: 'promo_code_100',
            subscription_id: subscription.id,
            promo_code_used: promo_code.toUpperCase(),
            discount_applied: 100
          })

        // Update promo code usage
        await supabaseAdmin
          .from('promo_codes')
          .update({
            usage_count: promoCode.usage_count + 1
          })
          .eq('id', promoCode.id)

        // Generate subscription links for all servers
        const subscriptionLinks = generateSubscriptionLink(user.id, servers)

        // Update user with subscription link and status
        await supabaseAdmin
          .from('users')
          .update({
            subscription_status: true,
            subscription_link: subscriptionLinks.direct
          })
          .eq('id', user.id)

        // Update server subscriber counts
        const updatePromises = servers.map(server =>
          supabaseAdmin
            .from('servers')
            .update({
              active_subscribers: server.active_subscribers + 1
            })
            .eq('id', server.id)
        )
        await Promise.allSettled(updatePromises)

        return new Response(
          JSON.stringify({ 
            success: true,
            subscription,
            servers_count: servers.length,
            subscription_links: subscriptionLinks,
            promo_code: promoCode.code,
            message: `\ud83c\udf89 100% promo code applied! Free ${subscription_type} subscription for ${days} days with ${servers.length} servers.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_subscription': {
        const { telegram_id, subscription_type, payment_amount, promo_code } = payload
        
        // Get user
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('telegram_id', telegram_id)
          .single()

        if (userError || !user) {
          throw new Error('User not found')
        }

        // Calculate subscription duration
        const daysMap = {
          '30days': 30,
          '90days': 90,
          '365days': 365
        };

        const days = daysMap[subscription_type as keyof typeof daysMap];
        if (!days) {
          throw new Error('Invalid subscription type')
        }

        // Create subscription
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        const { data: subscription, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: user.id,
            subscription_type,
            end_date: endDate.toISOString(),
            is_active: true
          })
          .select()
          .single()

        if (subError) throw subError

        // Create payment record
        await supabaseAdmin
          .from('payments')
          .insert({
            user_id: user.id,
            amount: payment_amount,
            payment_method: 'yoomoney',
            subscription_id: subscription.id,
            promo_code_used: promo_code
          })

        // Update promo code usage if used
        if (promo_code) {
          await supabaseAdmin
            .from('promo_codes')
            .update({
              usage_count: supabaseAdmin.sql`usage_count + 1`
            })
            .eq('code', promo_code.toUpperCase())
        }

        // Get server and generate new subscription link
        const { data: server } = await supabaseAdmin
          .from('servers')
          .select('*')
          .eq('status', true)
          .order('active_subscribers', { ascending: true })
          .limit(1)
          .single()

        if (server) {
          const subscriptionLink = generateSubscriptionLink(user.id, server)
          
          await supabaseAdmin
            .from('users')
            .update({
              subscription_status: true,
              subscription_link: subscriptionLink
            })
            .eq('id', user.id)
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            subscription,
            message: 'Подписка успешно создана'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('VPN management error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})