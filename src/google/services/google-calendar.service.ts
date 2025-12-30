// src/google/services/google-calendar.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class GoogleCalendarService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  getAuthUrl(userId: string): string {
    // CRITICAL: This redirect_uri MUST match what's in Google Cloud Console
    const redirectUri = 'https://agent-nest-be.onrender.com/auth/google/callback';
    
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      redirectUri, // Using variable for consistency
    );

    const state = jwt.sign(
      { userId },
      this.configService.get('JWT_SECRET')!,
      { expiresIn: '10m' }
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
      ],
      state,
    });

    console.log('📋 Generated auth URL with redirect_uri:', redirectUri);
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

    // CRITICAL: This redirect_uri MUST match what was used in getAuthUrl
    const redirectUri = 'https://agent-nest-be.onrender.com/auth/google/callback';
    
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      redirectUri,
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
        googleRefreshToken: tokens.refresh_token,
        accessTokenExpiry: expiryTime,
      },
    });

    console.log('💾 Calendar connected for user:', userId);

    await this.setupCalendarWatch(userId, tokens.access_token!);
  }

  async setupCalendarWatch(userId: string, accessToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      'https://agent-nest-be.onrender.com/auth/google/callback',
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
      // Don't throw error - calendar connection still works without watch
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
      return await this.refreshToken(userId, user.googleRefreshToken);
    }

    return user.googleAccessToken!;
  }

  private async refreshToken(userId: string, refreshToken: string): Promise<string> {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      'https://agent-nest-be.onrender.com/auth/google/callback',
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const expiryTime = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await this.prisma.user.update({
        where: { id:userId },
        data: {
          googleAccessToken: credentials.access_token!,
          googleRefreshToken: credentials.refresh_token || refreshToken,
          accessTokenExpiry: expiryTime,
          calendarConnected: true,
        },
      });

      return credentials.access_token!;
    } catch (error: any) {
      console.error('Token refresh error:', error);

      if (error.response?.status === 400) {
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

      throw new Error('Failed to refresh token');
    }
  }
}