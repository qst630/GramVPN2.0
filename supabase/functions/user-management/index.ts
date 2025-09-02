import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key (server-side)
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

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'get_user': {
        const { telegram_id } = payload
        
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('telegram_id', telegram_id)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        return new Response(
          JSON.stringify({ user: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_user': {
        const { telegram_id, first_name, last_name, username, referral_code } = payload
        
        // Validate required fields
        if (!telegram_id || !first_name) {
          throw new Error('Missing required fields: telegram_id and first_name')
        }

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('telegram_id', telegram_id)
          .single()

        if (existingUser) {
          throw new Error('User already exists')
        }

        const newReferralCode = generateReferralCode(telegram_id)
        
        const userData = {
          telegram_id,
          first_name,
          last_name,
          username,
          referral_code: newReferralCode,
          referred_by: referral_code || null,
          free_trial_used: false,
          subscription_active: false,
          total_referrals: 0,
          bonus_days_earned: 0,
        }

        const { data, error } = await supabaseAdmin
          .from('users')
          .insert(userData)
          .select()
          .single()

        if (error) throw error

        // Process referral if provided
        if (referral_code) {
          await processReferral(supabaseAdmin, referral_code, data.id)
        }

        return new Response(
          JSON.stringify({ user: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'start_trial': {
        const { telegram_id } = payload
        
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days

        const { data, error } = await supabaseAdmin
          .from('users')
          .update({
            free_trial_used: true,
            free_trial_started_at: now.toISOString(),
            free_trial_expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('telegram_id', telegram_id)
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ user: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_trial_status': {
        const { telegram_id } = payload
        
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('free_trial_used, free_trial_expires_at')
          .eq('telegram_id', telegram_id)
          .single()

        if (!user) {
          return new Response(
            JSON.stringify({
              status: { available: true, used: false, active: false }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!user.free_trial_used) {
          return new Response(
            JSON.stringify({
              status: { available: true, used: false, active: false }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (user.free_trial_expires_at) {
          const now = new Date()
          const expiresAt = new Date(user.free_trial_expires_at)
          const isActive = now < expiresAt
          const daysRemaining = isActive 
            ? Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : 0

          return new Response(
            JSON.stringify({
              status: {
                available: false,
                used: true,
                active: isActive,
                expires_at: user.free_trial_expires_at,
                days_remaining: daysRemaining,
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            status: { available: false, used: true, active: false }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_referral_stats': {
        const { telegram_id } = payload
        
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('total_referrals, bonus_days_earned')
          .eq('telegram_id', telegram_id)
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({
            stats: {
              invited: data.total_referrals || 0,
              daysEarned: data.bonus_days_earned || 0,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Edge function error:', error)
    
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

async function processReferral(supabaseAdmin: any, referralCode: string, newUserId: number) {
  try {
    // Find referrer
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from('users')
      .select('id, total_referrals')
      .eq('referral_code', referralCode)
      .single()

    if (referrerError || !referrer) return

    // Update referrer stats
    await supabaseAdmin
      .from('users')
      .update({
        total_referrals: referrer.total_referrals + 1,
        bonus_days_earned: supabaseAdmin.sql`bonus_days_earned + 7`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referrer.id)

  } catch (error) {
    console.error('Error processing referral:', error)
  }
}