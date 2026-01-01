import {
  Injectable,
  Logger,
  NotFoundException,
  GoneException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import { CreateShareLinkDto } from '../controllers/dtos/create-share-link.input';
import { GoogleCalendarClientService } from '../services/getGoogleCalendarClient.service';

@Injectable()
export class CalendarShareUseCase {
  private readonly logger = new Logger(CalendarShareUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarClientService: GoogleCalendarClientService,
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

      this.logger.log(`Share link created for user ${userId}: ${token}`);

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
      throw new InternalServerErrorException('Failed to create share link');
    }
  }

  /**
   * Gets free/busy information for a shared calendar link
   */
  async getFreeBusy(token: string) {
    try {
      // Validate share link
      const link = await this.prisma.calendarShareLink.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!link) {
        throw new NotFoundException('Share link not found');
      }

      if (new Date() > link.expiresAt || !link.isActive) {
        throw new GoneException('Link expired or inactive');
      }

      // Get calendar client (handles token refresh internally)
      const calendar = await this.googleCalendarClientService.getGoogleCalendarClient(
        link.user.id,
      );

      // Query free/busy information
      const timeMin = link.availableStart;
      const timeMax = link.availableEnd;

      const freeBusyRes = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busyBlocks = freeBusyRes.data.calendars?.primary?.busy || [];

      this.logger.log(`Retrieved free/busy info for token: ${token}`);

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
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof GoneException) {
        throw error;
      }
      this.logger.error('Error getting free/busy info:', error);
      throw new InternalServerErrorException('Failed to retrieve calendar availability');
    }
  }
}