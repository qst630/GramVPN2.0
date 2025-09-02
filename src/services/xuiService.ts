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
}

class XUIService {
  private baseUrl = 'https://connect.gramvpn.shop';

  // Login to 3x-ui panel and get session cookie
  async loginToPanel(server: XUIServer): Promise<string> {
    console.log('🔐 Logging into 3x-ui panel:', server.server_name);
    
    try {
      const response = await fetch(`${server.xui_api_url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: server.xui_username,
          password: server.xui_password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      // Extract session cookie
      const setCookieHeader = response.headers.get('set-cookie');
      if (!setCookieHeader) {
        throw new Error('No session cookie received');
      }

      const sessionCookie = setCookieHeader.split(';')[0];
      console.log('✅ Successfully logged into panel');
      return sessionCookie;

    } catch (error) {
      console.error('❌ Panel login failed:', error);
      throw error;
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

  // Add client to 3x-ui panel
  async addClient(
    server: XUIServer, 
    sessionCookie: string, 
    clientData: {
      telegramId: number;
      subscriptionType: string;
      expiryDays: number;
    }
  ): Promise<XUIClient> {
    console.log('👤 Adding client to panel:', clientData);
    
    try {
      // Generate client configuration
      const clientId = this.generateUUID();
      const clientEmail = `${clientData.subscriptionType}_${clientData.telegramId}`;
      const expiryTime = Date.now() + (clientData.expiryDays * 24 * 60 * 60 * 1000);
      
      const client: XUIClient = {
        id: clientId,
        email: clientEmail,
        limitIp: 2, // Allow 2 simultaneous connections
        totalGB: 0, // Unlimited traffic
        expiryTime: expiryTime,
        enable: true,
        tgId: clientData.telegramId.toString(),
        subId: this.generateSubId(),
      };

      // Get current inbound to update clients
      const inbound = await this.getInbound(server, sessionCookie);
      const settings = JSON.parse(inbound.settings);
      
      // Add new client to existing clients
      if (!settings.clients) {
        settings.clients = [];
      }
      settings.clients.push(client);

      // Update inbound with new client
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
        throw new Error(`Add client failed: ${updateResponse.status}`);
      }

      console.log('✅ Client added successfully');
      return client;

    } catch (error) {
      console.error('❌ Add client failed:', error);
      throw error;
    }
  }

  // Generate VLESS configuration
  generateVLESSConfig(server: XUIServer, client: XUIClient): VLESSConfig {
    return {
      server: server.vless_domain || server.server_ip,
      port: server.vless_port,
      id: client.id,
      path: server.vless_path,
      security: 'tls',
      sni: server.vless_domain,
      fp: 'chrome',
      type: 'ws',
      host: server.vless_domain,
    };
  }

  // Generate VLESS URL
  generateVLESSUrl(config: VLESSConfig, serverName: string): string {
    const params = new URLSearchParams({
      type: config.type,
      security: config.security,
      path: config.path,
      host: config.host,
      sni: config.sni,
      fp: config.fp,
    });

    return `vless://${config.id}@${config.server}:${config.port}?${params.toString()}#${encodeURIComponent(serverName)}`;
  }

  // Generate subscription URL for V2rayTun
  generateSubscriptionUrl(telegramId: number, expireTimestamp: number): string {
    const subscriptionPath = `/subscription/${telegramId}?expire=${expireTimestamp}`;
    const importUrl = `${this.baseUrl}${subscriptionPath}`;
    return `${this.baseUrl}/?key=v2raytun://import/${encodeURIComponent(importUrl)}`;
  }

  // Generate base64 encoded subscription content
  generateSubscriptionContent(vlessUrls: string[]): string {
    const content = vlessUrls.join('\n');
    return btoa(unescape(encodeURIComponent(content)));
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

  // Test server connectivity
  async testServerConnection(server: XUIServer): Promise<boolean> {
    try {
      const sessionCookie = await this.loginToPanel(server);
      return !!sessionCookie;
    } catch (error) {
      console.error(`❌ Server ${server.server_name} is not accessible:`, error);
      return false;
    }
  }
}

export const xuiService = new XUIService();