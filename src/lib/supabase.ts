import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Comprehensive debug logging
console.log('🔧 SUPABASE CONFIGURATION DEBUG:');
console.log('📍 URL Status:', supabaseUrl ? '✅ Present' : '❌ MISSING');
console.log('🔑 Key Status:', supabaseAnonKey ? '✅ Present' : '❌ MISSING');

if (supabaseUrl) {
  console.log('📍 URL Preview:', supabaseUrl.substring(0, 50) + '...');
  console.log('📍 URL Format Check:', supabaseUrl.includes('supabase.co') ? '✅ Valid' : '❌ Invalid format');
  console.log('📍 URL Protocol:', supabaseUrl.startsWith('https://') ? '✅ HTTPS' : '❌ Not HTTPS');
}

if (supabaseAnonKey) {
  console.log('🔑 Key Length:', supabaseAnonKey.length, 'characters');
  console.log('🔑 Key Format:', supabaseAnonKey.startsWith('eyJ') ? '✅ Valid JWT' : '❌ Invalid format');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 CRITICAL ERROR: Supabase environment variables missing!');
  console.log('📋 REQUIRED VARIABLES:');
  console.log('   VITE_SUPABASE_URL=https://yourproject.supabase.co');
  console.log('   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.log('💡 SOLUTION: Click "Connect to Supabase" button in top right corner');
}

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Test connection function
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string; details?: any }> => {
  console.log('🧪 TESTING SUPABASE CONNECTION...');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    const error = 'Environment variables missing. Click "Connect to Supabase" button.';
    console.error('❌ TEST FAILED:', error);
    return { success: false, error };
  }

  console.log('🔗 Attempting connection to:', supabaseUrl);
  
  try {
    // Test 1: Basic fetch to Supabase REST API
    console.log('📡 Test 1: Basic API connectivity...');
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    console.log('📡 Health check response:', {
      status: healthResponse.status,
      ok: healthResponse.ok,
      headers: Object.fromEntries(healthResponse.headers.entries())
    });

    if (!healthResponse.ok) {
      throw new Error(`API not accessible: ${healthResponse.status} ${healthResponse.statusText}`);
    }

    // Test 2: Database query
    console.log('📊 Test 2: Database query...');
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    console.log('📊 Database query result:', { 
      hasData: data !== null, 
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details 
    });

    if (error) {
      // Check if it's a table doesn't exist error
      if (error.code === '42P01') {
        const tableError = 'Database tables not created. Run migrations first.';
        console.error('❌ TABLE ERROR:', tableError);
        return { success: false, error: tableError, details: error };
      }
      
      console.error('❌ DATABASE ERROR:', error);
      return { success: false, error: `Database error: ${error.message}`, details: error };
    }

    console.log('✅ SUPABASE CONNECTION SUCCESSFUL!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ CONNECTION TEST FAILED:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const fetchError = 'Network error: Cannot reach Supabase. Check URL and internet connection.';
      console.error('🌐 NETWORK ERROR:', fetchError);
      return { success: false, error: fetchError, details: error };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error',
      details: error 
    };
  }
};

// Enhanced connection test with retry
export const testConnectionWithRetry = async (retries = 3): Promise<{ success: boolean; error?: string }> => {
  for (let i = 0; i < retries; i++) {
    console.log(`🔄 Connection attempt ${i + 1}/${retries}`);
    const result = await testSupabaseConnection();
    
    if (result.success) {
      return result;
    }
    
    if (i < retries - 1) {
      console.log(`⏳ Retrying in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return { success: false, error: 'Connection failed after multiple attempts' };
};

// Auto-test connection on load
if (supabaseUrl && supabaseAnonKey) {
  console.log('🚀 Auto-testing Supabase connection...');
  testSupabaseConnection().then(result => {
    if (result.success) {
      console.log('🎉 Auto-connection test: SUCCESS');
    } else {
      console.error('🚨 Auto-connection test: FAILED -', result.error);
    }
  });
}