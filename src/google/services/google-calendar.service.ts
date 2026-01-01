// src/google/services/google-calendar.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class GoogleCalendarService {
  private refreshLocks = new Map<string, Promise<string>>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  getAuthUrl(userId: string, forceConsent = false): string {    
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('redirectUri'), 
    );

    const state = jwt.sign(
      { userId },
      this.configService.get('JWT_SECRET')!,
      { expiresIn: '48h' }
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: forceConsent ? 'consent' : 'select_account',
      scope: [
        'https://www.googleapis.com/auth/calendar',
      ],      
      state,
    });

    console.log('📋 Generated auth URL with redirect_uri');
    return authUrl;
  }

  async handleCallback(code: string, state: string) {
    try {
      // Verify and decode the state JWT
      const decoded = jwt.verify(
        state,
        this.configService.get('JWT_SECRET')!,
      ) as { userId: string };
      const userId = decoded.userId;

      console.log('✅ State verified for user:', userId);
     
      // Fetch existing user data to preserve refresh token
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { googleRefreshToken: true },
      });

      const oauth2Client = new google.auth.OAuth2(
        this.configService.get('GOOGLE_CLIENT_ID'),
        this.configService.get('GOOGLE_CLIENT_SECRET'),
        this.configService.get<string>('redirectUri'),
      );

      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      oauth2Client.setCredentials(tokens);

      const expiryTime = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      // Use transaction to prevent race conditions
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          calendarConnected: true,
          googleAccessToken: tokens.access_token,
          // Preserve existing refresh token if new one not provided
          googleRefreshToken: tokens.refresh_token || existingUser?.googleRefreshToken,
          accessTokenExpiry: expiryTime,
        },
      });

      console.log('💾 Calendar connected for user:', userId);
      console.log('🔑 Refresh token status:', {
        newTokenReceived: !!tokens.refresh_token,
        hasExistingToken: !!existingUser?.googleRefreshToken,
        finalToken: !!(tokens.refresh_token || existingUser?.googleRefreshToken),
      });

      // Setup watch after successful token storage
      await this.setupCalendarWatch(userId, tokens.access_token);
      
      return { success: true, userId };
    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      throw new Error(`Calendar connection failed: ${error.message}`);
    }
  }

  async setupCalendarWatch(userId: string, accessToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('redirectUri'),
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const channelId = uuidv4();
    
    const webhookUrl = this.configService.get('GOOGLE_WEBHOOK_URL') || 
                      'https://agent-nest-be.onrender.com/auth/google/webhook';

    try {
      const watchRes = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: userId,
        },
      });

      const resourceId = watchRes.data.resourceId!;
      const expirationMillis = parseInt(watchRes.data.expiration || '0');
      const expirationTime = new Date(expirationMillis);

      await this.prisma.calendarChannel.create({
        data: {
          userId,
          channelId,
          resourceId,
          expiration: expirationTime,
          token: userId,
        },
      });

      console.log('🔔 Calendar watch created:', { channelId, resourceId });
    } catch (error) {
      console.error('⚠️ Failed to set up calendar watch:', error);
      // Don't throw - calendar watch is not critical for basic functionality
    }
  }

  async getConnectionStatus(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          calendarConnected: true,
          googleAccessToken: true,
          googleRefreshToken: true,
          accessTokenExpiry: true,
        },
      });

      if (!user) {
        return { connected: false, tokenValid: false, hasRefreshToken: false };
      }

      const isTokenValid = user.accessTokenExpiry 
        ? new Date() < user.accessTokenExpiry 
        : false;

      return {
        connected: user.calendarConnected || false,
        tokenValid: isTokenValid,
        hasRefreshToken: !!user.googleRefreshToken,
      };
    } catch (error) {
      console.error('❌ Failed to get connection status:', error);
      return { connected: false, tokenValid: false, hasRefreshToken: false };
    }
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        accessTokenExpiry: true,
        calendarConnected: true,
      },
    });

    if (!user || !user.calendarConnected) {
      throw new Error('User not connected to Google Calendar');
    }

    if (!user.googleRefreshToken) {
      // Clear the connection status since we can't refresh
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          calendarConnected: false,
          googleAccessToken: null,
          accessTokenExpiry: null,
        },
      });
      throw new Error('No refresh token available. Please reconnect your calendar.');
    }

    const now = new Date();
    const expiryBuffer = new Date(now.getTime() + 5 * 60 * 1000);

    const needsRefresh =
      !user.googleAccessToken ||
      !user.accessTokenExpiry ||
      user.accessTokenExpiry <= expiryBuffer;

    if (needsRefresh) {
      // Check if refresh is already in progress for this user
      if (this.refreshLocks.has(userId)) {
        console.log('⏳ Token refresh already in progress for user:', userId);
        return this.refreshLocks.get(userId)!;
      }

      // Create a new refresh promise and store it
      const refreshPromise = this.refreshToken(userId, user.googleRefreshToken)
        .finally(() => {
          // Remove lock when done (success or failure)
          this.refreshLocks.delete(userId);
        });

      this.refreshLocks.set(userId, refreshPromise);
      return refreshPromise;
    }

    return user.googleAccessToken!;
  }

  private async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get('GOOGLE_CLIENT_ID'),
        this.configService.get('GOOGLE_CLIENT_SECRET'),
        this.configService.get('redirectUri'),
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });

      console.log('🔄 Refreshing access token for user:', userId);
      
      // Use refreshAccessToken instead of getAccessToken for clarity
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token returned from refresh');
      }

      // Use expiry_date from response if available, otherwise assume 1 hour
      const expiryTime = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 60 * 60 * 1000);

      // Update database with new tokens
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token,
          // Google may return a new refresh token, use it if provided
          googleRefreshToken: credentials.refresh_token || refreshToken,
          accessTokenExpiry: expiryTime,
          calendarConnected: true,
        },
      });

      console.log('✅ Token refreshed successfully for user:', userId);
      return credentials.access_token;
      
    } catch (error) {
      console.error('❌ Token refresh failed for user:', userId, error);
      
      // Check if it's an authentication error (invalid refresh token)
      const isAuthError = 
        error.message?.includes('invalid_grant') ||
        error.message?.includes('Token has been expired or revoked') ||
        error.code === 401 ||
        error.code === 403;

      if (isAuthError) {
        console.log('🔓 Refresh token invalid, clearing connection for user:', userId);
        
        // Clear invalid tokens from database
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            calendarConnected: false,
            googleAccessToken: null,
            googleRefreshToken: null,
            accessTokenExpiry: null,
          },
        });
        
        throw new Error('Refresh token invalid or expired. Please reconnect your Google Calendar.');
      }

      // For other errors (network issues, etc.), throw generic error
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  async disconnectCalendar(userId: string) {
    try {
      // First, try to stop calendar watch
      try {
        const channels = await this.prisma.calendarChannel.findMany({
          where: { userId },
        });

        for (const channel of channels) {
          try {
            const user = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { googleAccessToken: true },
            });

            if (user?.googleAccessToken) {
              const oauth2Client = new google.auth.OAuth2(
                this.configService.get('GOOGLE_CLIENT_ID'),
                this.configService.get('GOOGLE_CLIENT_SECRET'),
                this.configService.get('redirectUri'),
              );
              oauth2Client.setCredentials({ access_token: user.googleAccessToken });

              const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
              await calendar.channels.stop({
                requestBody: {
                  id: channel.channelId,
                  resourceId: channel.resourceId,
                },
              });
              
              console.log('🔕 Calendar watch stopped:', channel.channelId);
            }
          } catch (error) {
            console.warn('⚠️ Could not stop calendar watch:', error);
          }
        }

        // Delete channel records
        await this.prisma.calendarChannel.deleteMany({
          where: { userId },
        });
      } catch (error) {
        console.warn('⚠️ Error cleaning up calendar channels:', error);
      }

      // Revoke the token with Google
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { googleAccessToken: true },
      });

      if (user?.googleAccessToken) {
        const oauth2Client = new google.auth.OAuth2(
          this.configService.get('GOOGLE_CLIENT_ID'),
          this.configService.get('GOOGLE_CLIENT_SECRET'),
          this.configService.get('redirectUri'),
        );

        try {
          await oauth2Client.revokeToken(user.googleAccessToken);
          console.log('🔓 Token revoked with Google');
        } catch (error) {
          console.warn('⚠️ Could not revoke token with Google:', error);
          // Continue anyway to clean up local data
        }
      }

      // Clean up database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          calendarConnected: false,
          googleAccessToken: null,
          googleRefreshToken: null,
          accessTokenExpiry: null,
        },
      });

      console.log('💾 Calendar disconnected for user:', userId);
      return { success: true, message: 'Calendar disconnected successfully' };
      
    } catch (error) {
      console.error('❌ Failed to disconnect calendar:', error);
      throw new Error(`Failed to disconnect calendar: ${error.message}`);
    }
  }
}