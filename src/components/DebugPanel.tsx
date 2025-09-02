import React, { useState } from 'react';
import { Bug, Database, User, Trash2, Wifi, Settings } from 'lucide-react';
import { userService } from '../services/supabaseUserService';
import { testSupabaseConnection } from '../lib/supabase';

interface DebugPanelProps {
  user: any;
  onRefresh: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ user, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCreateUser = async () => {
    setLoading(true);
    try {
      const testUser = {
        id: Math.floor(Math.random() * 1000000),
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser'
      };
      
      addLog(`Creating test VPN user: ${testUser.first_name} (ID: ${testUser.id})`);
      
      // Import vpnService instead of userService
      const { vpnService } = await import('../services/vpnService');
      const result = await vpnService.getOrCreateUser(testUser);
      addLog(`✅ VPN User created successfully: ${result.referral_code}`);
      onRefresh();
    } catch (error) {
      addLog(`❌ Error creating VPN user: ${error instanceof Error ? error.message : error}`);
      if (error instanceof Error && error.message.includes('Database error:')) {
        addLog(`💡 This might be a database schema issue. Check if migrations are applied.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testStartTrial = async () => {
    if (!user) {
      addLog('❌ No user found to start trial');
      return;
    }

    setLoading(true);
    try {
      addLog(`Starting trial for user: ${user.id}`);
      await userService.startFreeTrial(user.id);
      addLog(`✅ Trial started successfully`);
      onRefresh();
    } catch (error) {
      addLog(`❌ Error starting trial: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetTrialStatus = async () => {
    if (!user) {
      addLog('❌ No user found to check trial');
      return;
    }

    setLoading(true);
    try {
      addLog(`Checking trial status for user: ${user.id}`);
      const status = await userService.getFreeTrialStatus(user.id);
      addLog(`✅ Trial status: ${JSON.stringify(status, null, 2)}`);
    } catch (error) {
      addLog(`❌ Error checking trial: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      addLog('🧪 Testing VPN Function connection...');
      
      // Test VPN Function availability
      addLog('🔌 Testing VPN Function availability...');
      const vpnFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vpn-management`;
      addLog(`🔗 VPN Function URL: ${vpnFunctionUrl}`);
      
      try {
        const vpnResponse = await fetch(vpnFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'get_user_status', telegram_id: 123456789 })
        });
        
        addLog(`🔌 VPN Function status: ${vpnResponse.status} ${vpnResponse.statusText}`);
        
        if (vpnResponse.status === 404) {
          addLog('❌ VPN FUNCTION NOT DEPLOYED');
          addLog('💡 SOLUTION: VPN Function needs to be deployed to Supabase');
          addLog('💡 Go to Supabase Dashboard → Edge Functions → Deploy vpn-management function');
        } else if (vpnResponse.status >= 400) {
          const errorText = await vpnResponse.text();
          addLog(`⚠️ VPN Function error: ${errorText}`);
        } else {
          addLog('✅ VPN Function is available');
          const responseData = await vpnResponse.json();
          addLog(`📊 Response data: ${JSON.stringify(responseData, null, 2)}`);
        }
      } catch (vpnError) {
        addLog(`❌ VPN Function test failed: ${vpnError}`);
        if (vpnError instanceof TypeError && vpnError.message.includes('Failed to fetch')) {
          addLog('💡 This suggests VPN Functions are not available or not deployed');
        }
      }
      
    } catch (error) {
      addLog(`❌ UNEXPECTED ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testDetailedConnection = async () => {
    setLoading(true);
    try {
      addLog('🔍 COMPREHENSIVE NETWORK ANALYSIS...');
      
      // Check environment
      const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
      const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      addLog(`📍 URL Present: ${hasUrl ? '✅' : '❌'}`);
      addLog(`🔑 Key Present: ${hasKey ? '✅' : '❌'}`);
      
      if (!hasUrl || !hasKey) {
        addLog('🚨 CRITICAL: Environment variables missing!');
        addLog('💡 SOLUTION: Click "Connect to Supabase" button in top right');
        return;
      }
      
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      addLog(`📍 URL: ${url.substring(0, 50)}...`);
      addLog(`🔑 Key: ${key.substring(0, 20)}... (${key.length} chars)`);
      
      // Validate URL format
      addLog('🔍 URL VALIDATION...');
      const urlValid = url.startsWith('https://') && url.includes('.supabase.co');
      addLog(`📍 URL Format Valid: ${urlValid ? '✅' : '❌'}`);
      
      if (!urlValid) {
        addLog('❌ URL FORMAT ERROR: URL should be https://yourproject.supabase.co');
        return;
      }
      
      // Extract project ID from URL
      const projectId = url.replace('https://', '').replace('.supabase.co', '');
      addLog(`🆔 Project ID: ${projectId}`);
      
      // Test 1: Basic domain resolution
      addLog('🌐 TEST 1: Basic domain resolution...');
      try {
        const basicResponse = await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        addLog(`🌐 Domain reachable: ✅`);
      } catch (domainError) {
        addLog(`❌ DOMAIN ERROR: ${domainError.message}`);
        addLog('💡 This suggests the Supabase project URL is wrong or project doesn\'t exist');
        addLog('💡 Check your project at: https://supabase.com/dashboard');
        return;
      }
      
      // Test 2: Supabase API endpoint
      addLog('🔌 TEST 2: Supabase API endpoint...');
      try {
        const apiResponse = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD'
        });
        
        addLog(`🔌 API Status: ${apiResponse.status} ${apiResponse.statusText}`);
        
        if (apiResponse.status === 401) {
          addLog('✅ API ENDPOINT: Reachable (401 = needs auth, which is expected)');
        } else if (apiResponse.ok) {
          addLog('✅ API ENDPOINT: Reachable and accessible');
        } else {
          addLog(`⚠️ API ENDPOINT: Unexpected status ${apiResponse.status}`);
        }
      } catch (apiError) {
        addLog(`❌ API ERROR: ${apiError.message}`);
        addLog('💡 API endpoint not reachable - project might be paused or deleted');
        return;
      }
      
      // Test 3: With authentication
      addLog('🔐 TEST 3: Authentication test...');
      try {
        const authResponse = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        
        addLog(`🔐 Auth Status: ${authResponse.status} ${authResponse.statusText}`);
        
        if (authResponse.ok) {
          addLog('✅ AUTHENTICATION: Valid API key');
        } else if (authResponse.status === 401) {
          addLog('❌ AUTHENTICATION: Invalid API key');
          addLog('💡 Check your API key in Supabase Dashboard → Settings → API');
        } else {
          addLog(`⚠️ AUTHENTICATION: Unexpected status ${authResponse.status}`);
        }
      } catch (authError) {
        addLog(`❌ AUTH ERROR: ${authError.message}`);
      }
      
      // Test 4: Database query
      addLog('🗄️ TEST 4: Database query test...');
      try {
        const dbResponse = await fetch(`${url}/rest/v1/users?select=count&limit=1`, {
          method: 'HEAD',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          }
        });
        
        addLog(`🗄️ DB Status: ${dbResponse.status} ${dbResponse.statusText}`);
        
        if (dbResponse.ok) {
          addLog('✅ DATABASE: Tables exist and accessible');
        } else if (dbResponse.status === 404) {
          addLog('❌ DATABASE: Table "users" not found');
          addLog('💡 Run migrations in Supabase Dashboard → SQL Editor');
        } else {
          addLog(`⚠️ DATABASE: Status ${dbResponse.status}`);
        }
      } catch (dbError) {
        addLog(`❌ DB ERROR: ${dbError.message}`);
      }
      
      addLog('🏁 ANALYSIS COMPLETE');
      
    } catch (error) {
      addLog(`❌ ANALYSIS ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkEnvironment = () => {
    addLog('🔍 ENVIRONMENT VARIABLE CHECK...');
    
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    addLog(`📍 VITE_SUPABASE_URL: ${url ? '✅ Set' : '❌ Missing'}`);
    addLog(`🔑 VITE_SUPABASE_ANON_KEY: ${key ? '✅ Set' : '❌ Missing'}`);
    
    if (url) {
      addLog(`📍 URL Preview: ${url.substring(0, 50)}...`);
      addLog(`📍 URL Length: ${url.length} characters`);
      addLog(`📍 Contains supabase.co: ${url.includes('supabase.co') ? '✅' : '❌'}`);
      addLog(`📍 Starts with https: ${url.startsWith('https://') ? '✅' : '❌'}`);
      addLog(`📍 Ends correctly: ${url.endsWith('.supabase.co') ? '✅' : '❌'}`);
    }
    
    if (key) {
      addLog(`🔑 Key Length: ${key.length} characters`);
      addLog(`🔑 Starts with eyJ: ${key.startsWith('eyJ') ? '✅' : '❌'}`);
      addLog(`🔑 Contains dots: ${key.includes('.') ? '✅' : '❌'}`);
    }
    
    // Check .env file existence
    addLog('📁 Environment source: Vite build-time variables');
    addLog('💡 Variables are loaded at build time, not runtime');
  };

  const testRawFetch = async () => {
    setLoading(true);
    try {
      addLog('🌐 RAW FETCH TEST...');
      
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        addLog('❌ No URL to test');
        return;
      }
      
      addLog(`🎯 Testing URL: ${url}`);
      
      // Test 1: Basic connectivity
      addLog('📡 Test 1: Basic connectivity (no auth)...');
      try {
        const basicResponse = await fetch(url, { method: 'HEAD' });
        addLog(`📡 Basic fetch: ${basicResponse.status} ${basicResponse.statusText}`);
      } catch (basicError) {
        addLog(`❌ Basic fetch failed: ${basicError}`);
      }
      
      // Test 2: With API key
      addLog('🔑 Test 2: With API key...');
      try {
        const authResponse = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        addLog(`🔑 Auth fetch: ${authResponse.status} ${authResponse.statusText}`);
      } catch (authError) {
        addLog(`❌ Auth fetch failed: ${authError}`);
      }
      
    } catch (error) {
      addLog(`❌ RAW FETCH ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) {
    return (
      <button
        className="debug-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Debug Panel"
      >
        <Bug size={16} />
      </button>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>🐛 Debug Panel</h3>
        <button onClick={() => setIsOpen(false)}>×</button>
      </div>

      <div className="debug-section">
        <h4>Database Tests</h4>
        <div className="debug-buttons">
          <button 
            className="debug-button"
            onClick={checkEnvironment}
            disabled={loading}
          >
            <Settings size={14} />
            Check Environment
          </button>
          
          <button 
            className="debug-button"
            onClick={testConnection}
            disabled={loading}
          >
            <Wifi size={14} />
            Test Connection
          </button>
          
          <button 
            className="debug-button"
            onClick={testDetailedConnection}
            disabled={loading}
          >
            <Database size={14} />
            Network Analysis
          </button>
          
          <button 
            className="debug-button"
            onClick={testRawFetch}
            disabled={loading}
          >
            <Wifi size={14} />
            Raw Fetch Test
          </button>
          
          <button 
            className="debug-button"
            onClick={testCreateUser}
            disabled={loading}
          >
            <User size={14} />
            Create Test User
          </button>
          
          <button 
            className="debug-button"
            onClick={testStartTrial}
            disabled={loading || !user}
          >
            <Database size={14} />
            Start Trial
          </button>
          
          <button 
            className="debug-button"
            onClick={testGetTrialStatus}
            disabled={loading || !user}
          >
            <Database size={14} />
            Check Trial Status
          </button>
        </div>
      </div>

      <div className="debug-section">
        <div className="debug-logs-header">
          <h4>Logs</h4>
          <button className="clear-logs" onClick={clearLogs}>
            <Trash2 size={12} />
            Clear
          </button>
        </div>
        <div className="debug-logs">
          {logs.length === 0 ? (
            <div className="no-logs">No logs yet. Run some tests!</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {user && (
        <div className="debug-section">
          <h4>Current User Data</h4>
          <pre className="user-data">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}

      <div className="debug-section">
        <h4>Environment Status</h4>
        <div className="env-status">
          <div className="env-item">
            <span>Supabase URL:</span>
            <span className={import.meta.env.VITE_SUPABASE_URL ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_URL ? `✅ ${import.meta.env.VITE_SUPABASE_URL.substring(0, 30)}...` : '❌ Missing'}
            </span>
          </div>
          <div className="env-item">
            <span>Supabase Key:</span>
            <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? `✅ ${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : '❌ Missing'}
            </span>
          </div>
          <div className="env-item">
            <span>URL Format:</span>
            <span className={import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co') ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co') ? '✅ Valid' : '❌ Invalid'}
            </span>
          </div>
          <div className="env-item">
            <span>Key Format:</span>
            <span className={import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? '✅ Valid JWT' : '❌ Invalid'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};