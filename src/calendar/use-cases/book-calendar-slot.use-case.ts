import {
  Injectable,
  Logger,
  BadRequestException,
  GoneException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'
import { google } from 'googleapis';

import timezone from 'dayjs/plugin/timezone';
import { PrismaService } from 'prisma/prisma.service';
import { GoogleCalendarService } from 'src/google/services/google-calendar.service';
import { BookSlotDto } from '../controllers/dtos/book-slot.input';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class CalendarBookingUseCase {
  private readonly logger = new Logger(CalendarBookingUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly GoogleCalendarService: GoogleCalendarService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Books a time slot through a shared calendar link
   */
  async bookSlot(userId: string, token: string, dto: BookSlotDto) {
    try {
      const { startTime, endTime } = dto;

      // Get visitor information
      const visitor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
        },
      });

      if (!visitor) {
        throw new NotFoundException('Authenticated user not found');
      }

      const visitorName = visitor.name;
      const visitorEmail = visitor.email;

      // Validate and parse times
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);

      if (
        isNaN(parsedStartTime.getTime()) ||
        isNaN(parsedEndTime.getTime())
      ) {
        throw new BadRequestException('Invalid start or end time');
      }

      if (parsedEndTime <= parsedStartTime) {
        throw new BadRequestException('End time must be after start time');
      }

      const shareLink = await this.prisma.calendarShareLink.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!shareLink || new Date() > shareLink.expiresAt || !shareLink.isActive) {
        throw new GoneException('Link expired or inactive');
      }

      const user = shareLink.user;

      if (!user.googleRefreshToken) {
        throw new UnauthorizedException(
          'User not connected to Google Calendar',
        );
      }

      // Validate booking is within available period
      const {
        availableStart,
        availableEnd,
        earliestHour,
        latestHour,
        allowWeekends,
        timezone: linkTimezone,
        slotDuration,
      } = shareLink;

      if (
        parsedStartTime < availableStart ||
        parsedEndTime > availableEnd
      ) {
        throw new BadRequestException(
          'Booking is outside the available period.',
        );
      }

      // Validate booking hours and day
      const start = dayjs(parsedStartTime).tz(linkTimezone);
      const end = dayjs(parsedEndTime).tz(linkTimezone);
      const bookingStartHour = start.hour();
      const bookingEndHour = end.hour();
      const bookingDay = start.day();

      if (
        bookingStartHour < earliestHour ||
        bookingEndHour > latestHour ||
        (!allowWeekends && [0, 6].includes(bookingDay))
      ) {
        throw new BadRequestException(
          'Booking is outside allowed hours or on a weekend.',
        );
      }

      // Validate slot duration
      const actualSlotDuration = Math.floor(
        (parsedEndTime.getTime() - parsedStartTime.getTime()) / (60 * 1000),
      );

      if (actualSlotDuration !== slotDuration) {
        throw new BadRequestException(
          `Booking must be exactly ${slotDuration} minutes long.`,
        );
      }

      // Get Google Calendar client
      const accessToken = await this.GoogleCalendarService.getValidAccessToken(
        user.id,
      );

      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        this.configService.get<string>('GOOGLE_REDIRECT_URI'),
      );

      oauth2Client.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Check availability (FreeBusy)
      const freeBusyRes = await calendar.freebusy.query({
        requestBody: {
          timeMin: parsedStartTime.toISOString(),
          timeMax: parsedEndTime.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busy = freeBusyRes.data.calendars?.primary?.busy || [];

      const isSlotBusy = busy.some(
        (slot) =>
          new Date(slot.start || '') < parsedEndTime &&
          parsedStartTime < new Date(slot.end || ''),
      );

      if (isSlotBusy) {
        throw new ConflictException(
          'Time slot already booked. Please choose another.',
        );
      }

      // Create event in Google Calendar
      const eventRes = await calendar.events.insert({
        calendarId: 'primary',
        sendUpdates: 'all',
        requestBody: {
          summary: 'Appointment',
          description: `Meeting booked by ${visitorName} (${visitorEmail}) via share link.`,
          start: {
            dateTime: parsedStartTime.toISOString(),
            timeZone: linkTimezone,
          },
          end: {
            dateTime: parsedEndTime.toISOString(),
            timeZone: linkTimezone,
          },
          attendees: [
            {
              email: visitorEmail,
              displayName: visitorName,
            },
          ],
        },
      });

      return {
        message: 'Meeting booked successfully!',
        eventId: eventRes.data.id,
        eventLink: eventRes.data.htmlLink,
        calendarResponse: eventRes.data,
      };
    } catch (error) {
      this.logger.error('Booking failed:', error);
      throw error;
    }
  }
}