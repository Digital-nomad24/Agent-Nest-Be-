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

  async getAuthUrl(userId: string, forceConsent = false): Promise<string> {    
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

    // Check if user already has a refresh token
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      // Only force consent if explicitly requested or if no refresh token exists
      prompt: forceConsent || !user?.googleRefreshToken ? 'consent' : 'select_account',
      scope: [
        'https://www.googleapis.com/auth/calendar',
      ],      
      state,
    });

    console.log('📋 Generated auth URL with redirect_uri');
    return authUrl;
  }

  async handleCallback(code: string, state: string) {
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
    oauth2Client.setCredentials(tokens);

    const expiryTime = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        calendarConnected: true,
        googleAccessToken: tokens.access_token!,
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

    await this.setupCalendarWatch(userId, tokens.access_token!);
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
      console.error('Failed to set up calendar watch:', error);
    }
  }

  async getConnectionStatus(userId: string) {
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
      return { connected: false, tokenValid: false };
    }

    const isTokenValid = user.accessTokenExpiry 
      ? new Date() < user.accessTokenExpiry 
      : false;

    return {
      connected: user.calendarConnected || false,
      tokenValid: isTokenValid,
      hasRefreshToken: !!user.googleRefreshToken,
    };
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

    if (!user || !user.calendarConnected || !user.googleRefreshToken) {
      throw new Error('User not connected to Google Calendar');
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
          // Remove lock when done
          this.refreshLocks.delete(userId);
        });

      this.refreshLocks.set(userId, refreshPromise);
      return refreshPromise;
    }

    return user.googleAccessToken!;
  }

  private async refreshToken(userId: string, refreshToken: string): Promise<string> {
    console.log('🔄 Refreshing token for user:', userId);
    
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('redirectUri'),
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const expiryTime = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token!,
          // Google rarely sends a new refresh token, so preserve the original
          googleRefreshToken: credentials.refresh_token || refreshToken,
          accessTokenExpiry: expiryTime,
          calendarConnected: true,
        },
      });

      console.log('✅ Token refreshed successfully for user:', userId);
      console.log('🔑 New refresh token received:', !!credentials.refresh_token);
      
      return credentials.access_token!;
    } catch (error: any) {
      console.error('❌ Token refresh error for user:', userId, error.message);

      // If token is invalid or revoked, disconnect the calendar
      if (error.response?.status === 400 || error.response?.status === 401) {
        console.log('🔓 Disconnecting calendar due to invalid token');
        
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            calendarConnected: false,
            googleAccessToken: null,
            googleRefreshToken: null,
            accessTokenExpiry: null,
          },
        });
      }

      throw new Error('Failed to refresh token. User needs to reconnect.');
    }
  }

  async disconnectCalendar(userId: string) {
    try {
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
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      throw error;
    }
  }
}