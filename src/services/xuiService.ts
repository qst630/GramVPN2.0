// 3x-ui Panel Integration Service
interface XUIServer {
  id: number;
  server_name: string;
  server_ip: string;
  country: string;
  xui_api_url: string;
  xui_username: string;
  xui_password: string;
  vless_domain: string;
  vless_port: number;
  vless_path: string;
  inbound_id: string;
  vless_public_key: string;
  active_subscribers: number;
  server_port?: number;
  vless_type?: string;
  vless_security?: string;
  vless_fp?: string;
  vless_sni?: string;
  vless_sid?: string;
  vless_spx?: string;
  vless_flow?: string;
  limitIp?: number;
  alterId?: number;
}

interface XUIClient {
  id: string;
  email: string;
  limitIp: number;
  totalGB: number;
  expiryTime: number;
  enable: boolean;
  tgId: string;
  subId: string;
  alterId?: number;
  flow?: string;
  reset?: number;
}

interface VLESSConfig {
  server: string;
  port: number;
  id: string;
  path: string;
  security: string;
  sni: string;
  fp: string;
  type: string;
  host: string;
  flow?: string;
  pbk?: string;
  sid?: string;
  spx?: string;
}

class XUIService {
  private baseUrl = 'https://vpntest.digital';
  private sessionCache: Map<string, { cookie: string; expiry: number }> = new Map();

  // Login to 3x-ui panel and get session cookie with caching
  async loginToPanel(server: XUIServer): Promise<string> {
    const cacheKey = `${server.server_ip}:${server.xui_username}`;
    const cached = this.sessionCache.get(cacheKey);
    
    // Check if we have a valid cached session (expires in 30 minutes)
    if (cached && cached.expiry > Date.now()) {
      console.log('🔄 Using cached session for:', server.server_name);
      return cached.cookie;
    }

    console.log('🔐 Logging into 3x-ui panel:', server.server_name);
    
    try {
      const response = await fetch(`${server.xui_api_url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: new URLSearchParams({
          username: server.xui_username,
          password: server.xui_password,
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}: ${response.statusText}`);
      }

      // Extract session cookie
      const setCookieHeader = response.headers.get('set-cookie');
      if (!setCookieHeader) {
        throw new Error('No session cookie received from panel');
      }

      const sessionCookie = setCookieHeader.split(';')[0];
      
      // Cache the session for 30 minutes
      this.sessionCache.set(cacheKey, {
        cookie: sessionCookie,
        expiry: Date.now() + (30 * 60 * 1000)
      });
      
      console.log('✅ Successfully logged into panel:', server.server_name);
      return sessionCookie;

    } catch (error) {
      console.error(`❌ Panel login failed for ${server.server_name}:`, error);
      // Clear any cached session on login failure
      this.sessionCache.delete(cacheKey);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to login to panel ${server.server_name}: ${errorMessage}`);
    }
  }

  // Get inbound details from 3x-ui panel
  async getInbound(server: XUIServer, sessionCookie: string): Promise<any> {
    console.log('📡 Getting inbound details for:', server.inbound_id);
    
    try {
      const response = await fetch(`${server.xui_api_url}/panel/api/inbounds/get/${server.inbound_id}`, {
        method: 'GET',
        headers: {
          'Cookie': sessionCookie,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Get inbound failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Inbound details retrieved');
      return data.obj;

    } catch (error) {
      console.error('❌ Get inbound failed:', error);
      throw error;
    }
  }

  // Add client to 3x-ui panel using the proven Python pattern
  async addClient(
    server: XUIServer, 
    sessionCookie: string, 
    clientData: {
      telegramId: number;
      subscriptionType: string;
      expiryDays: number;
    }
  ): Promise<XUIClient> {
    console.log(`👤 Adding client to panel ${server.server_name}:`, clientData);
    
    try {
      // Generate client configuration (following Python create_vless_account pattern)
      const clientId = this.generateUUID();
      const remark = `${clientData.subscriptionType}_${clientData.telegramId}_${Date.now()}`;
      const expiryTime = Date.now() + (clientData.expiryDays * 24 * 60 * 60 * 1000); // milliseconds like Python
      
      const client: XUIClient = {
        id: clientId,
        email: remark, // Use as remark for identification
        limitIp: server.limitIp || 0, // From server config
        totalGB: 0, // Unlimited traffic
        expiryTime: expiryTime,
        enable: true,
        tgId: remark, // Use remark as tgId for identification
        subId: "",
        alterId: server.alterId || 0,
        flow: server.vless_flow || "",
        reset: 0
      };

      // Use the correct X-UI API endpoint like Python code
      const clientSettings = {
        clients: [client]
      };

      const payload = {
        id: parseInt(server.inbound_id),
        settings: JSON.stringify(clientSettings)
      };

      const addClientResponse = await fetch(`${server.xui_api_url}/panel/api/inbounds/addClient`, {
        method: 'POST',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!addClientResponse.ok) {
        const errorText = await addClientResponse.text();
        console.error('Add client response:', addClientResponse.status, errorText);
        throw new Error(`Add client failed with status ${addClientResponse.status}: ${errorText}`);
      }

      const responseData = await addClientResponse.json();
      console.log('✅ Add client response:', responseData);

      console.log(`✅ Client added successfully to ${server.server_name}`);
      return client;

    } catch (error) {
      console.error(`❌ Add client failed for ${server.server_name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to add client to ${server.server_name}: ${errorMessage}`);
    }
  }

  // Generate VLESS configuration
  generateVLESSConfig(server: XUIServer, client: XUIClient): VLESSConfig {
    // Use server configuration from database - more robust mapping
    return {
      server: server.server_ip, // Always use IP for Reality protocol
      port: server.server_port || server.vless_port || 443,
      id: client.id,
      path: server.vless_path || '/',
      security: server.vless_security || 'reality',
      sni: server.vless_sni || 'google.com',
      fp: server.vless_fp || 'chrome',
      type: server.vless_type || 'tcp',
      host: server.vless_sni || server.server_ip,
      flow: server.vless_flow,
      pbk: server.vless_public_key,
      sid: server.vless_sid,
      spx: server.vless_spx || '/'
    };
  }

  // Generate VLESS URL (following Python build_vless_link pattern)
  generateVLESSUrl(config: VLESSConfig, serverName: string): string {
    const host = config.server;
    const port = config.port;
    const clientId = config.id;
    const email = serverName;
    
    // Build VLESS URL exactly like Python build_vless_link function
    const url = `vless://${clientId}@${host}:${port}` +
      `?type=${config.type || 'tcp'}` +
      `&security=${config.security || 'reality'}` +
      `&pbk=${config.pbk || ''}` +
      `&fp=${config.fp || 'chrome'}` +
      `&sni=${config.sni || ''}` +
      `&sid=${config.sid || ''}` +
      `&spx=${encodeURIComponent(config.spx || '/')}` +
      `&flow=${config.flow || ''}` +
      `#${encodeURIComponent(email)}`;
    
    return url;
  }

  // Generate subscription URL for V2rayTun with better encoding
  generateSubscriptionUrl(telegramId: number, expireTimestamp: number): {
    direct: string;
    v2raytun: string;
    qr: string;
  } {
    const subscriptionPath = `/subscription/${telegramId}?expire=${expireTimestamp}&type=v2raytun`;
    const importUrl = `${this.baseUrl}${subscriptionPath}`;
    
    // Generate both direct import and V2rayTun specific URL
    return {
      direct: importUrl,
      v2raytun: `v2raytun://import/${encodeURIComponent(importUrl)}`,
      qr: `${this.baseUrl}/qr/${telegramId}?expire=${expireTimestamp}`
    };
  }

  // Generate base64 encoded subscription content with proper headers
  generateSubscriptionContent(vlessUrls: string[], userAgent = 'V2rayTun'): string {
    // Add subscription headers for better client compatibility
    const headers = [
      `# GramVPN Subscription`,
      `# Generated: ${new Date().toISOString()}`,
      `# User-Agent: ${userAgent}`,
      `# Total Servers: ${vlessUrls.length}`,
      '',
    ];
    
    const content = headers.join('\n') + vlessUrls.join('\n');
    return btoa(unescape(encodeURIComponent(content)));
  }

  // NEW: Create subscription for ALL active servers
  async createMultiServerSubscription(clientData: {
    telegramId: number;
    subscriptionType: string;
    expiryDays: number;
  }, servers: XUIServer[]): Promise<{
    clients: Array<{ server: XUIServer; client: XUIClient; vlessUrl: string }>;
    subscriptionUrls: {
      direct: string;
      v2raytun: string;
      qr: string;
    };
    subscriptionContent: string;
  }> {
    console.log(`🌍 Creating multi-server subscription for ${servers.length} servers`);
    
    const results: Array<{ server: XUIServer; client: XUIClient; vlessUrl: string }> = [];
    const errors: string[] = [];

    // Process each server - using Promise.allSettled for better error handling
    const serverPromises = servers.map(async (server) => {
      try {
        // Test server connectivity first
        const isConnected = await this.testServerConnection(server);
        if (!isConnected) {
          throw new Error(`Server ${server.server_name} is not accessible`);
        }

        const sessionCookie = await this.loginToPanel(server);
        const client = await this.addClient(server, sessionCookie, clientData);
        const vlessConfig = this.generateVLESSConfig(server, client);
        const vlessUrl = this.generateVLESSUrl(vlessConfig, `${server.country}-${server.server_name}`);
        
        return { server, client, vlessUrl };
      } catch (error) {
        console.error(`❌ Failed to setup server ${server.server_name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${server.server_name}: ${errorMessage}`);
        return null;
      }
    });

    const settledResults = await Promise.allSettled(serverPromises);
    
    settledResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });

    if (results.length === 0) {
      throw new Error(`Failed to setup any servers. Errors: ${errors.join(', ')}`);
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Some servers failed: ${errors.join(', ')}`);
    }

    // Generate subscription content
    const vlessUrls = results.map(r => r.vlessUrl);
    const subscriptionContent = this.generateSubscriptionContent(vlessUrls);
    const expireTimestamp = Math.floor((Date.now() + (clientData.expiryDays * 24 * 60 * 60 * 1000)) / 1000);
    const subscriptionUrls = this.generateSubscriptionUrl(clientData.telegramId, expireTimestamp);

    console.log(`✅ Multi-server subscription created: ${results.length}/${servers.length} servers`);
    
    return {
      clients: results,
      subscriptionUrls,
      subscriptionContent
    };
  }

  // NEW: Find existing client by Telegram ID
  private async findExistingClient(server: XUIServer, sessionCookie: string, telegramId: number): Promise<XUIClient | null> {
    try {
      const inbound = await this.getInbound(server, sessionCookie);
      if (!inbound) return null;
      
      const settings = JSON.parse(inbound.settings);
      if (!settings.clients) return null;
      
      const existingClient = settings.clients.find((c: any) => c.tgId === telegramId.toString());
      return existingClient || null;
    } catch (error) {
      console.error(`Failed to find existing client for TG ID ${telegramId}:`, error);
      return null;
    }
  }

  // NEW: Update existing client expiry
  private async updateClientExpiry(server: XUIServer, sessionCookie: string, client: XUIClient, additionalDays: number): Promise<XUIClient> {
    try {
      const newExpiryTime = Math.max(Date.now(), client.expiryTime) + (additionalDays * 24 * 60 * 60 * 1000);
      client.expiryTime = newExpiryTime;
      client.enable = true;
      
      const inbound = await this.getInbound(server, sessionCookie);
      const settings = JSON.parse(inbound.settings);
      
      // Update the specific client
      const clientIndex = settings.clients.findIndex((c: any) => c.id === client.id);
      if (clientIndex >= 0) {
        settings.clients[clientIndex] = client;
      }
      
      // Update inbound
      const updateResponse = await fetch(`${server.xui_api_url}/panel/api/inbounds/update/${server.inbound_id}`, {
        method: 'POST',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          up: inbound.up.toString(),
          down: inbound.down.toString(),
          total: inbound.total.toString(),
          remark: inbound.remark,
          enable: 'true',
          expiryTime: inbound.expiryTime.toString(),
          listen: inbound.listen,
          port: inbound.port.toString(),
          protocol: inbound.protocol,
          settings: JSON.stringify(settings),
          streamSettings: inbound.streamSettings,
          sniffing: inbound.sniffing,
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Update client expiry failed: ${updateResponse.status}`);
      }
      
      console.log(`✅ Client expiry updated for ${client.email}`);
      return client;
    } catch (error) {
      console.error('Failed to update client expiry:', error);
      throw error;
    }
  }

  // Helper functions
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateSubId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Get optimal server (least loaded)
  async getOptimalServer(servers: XUIServer[]): Promise<XUIServer> {
    // Sort by active subscribers (ascending) to get least loaded
    const sortedServers = servers
      .filter(server => server.xui_api_url && server.xui_username)
      .sort((a, b) => a.active_subscribers - b.active_subscribers);

    if (sortedServers.length === 0) {
      throw new Error('No available servers');
    }

    return sortedServers[0];
  }

  // Test server connectivity with timeout
  async testServerConnection(server: XUIServer): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const sessionCookie = await this.loginToPanel(server);
      clearTimeout(timeoutId);
      
      return !!sessionCookie;
    } catch (error) {
      console.error(`❌ Server ${server.server_name} connectivity test failed:`, error);
      return false;
    }
  }

  // NEW: Batch test multiple servers
  async testMultipleServers(servers: XUIServer[]): Promise<XUIServer[]> {
    console.log(`🔍 Testing ${servers.length} servers...`);
    
    const testPromises = servers.map(async (server) => {
      const isAccessible = await this.testServerConnection(server);
      return isAccessible ? server : null;
    });
    
    const results = await Promise.allSettled(testPromises);
    const accessibleServers = results
      .filter((result): result is PromiseFulfilledResult<XUIServer> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    console.log(`✅ ${accessibleServers.length}/${servers.length} servers are accessible`);
    return accessibleServers;
  }
}

export const xuiService = new XUIService();