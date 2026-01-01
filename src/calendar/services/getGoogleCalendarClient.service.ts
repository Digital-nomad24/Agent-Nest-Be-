// src/google/services/getGoogleCalendarClient.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google, calendar_v3 } from "googleapis";
import { GoogleCalendarService } from "src/google/services/google-calendar.service";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class GoogleCalendarClientService {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly prisma: PrismaService,
  ) {}

  async getGoogleCalendarClient(
    userId: string,
  ): Promise<calendar_v3.Calendar> {
    try {
      // Get a fresh or valid access token (handles refresh internally)
      const accessToken =
        await this.googleCalendarService.getValidAccessToken(userId);

      // Fetch refresh token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { googleRefreshToken: true },
      });

      if (!user?.googleRefreshToken) {
        throw new Error("Google Calendar not connected. Please reconnect your calendar.");
      }

      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>("GOOGLE_CLIENT_ID"),
        this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
        this.configService.get<string>("redirectUri"), // Changed from GOOGLE_REDIRECT_URI to match your service
      );

      // Set both access and refresh tokens
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: user.googleRefreshToken,
      });

      return google.calendar({ version: "v3", auth: oauth2Client });
    } catch (error) {
      throw new Error(`Failed to initialize Google Calendar client: ${error.message}`);
    }
  }
}