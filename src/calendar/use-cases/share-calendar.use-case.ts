import {
  Injectable,
  Logger,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { randomBytes } from 'crypto';
import { google } from 'googleapis';
import { PrismaService } from 'prisma/prisma.service';
import { CreateShareLinkDto } from '../controllers/dtos/create-share-link.input';
import { GoogleCalendarService } from 'src/google/services/google-calendar.service';

@Injectable()
export class CalendarShareUseCase {
  private readonly logger = new Logger(CalendarShareUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly GoogleCalendarService: GoogleCalendarService,
    private readonly configService: ConfigService,
  ) {}


  async createShareLink(userId: string, dto: CreateShareLinkDto) {
    try {
      const {
        expiresInDays = 2,
        availableDays = 7,
        slotDuration = 30,
        bufferBetween = 0,
        earliestHour = 9,
        latestHour = 17,
        timezone = 'UTC',
        allowWeekends = false,
        allowBookingEdit = true,
      } = dto;

      const token = randomBytes(32).toString('hex');
      const now = new Date();
      const availableEnd = new Date(
        now.getTime() + availableDays * 24 * 60 * 60 * 1000,
      );
      const expiresAt = new Date(
        now.getTime() + expiresInDays * 24 * 60 * 60 * 1000,
      );

      const shareLink = await this.prisma.calendarShareLink.create({
        data: {
          userId,
          token,
          expiresAt,
          availableStart: now,
          availableEnd,
          slotDuration,
          bufferBetween,
          earliestHour,
          latestHour,
          timezone,
          allowWeekends,
          allowBookingEdit,
          isActive: true,
        },
      });

      const clientUrl = this.configService.get<string>('CLIENT_URL');

      return {
        url: `${clientUrl}/calendar/share/${token}`,
        expiresAt,
        preferences: {
          availableStart: now,
          availableEnd,
          slotDuration,
          bufferBetween,
          earliestHour,
          latestHour,
          timezone,
          allowWeekends,
        },
      };
    } catch (error) {
      this.logger.error('Error creating share link:', error);
      throw error;
    }
  }

  /**
   * Gets free/busy information for a shared calendar link
   */
  async getFreeBusy(token: string) {
    // Validate share link
    const link = await this.prisma.calendarShareLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!link || new Date() > link.expiresAt || !link.isActive) {
      throw new GoneException('Link expired, inactive, or invalid.');
    }

    // Get valid access token
    const accessToken = await this.GoogleCalendarService.getValidAccessToken(
      link.user.id,
    );

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({ access_token: accessToken });

    // Query free/busy information
    const timeMin = link.availableStart;
    const timeMax = link.availableEnd;

    const freeBusyRes = await google
      .calendar({ version: 'v3', auth: oauth2Client })
      .freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

    const busyBlocks = freeBusyRes.data.calendars?.primary?.busy || [];

    return {
      busy: busyBlocks,
      timeMin,
      timeMax,
      preferences: {
        slotDuration: link.slotDuration,
        bufferBetween: link.bufferBetween,
        earliestHour: link.earliestHour,
        latestHour: link.latestHour,
        timezone: link.timezone,
        allowWeekends: link.allowWeekends,
      },
    };
  }
}