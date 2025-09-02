import { User, FreeTrialStatus } from '../types/user';

class UserService {
  private baseUrl = 'https://your-n8n-webhook-url.com'; // Replace with your actual n8n webhook URL

  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseUrl}/get-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: telegramId
        }),
      });

      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async createUser(telegramUser: any): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          free_trial_used: false,
          subscription_active: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async startFreeTrial(telegramId: number): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/start-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: telegramId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start free trial');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error starting free trial:', error);
      throw error;
    }
  }

  async getFreeTrialStatus(telegramId: number): Promise<FreeTrialStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/trial-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: telegramId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch trial status');
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Error fetching trial status:', error);
      // Return default status on error
      return {
        available: true,
        used: false,
        active: false,
      };
    }
  }

  // Development mock methods - remove these when n8n is ready
  private mockUsers: Map<number, User> = new Map();

  async mockGetUserByTelegramId(telegramId: number): Promise<User | null> {
    return this.mockUsers.get(telegramId) || null;
  }

  async mockCreateUser(telegramUser: any): Promise<User> {
    const user: User = {
      id: Date.now(),
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      free_trial_used: false,
      subscription_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockUsers.set(telegramUser.id, user);
    return user;
  }

  async mockStartFreeTrial(telegramId: number): Promise<User> {
    const user = this.mockUsers.get(telegramId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

    const updatedUser: User = {
      ...user,
      free_trial_used: true,
      free_trial_started_at: now.toISOString(),
      free_trial_expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    };

    this.mockUsers.set(telegramId, updatedUser);
    return updatedUser;
  }

  async mockGetFreeTrialStatus(telegramId: number): Promise<FreeTrialStatus> {
    const user = this.mockUsers.get(telegramId);
    
    if (!user) {
      return {
        available: true,
        used: false,
        active: false,
      };
    }

    if (!user.free_trial_used) {
      return {
        available: true,
        used: false,
        active: false,
      };
    }

    if (user.free_trial_expires_at) {
      const now = new Date();
      const expiresAt = new Date(user.free_trial_expires_at);
      const isActive = now < expiresAt;
      const daysRemaining = isActive 
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      return {
        available: false,
        used: true,
        active: isActive,
        expires_at: user.free_trial_expires_at,
        days_remaining: daysRemaining,
      };
    }

    return {
      available: false,
      used: true,
      active: false,
    };
  }
}

export const userService = new UserService();